// services/paypal.js
// Production PayPal REST v2 Integration
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return process.env;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  const env = { ...process.env };
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
  return env;
}

const env = loadEnv();
const CLIENT_ID = env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = env.PAYPAL_CLIENT_SECRET;
const BASE_URL = env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`OAuth failed: ${JSON.stringify(data)}`);
  }
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in * 1000);
  return cachedToken;
}

async function createOrder({ amount = '135.00', description = 'Nike Pegasus Trail 4 GORE-TEX' }) {
  const token = await getAccessToken();
  const start = Date.now();
  const res = await fetch(`${BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': 'req_ord_' + Date.now()
    },
    body: JSON.stringify({
      intent: 'AUTHORIZE',
      purchase_units: [
        {
          reference_id: 'tcc_' + Date.now(),
          description: description,
          amount: {
            currency_code: 'USD',
            value: amount
          }
        }
      ],
      application_context: {
        return_url: 'https://example.com/tcc/success',
        cancel_url: 'https://example.com/tcc/cancel',
        user_action: 'CONTINUE'
      }
    })
  });
  const latency = Date.now() - start;
  const data = await res.json();
  const approveLink = data.links?.find(l => l.rel === 'approve' || l.rel === 'payer-action')?.href;
  return {
    success: res.ok,
    status: res.status,
    orderId: data.id,
    orderStatus: data.status,
    approveLink,
    latency,
    raw: data
  };
}

async function authorizeOrder(orderId) {
  const token = await getAccessToken();
  const start = Date.now();
  const res = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}/authorize`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': 'req_auth_' + Date.now()
    }
  });
  const latency = Date.now() - start;
  const data = await res.json();
  const authorization = data.purchase_units?.[0]?.payments?.authorizations?.[0];
  return {
    success: res.ok,
    status: res.status,
    authorizationId: authorization?.id,
    authStatus: authorization?.status,
    amount: authorization?.amount,
    latency,
    raw: data
  };
}

async function voidAuthorization(authorizationId) {
  const token = await getAccessToken();
  const start = Date.now();
  const res = await fetch(`${BASE_URL}/v2/payments/authorizations/${authorizationId}/void`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': 'req_void_' + Date.now()
    }
  });
  const latency = Date.now() - start;
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch (e) { data = text; }
  return {
    success: res.status === 200 || res.status === 204,
    status: res.status,
    latency,
    raw: data
  };
}

async function captureAuthorization(authorizationId, amount = '110.00', finalCapture = true) {
  const token = await getAccessToken();
  const start = Date.now();
  const res = await fetch(`${BASE_URL}/v2/payments/authorizations/${authorizationId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': 'req_cap_' + Date.now()
    },
    body: JSON.stringify({
      amount: {
        currency_code: 'USD',
        value: amount
      },
      final_capture: finalCapture
    })
  });
  const latency = Date.now() - start;
  const data = await res.json();
  return {
    success: res.ok,
    status: res.status,
    captureId: data.id,
    captureStatus: data.status,
    amountCaptured: data.amount?.value,
    latency,
    raw: data
  };
}

async function getAuthorization(authorizationId) {
  const token = await getAccessToken();
  const start = Date.now();
  const res = await fetch(`${BASE_URL}/v2/payments/authorizations/${authorizationId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  const latency = Date.now() - start;
  const data = await res.json();
  return {
    success: res.ok,
    status: res.status,
    authStatus: data.status,
    amount: data.amount?.value,
    currency: data.amount?.currency_code,
    latency,
    raw: data
  };
}

module.exports = {
  getAccessToken,
  createOrder,
  authorizeOrder,
  voidAuthorization,
  captureAuthorization,
  getAuthorization
};
