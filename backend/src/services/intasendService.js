// intasendService.js
// M-Pesa STK Push via IntaSend's Collection API, verified against
// https://github.com/IntaSend/documentation/blob/master/online-payments/collection-api.md
//
// Defaults to MOCK MODE (no real API calls, no real charges) until you
// set INTASEND_MOCK_MODE=false — same safety pattern as the SMS service.
// MOCK_MODE is a global kill switch: even if a school has configured real
// keys, nothing live happens until this is turned off.
//
// Supports per-school credentials (each school can use their own IntaSend
// account so payments go straight to them). Pass `credentials` as
// { publishableKey, secretKey, testMode } — falls back to the shared
// platform env vars (INTASEND_PUBLISHABLE_KEY / INTASEND_SECRET_KEY /
// INTASEND_TEST_MODE) for schools that haven't configured their own yet.

const { v4: uuid } = require('uuid');
const { normalizePhone } = require('./notificationService');

const MOCK_MODE = process.env.INTASEND_MOCK_MODE !== 'false';

function resolveCredentials(credentials) {
  const publishableKey = credentials?.publishableKey || process.env.INTASEND_PUBLISHABLE_KEY;
  const secretKey = credentials?.secretKey || process.env.INTASEND_SECRET_KEY;
  const testMode = credentials?.testMode !== undefined
    ? !!credentials.testMode
    : process.env.INTASEND_TEST_MODE !== 'false'; // sandbox by default, safest
  const baseUrl = testMode ? 'https://sandbox.intasend.com/api' : 'https://payment.intasend.com/api';
  return { publishableKey, secretKey, testMode, baseUrl };
}

function toIntasendPhone(phone) {
  // IntaSend wants 2547XXXXXXXX (no leading +). normalizePhone() gives us
  // +2547XXXXXXXX, so just strip the plus.
  const normalized = normalizePhone(phone);
  return normalized ? normalized.replace('+', '') : null;
}

// Initiates an M-Pesa STK Push. Returns { invoiceId, state } on success.
// Throws on failure (caller is responsible for marking the payment failed).
// `credentials` (optional): { publishableKey, secretKey, testMode } — a
// specific school's own IntaSend account. Omit to use the shared platform keys.
async function initiateStkPush({ amount, phone, apiRef, name, email, credentials }) {
  if (MOCK_MODE) {
    const mockInvoiceId = `MOCK-${uuid().slice(0, 8).toUpperCase()}`;
    console.log(`[MOCK INTASEND] STK Push: KES ${amount} to ${phone} | ref: ${apiRef} | invoice: ${mockInvoiceId}`);
    return { invoiceId: mockInvoiceId, state: 'PENDING' };
  }

  const { publishableKey, secretKey, baseUrl } = resolveCredentials(credentials);
  if (!publishableKey || !secretKey) {
    throw new Error('IntaSend is not configured for this school (and no platform default keys are set)');
  }

  const phoneNumber = toIntasendPhone(phone);
  if (!phoneNumber) throw new Error(`Invalid phone format: ${phone}`);

  const res = await fetch(`${baseUrl}/v1/payment/collection/`, {
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

// Checks the current status of a previously-initiated payment. Pass the
// SAME credentials used to initiate it (a school's payment only exists in
// that school's own IntaSend account).
async function checkPaymentStatus(invoiceId, credentials) {
  if (MOCK_MODE) {
    console.log(`[MOCK INTASEND] Status check for ${invoiceId} — reporting COMPLETE`);
    return { state: 'COMPLETE', invoiceId };
  }

  const { publishableKey, secretKey, baseUrl } = resolveCredentials(credentials);
  const res = await fetch(`${baseUrl}/v1/payment/status/`, {
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
