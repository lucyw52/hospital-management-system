/**
 * Quick M-Pesa credential test script.
 * Run with: node scripts/test-mpesa.mjs
 *
 * Tests:
 * 1. Authorization — can we get an access token?
 * 2. STK Push     — does a sandbox push succeed?
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env manually (no dotenv dependency needed)
const envFile = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
const env = Object.fromEntries(
  envFile
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const [k, ...v] = l.split("=");
      return [k.trim(), v.join("=").trim().replace(/^"|"$/g, "")];
    })
);

const {
  MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET,
  MPESA_SHORTCODE,
  MPESA_PASSKEY,
  MPESA_CALLBACK_URL,
} = env;

const BASE_URL = "https://sandbox.safaricom.co.ke";

console.log("\n🔑 STEP 1 — Authorization\n");
console.log("  Consumer Key   :", MPESA_CONSUMER_KEY?.slice(0, 8) + "...");
console.log("  Consumer Secret:", MPESA_CONSUMER_SECRET?.slice(0, 8) + "...");
console.log("  Shortcode      :", MPESA_SHORTCODE);
console.log("  Callback URL   :", MPESA_CALLBACK_URL);

const credentials = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");

let token;
try {
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Non-JSON: ${text.slice(0, 200)}`); }

  if (!res.ok || !data.access_token) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
  token = data.access_token;
  console.log("\n  ✅ Token received:", token.slice(0, 20) + "...");
} catch (err) {
  console.error("\n  ❌ Auth FAILED:", err.message);
  console.error("  → Check MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET in .env");
  process.exit(1);
}

console.log("\n📱 STEP 2 — STK Push (sandbox test)\n");

const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString("base64");
const callbackUrl = `${MPESA_CALLBACK_URL}/api/mpesa/callback`;

const body = {
  BusinessShortCode: MPESA_SHORTCODE,
  Password: password,
  Timestamp: timestamp,
  TransactionType: "CustomerPayBillOnline",
  Amount: 1,
  PartyA: "254708374149",
  PartyB: MPESA_SHORTCODE,
  PhoneNumber: "254708374149",
  CallBackURL: callbackUrl,
  AccountReference: "TEST-001",
  TransactionDesc: "Test Booking",
};

console.log("  Timestamp     :", timestamp);
console.log("  Callback URL  :", callbackUrl);
console.log("  Request body  :", JSON.stringify(body, null, 4));

try {
  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Non-JSON (HTTP ${res.status}): ${text.slice(0, 300)}`); }

  console.log("\n  Response:", JSON.stringify(data, null, 4));

  if (data.ResponseCode === "0") {
    console.log("\n  ✅ STK Push SUCCESS!");
    console.log("  CheckoutRequestID:", data.CheckoutRequestID);
    console.log("\n  → Safaricom sandbox is UP and your credentials work.");
  } else {
    console.error("\n  ❌ STK Push FAILED:", data.ResponseDescription || data.errorMessage);
  }
} catch (err) {
  console.error("\n  ❌ STK Push FAILED:", err.message);
  if (err.message.includes("503") || err.message.includes("timeout")) {
    console.error("  → Safaricom sandbox is DOWN. Try again in a few minutes.");
  }
}
