// intasendService.js
// M-Pesa STK Push via IntaSend's Collection API, verified against
// https://github.com/IntaSend/documentation/blob/master/online-payments/collection-api.md
//
// Defaults to MOCK MODE (no real API calls, no real charges) until you
// set INTASEND_MOCK_MODE=false and provide real keys — same safety
// pattern as the SMS service.
//
// Required env vars for live mode:
//   INTASEND_PUBLISHABLE_KEY   (starts with ISPubKey_)
//   INTASEND_SECRET_KEY        (starts with ISSecretKey_)
//   INTASEND_TEST_MODE         'true' while using IntaSend's sandbox, 'false' once live with real keys
//   INTASEND_MOCK_MODE         set to 'false' to make real HTTP calls at all (defaults to mocked)

const { v4: uuid } = require('uuid');
const { normalizePhone } = require('./notificationService');

const MOCK_MODE = process.env.INTASEND_MOCK_MODE !== 'false';
const TEST_MODE = process.env.INTASEND_TEST_MODE !== 'false'; // sandbox by default, safest
const BASE_URL = TEST_MODE ? 'https://sandbox.intasend.com/api' : 'https://payment.intasend.com/api';

function toIntasendPhone(phone) {
  // IntaSend wants 2547XXXXXXXX (no leading +). normalizePhone() gives us
  // +2547XXXXXXXX, so just strip the plus.
  const normalized = normalizePhone(phone);
  return normalized ? normalized.replace('+', '') : null;
}

// Initiates an M-Pesa STK Push. Returns { invoiceId, state } on success.
// Throws on failure (caller is responsible for marking the payment failed).
async function initiateStkPush({ amount, phone, apiRef, name, email }) {
  if (MOCK_MODE) {
    const mockInvoiceId = `MOCK-${uuid().slice(0, 8).toUpperCase()}`;
    console.log(`[MOCK INTASEND] STK Push: KES ${amount} to ${phone} | ref: ${apiRef} | invoice: ${mockInvoiceId}`);
    return { invoiceId: mockInvoiceId, state: 'PENDING' };
  }

  const publishableKey = process.env.INTASEND_PUBLISHABLE_KEY;
  const secretKey = process.env.INTASEND_SECRET_KEY;
  if (!publishableKey || !secretKey) {
    throw new Error('INTASEND_PUBLISHABLE_KEY / INTASEND_SECRET_KEY not configured');
  }

  const phoneNumber = toIntasendPhone(phone);
  if (!phoneNumber) throw new Error(`Invalid phone format: ${phone}`);

  const res = await fetch(`${BASE_URL}/v1/payment/collection/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secretKey}`,
    },
    body: JSON.stringify({
      public_key: publishableKey,
      currency: 'KES',
      method: 'M-PESA',
      amount,
      api_ref: apiRef,
      name: name || 'Parent',
      phone_number: phoneNumber,
      email: email || undefined,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.invoice) {
    throw new Error(data?.detail || data?.error || `IntaSend STK push failed (HTTP ${res.status})`);
  }

  return { invoiceId: data.invoice.invoice_id, state: data.invoice.state };
}

// Checks the current status of a previously-initiated payment.
async function checkPaymentStatus(invoiceId) {
  if (MOCK_MODE) {
    console.log(`[MOCK INTASEND] Status check for ${invoiceId} — reporting COMPLETE`);
    return { state: 'COMPLETE', invoiceId };
  }

  const publishableKey = process.env.INTASEND_PUBLISHABLE_KEY;
  const secretKey = process.env.INTASEND_SECRET_KEY;
  const res = await fetch(`${BASE_URL}/v1/payment/status/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secretKey}`,
    },
    body: JSON.stringify({ public_key: publishableKey, invoice_id: invoiceId }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.invoice) {
    throw new Error(data?.detail || data?.error || `IntaSend status check failed (HTTP ${res.status})`);
  }
  return { state: data.invoice.state, invoiceId: data.invoice.invoice_id, raw: data };
}

module.exports = { initiateStkPush, checkPaymentStatus, MOCK_MODE };
