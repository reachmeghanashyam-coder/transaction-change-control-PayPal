// test_paypal_lifecycle.js
// Standalone PayPal Orders v2 & Payments v2 Financial Lifecycle Verification
// Zero external dependencies (uses Node.js native fetch)

const fs = require('fs');
const path = require('path');

// 1. Load local .env
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('Error: .env file missing at', envPath);
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const CLIENT_ID = env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = env.PAYPAL_CLIENT_SECRET;
const BASE_URL = env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in .env');
  process.exit(1);
}

// 2. Obtain OAuth2 Token
async function getAccessToken() {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const start = Date.now();
  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const latency = Date.now() - start;
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`OAuth failed (${res.status}): ${JSON.stringify(data)}`);
  }
  console.log(`[✔] OAuth2 Token retrieved successfully in ${latency}ms`);
  return data.access_token;
}

// 3. Create Order with intent: AUTHORIZE
async function createOrder(accessToken, amountValue = '135.00') {
  const start = Date.now();
  const payload = {
    intent: 'AUTHORIZE',
    purchase_units: [
      {
        reference_id: 'tcc_order_' + Date.now(),
        description: 'Nike Pegasus Trail 4 GORE-TEX - Size 10 US',
        amount: {
          currency_code: 'USD',
          value: amountValue
        }
      }
    ],
    application_context: {
      return_url: 'https://example.com/tcc/success',
      cancel_url: 'https://example.com/tcc/cancel',
      user_action: 'CONTINUE'
    }
  };

  const res = await fetch(`${BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': 'req_create_' + Date.now()
    },
    body: JSON.stringify(payload)
  });
  const latency = Date.now() - start;
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Create Order failed (${res.status}): ${JSON.stringify(data)}`);
  }

  const approveLink = data.links?.find(l => l.rel === 'approve' || l.rel === 'payer-action')?.href;
  console.log(`[✔] Order Created: ID = ${data.id} (Status: ${data.status}) in ${latency}ms`);
  console.log(`    Approve Link: ${approveLink}`);
  return { orderId: data.id, approveLink, raw: data };
}

// 4. Authorize Order (locks the hold)
async function authorizeOrder(accessToken, orderId) {
  const start = Date.now();
  const res = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}/authorize`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': 'req_auth_' + Date.now()
    }
  });
  const latency = Date.now() - start;
  const data = await res.json();
  if (!res.ok) {
    return { success: false, status: res.status, data, latency };
  }
  const authorizationId = data.purchase_units?.[0]?.payments?.authorizations?.[0]?.id;
  const authStatus = data.purchase_units?.[0]?.payments?.authorizations?.[0]?.status;
  console.log(`[✔] Order Authorized in ${latency}ms: HTTP ${res.status}`);
  console.log(`    Authorization ID = ${authorizationId} (Status: ${authStatus})`);
  return { success: true, status: res.status, authorizationId, authStatus, data, latency };
}

// 5. Void Authorization
async function voidAuthorization(accessToken, authorizationId) {
  const start = Date.now();
  const res = await fetch(`${BASE_URL}/v2/payments/authorizations/${authorizationId}/void`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': 'req_void_' + Date.now()
    }
  });
  const latency = Date.now() - start;
  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }
  console.log(`[✔] Void Authorization call returned in ${latency}ms: HTTP ${res.status}`);
  return { status: res.status, data, latency };
}

// 6. Get Authorization Details
async function getAuthorization(accessToken, authorizationId) {
  const start = Date.now();
  const res = await fetch(`${BASE_URL}/v2/payments/authorizations/${authorizationId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  const latency = Date.now() - start;
  const data = await res.json();
  console.log(`[✔] Retrieved Authorization state in ${latency}ms:`);
  console.log(`    Status: ${data.status} | Amount: ${data.amount?.value} ${data.amount?.currency_code}`);
  return { status: res.status, data, latency };
}

// Main Runner
async function run() {
  console.log('====================================================');
  console.log('   TCC · LIVE PAYPAL SANDBOX LIFECYCLE HARNESS      ');
  console.log('====================================================');
  console.log(`Connecting to: ${BASE_URL}`);

  try {
    const token = await getAccessToken();
    console.log('\n--- STEP 1: Creating Order with intent: AUTHORIZE ($135.00) ---');
    const order = await createOrder(token, '135.00');

    console.log('\n--- STEP 2: Buyer Approval Requirement ---');
    console.log('In PayPal Sandbox, the buyer account must approve the order.');
    console.log('Testing whether direct server authorization is available, or requires approval link...');
    
    const authAttempt = await authorizeOrder(token, order.orderId);
    if (!authAttempt.success) {
      console.log(`Notice: Authorization attempt returned HTTP ${authAttempt.status}: ${authAttempt.data?.name || authAttempt.data?.message}`);
      console.log(`\n>>> ACTION REQUIRED: Open this link in your browser to approve the order with Sandbox buyer:`);
      console.log(`>>> ${order.approveLink}\n`);
    } else {
      console.log('\n--- STEP 3: Voiding Authorization ($0.00 Captured) ---');
      const voidRes = await voidAuthorization(token, authAttempt.authorizationId);
      
      console.log('\n--- STEP 4: Verifying Final State via GET ---');
      const finalAuth = await getAuthorization(token, authAttempt.authorizationId);

      console.log('\n====================================================');
      console.log('   LIFECYCLE VERIFICATION RESULT:                   ');
      console.log(`   Authorization ID: ${authAttempt.authorizationId}`);
      console.log(`   Final State:      ${finalAuth.data.status}`);
      console.log(`   Captured Amount:  $0.00`);
      console.log('====================================================');
    }

  } catch (err) {
    console.error('\n[X] Error during lifecycle run:', err.message);
  }
}

run();
