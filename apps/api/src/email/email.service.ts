import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail = process.env.EMAIL_FROM || 'hospital@example.com';

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY not configured. Email notifications will be logged only.');
    }
  }

  async sendQueueNotification(patientEmail: string, patientName: string, queueNumber: number, stage: string) {
    const subject = '🏥 You have been added to the queue';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .queue-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .queue-number { font-size: 48px; font-weight: bold; color: #667eea; text-align: center; margin: 20px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏥 Hospital Queue Notification</h1>
            </div>
            <div class="content">
              <p>Dear <strong>${patientName}</strong>,</p>
              <p>You have been successfully added to the queue.</p>
              
              <div class="queue-info">
                <h3>Queue Details:</h3>
                <div class="queue-number">#${queueNumber}</div>
                <p><strong>Stage:</strong> ${stage}</p>
                <p><strong>Status:</strong> Waiting</p>
              </div>

              <p>Please wait for your turn. You will be notified when it's time for your ${stage.toLowerCase()} appointment.</p>
              
              <p><strong>What to expect:</strong></p>
              <ul>
                <li>You will be called by queue number</li>
                <li>Please stay in the waiting area</li>
                <li>Average wait time: 15-30 minutes</li>
              </ul>

              <p>Thank you for your patience!</p>
            </div>
            <div class="footer">
              <p>This is an automated message from the Hospital Management System.</p>
              <p>Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(patientEmail, subject, html);
  }

  async sendDischargeNotification(
    patientEmail: string,
    patientName: string,
    admissionDate: string,
    dischargeDate: string,
    totalCharges: number,
  ) {
    const subject = '✅ Discharge Summary - Hospital Management System';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .info-label { font-weight: bold; color: #6b7280; }
            .info-value { color: #111827; }
            .total { font-size: 24px; font-weight: bold; color: #10b981; text-align: right; margin-top: 20px; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Discharge Summary</h1>
            </div>
            <div class="content">
              <p>Dear <strong>${patientName}</strong>,</p>
              <p>You have been successfully discharged from the hospital. We hope you have a speedy recovery!</p>
              
              <div class="info-box">
                <h3>Discharge Summary:</h3>
                <div class="info-row">
                  <span class="info-label">Patient Name:</span>
                  <span class="info-value">${patientName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Admission Date:</span>
                  <span class="info-value">${new Date(admissionDate).toLocaleDateString()}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Discharge Date:</span>
                  <span class="info-value">${new Date(dischargeDate).toLocaleDateString()}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Total Charges:</span>
                  <span class="info-value">KES ${totalCharges.toLocaleString()}</span>
                </div>
              </div>

              <p><strong>Post-Discharge Care Instructions:</strong></p>
              <ul>
                <li>Take all prescribed medications as directed</li>
                <li>Attend all follow-up appointments</li>
                <li>Rest and avoid strenuous activities</li>
                <li>Contact us immediately if you experience any complications</li>
              </ul>

              <p><strong>Follow-up:</strong></p>
              <p>Please schedule a follow-up appointment within 7 days of discharge.</p>

              <p>Thank you for choosing our hospital. We wish you good health!</p>
            </div>
            <div class="footer">
              <p>This is an automated message from the Hospital Management System.</p>
              <p>For any questions, please contact us at: +254 700 000 000</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(patientEmail, subject, html);
  }

  private async sendEmail(to: string, subject: string, html: string) {
    try {
      if (!this.resend) {
        this.logger.log(`[EMAIL] To: ${to}, Subject: ${subject}`);
        this.logger.debug(`Email content: ${html.substring(0, 100)}...`);
        return { success: true, message: 'Email logged (RESEND_API_KEY not configured)' };
      }

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });

      this.logger.log(`Email sent successfully to ${to}: ${result.data?.id}`);
      return { success: true, id: result.data?.id };
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      return { success: false, error: error.message };
    }
  }
}
