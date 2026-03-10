import { Injectable, Logger } from '@nestjs/common';

/**
 * Safaricom Daraja M-Pesa API service.
 * Docs: https://developer.safaricom.co.ke/
 *
 * Features:
 *  - In-memory token cache (55-minute effective lifetime, auto-refresh)
 *  - Automatic retry once on 5xx gateway errors
 *  - Token invalidation + retry on Daraja error 400.003.01
 *  - Normalised return types for STK Push and STK Query
 */
@Injectable()
export class MpesaService {
  private readonly logger = new Logger(MpesaService.name);

  private readonly consumerKey = process.env.MPESA_CONSUMER_KEY!;
  private readonly consumerSecret = process.env.MPESA_CONSUMER_SECRET!;
  private readonly shortcode = process.env.MPESA_SHORTCODE!;
  private readonly passkey = process.env.MPESA_PASSKEY!;
  /** Base URL of this API server — e.g. https://api.yourhospital.com */
  private readonly callbackBaseUrl = process.env.MPESA_CALLBACK_URL!;
  private readonly environment = process.env.MPESA_ENVIRONMENT ?? 'sandbox';

  private get baseUrl(): string {
    return this.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  // ─── Token cache ──────────────────────────────────────────────────────────
  // Daraja tokens are valid for 3600 s. We cache for 3300 s (55 min) to avoid
  // hitting the OAuth endpoint on every request while staying safely within the
  // expiry window.
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  private invalidateToken(): void {
    this.cachedToken = null;
    this.tokenExpiresAt = 0;
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && now < this.tokenExpiresAt - 60_000) {
      return this.cachedToken;
    }

    const credentials = Buffer.from(
      `${this.consumerKey}:${this.consumerSecret}`,
    ).toString('base64');

    const res = await fetch(
      `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${credentials}` } },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`M-Pesa auth failed: ${text}`);
    }

    const data = (await res.json()) as { access_token: string; expires_in?: number };
    this.cachedToken = data.access_token;
    this.tokenExpiresAt = now + (Number(data.expires_in ?? 3600) - 300) * 1000;
    return this.cachedToken!;
  }

  // ─── Error parsing ────────────────────────────────────────────────────────
  private parseDarajaError(data: Record<string, unknown>): string {
    const code = String(data.errorCode ?? data.requestId ?? '');
    const msg = String(
      data.errorMessage ?? data.ResponseDescription ?? data.ResultDesc ?? '',
    );

    if (code.includes('404.001.04'))
      return 'M-Pesa: Invalid authentication header. Check Consumer Key/Secret.';
    if (code.includes('400.002.05'))
      return 'M-Pesa: Invalid request payload. One or more fields are malformed.';
    if (code.includes('400.003.01'))
      return 'M-Pesa: Access token is invalid or expired.';

    return msg || `M-Pesa error [${code}]`;
  }

  // ─── Generic POST with retry logic ───────────────────────────────────────
  private async darajaPost(
    url: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const doRequest = async (): Promise<Response> => {
      const token = await this.getAccessToken();
      return fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    };

    const parseResponse = async (
      res: Response,
    ): Promise<Record<string, unknown>> => {
      const text = await res.text();
      try {
        return JSON.parse(text) as Record<string, unknown>;
      } catch {
        // Safaricom sandbox occasionally returns plain-text gateway errors
        throw new Error(
          `Safaricom returned non-JSON response (HTTP ${res.status}): ${text.slice(0, 200)}`,
        );
      }
    };

    let res = await doRequest();

    // Retry once on transient 5xx errors (503 sandbox down, 502, 504)
    if (res.status >= 500) {
      this.logger.warn(
        `[M-Pesa] HTTP ${res.status} from Safaricom — waiting 2 s and retrying once`,
      );
      await new Promise((r) => setTimeout(r, 2000));
      res = await doRequest();
    }

    let data = await parseResponse(res);

    // 400.003.01 — token rejected; clear cache and retry once with a fresh token
    const errCode = String(data.errorCode ?? '');
    if (!res.ok && errCode.includes('400.003.01')) {
      this.logger.warn(
        '[M-Pesa] Access token rejected (400.003.01) — refreshing and retrying once',
      );
      this.invalidateToken();
      res = await doRequest();
      data = await parseResponse(res);
    }

    return data;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  /** Normalise phone: 07XXXXXXXX | +254... | 7XXXXXXXX → 2547XXXXXXXX */
  formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) return `254${cleaned.slice(1)}`;
    if (cleaned.startsWith('254')) return cleaned;
    if (cleaned.startsWith('7') || cleaned.startsWith('1'))
      return `254${cleaned}`;
    return cleaned;
  }

  /** YYYYMMDDHHmmss */
  private getTimestamp(): string {
    return new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
  }

  /** Base64( shortcode + passkey + timestamp ) */
  private getPassword(timestamp: string): string {
    return Buffer.from(
      `${this.shortcode}${this.passkey}${timestamp}`,
    ).toString('base64');
  }

  // ─── STK Push (Lipa na M-Pesa) ───────────────────────────────────────────
  async initiateSTKPush(
    phoneNumber: string,
    amount: number,
    accountReference: string,
    description = 'Hospital Payment',
  ): Promise<{
    success: boolean;
    checkoutRequestId?: string;
    merchantRequestId?: string;
    error?: string;
  }> {
    try {
      const timestamp = this.getTimestamp();
      const password = this.getPassword(timestamp);
      const formattedPhone = this.formatPhone(phoneNumber);

      const data = await this.darajaPost(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        {
          BusinessShortCode: this.shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: Math.ceil(amount), // M-Pesa requires whole numbers
          PartyA: formattedPhone,
          PartyB: this.shortcode,
          PhoneNumber: formattedPhone,
          // Full webhook URL — Safaricom POSTs here when transaction completes
          CallBackURL: `${this.callbackBaseUrl}/api/payments/mpesa/callback`,
          // Daraja enforces max 12 chars
          AccountReference: accountReference.slice(0, 12),
          // Daraja enforces max 13 chars
          TransactionDesc: description.slice(0, 13),
        },
      );

      if (data.ResponseCode === '0') {
        return {
          success: true,
          checkoutRequestId: data.CheckoutRequestID as string,
          merchantRequestId: data.MerchantRequestID as string,
        };
      }

      return { success: false, error: this.parseDarajaError(data) };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown M-Pesa error',
      };
    }
  }

  // ─── STK Push Query ───────────────────────────────────────────────────────
  /**
   * status values:
   *  "paid"      — ResultCode 0, payment successful
   *  "pending"   — transaction not yet final (user hasn't entered PIN, or
   *                "still under processing", or Daraja query error)
   *  "cancelled" — user explicitly cancelled (ResultCode 1032)
   *  "failed"    — terminal failure: insufficient funds, wrong PIN limit, etc.
   */
  async querySTKStatus(checkoutRequestId: string): Promise<{
    status: 'paid' | 'pending' | 'cancelled' | 'failed';
    resultCode?: string;
    resultDesc?: string;
    error?: string;
  }> {
    try {
      const timestamp = this.getTimestamp();
      const password = this.getPassword(timestamp);

      const data = await this.darajaPost(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        {
          BusinessShortCode: this.shortcode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestId,
        },
      );

      // Non-0 ResponseCode means Daraja couldn't process the query at all.
      if (data.ResponseCode !== '0' && data.ResponseCode !== 0) {
        return { status: 'pending', error: this.parseDarajaError(data) };
      }

      const resultCode = String(data.ResultCode ?? '');
      const resultDesc = String(data.ResultDesc ?? '');

      if (resultCode === '0') return { status: 'paid', resultCode, resultDesc };
      if (resultCode === '1032')
        return { status: 'cancelled', resultCode, resultDesc };
      // Customer entered PIN, M-Pesa still processing — keep polling
      if (resultDesc.toLowerCase().includes('still under processing'))
        return { status: 'pending', resultCode, resultDesc };

      // Any other non-zero code is a terminal failure
      return { status: 'failed', resultCode, resultDesc };
    } catch (err) {
      // Unknown error — don't block the flow, allow caller to retry
      return {
        status: 'pending',
        error: err instanceof Error ? err.message : 'Query failed',
      };
    }
  }
}
