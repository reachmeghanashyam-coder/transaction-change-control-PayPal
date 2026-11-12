// scripts/test_live_server.js
const http = require('http');
const crypto = require('crypto');

process.env.TCC_WEBHOOK_SECRET = 'whsec_prod_verification_2026';
process.env.PORT = '3005';

const { app } = require('../server');

async function main() {
  const server = app.listen(3005, '127.0.0.1');
  console.log('[1/4] Server booted successfully on port 3005');

  const baseUrl = 'http://127.0.0.1:3005';

  // 1. Health check
  const hRes = await fetch(`${baseUrl}/health`);
  const hJson = await hRes.json();
  console.log(`[2/4] GET /health -> Status: ${hRes.status} (${hJson.status})`);
  if (hRes.status !== 200 || hJson.status !== 'HEALTHY') process.exit(1);

  // 2. Webhook missing signature
  const w1Res = await fetch(`${baseUrl}/api/webhooks/fulfillment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slipText: 'Test' })
  });
  const w1Json = await w1Res.json();
  console.log(`[3/4] POST /api/webhooks/fulfillment (No Signature) -> Status: ${w1Res.status} (${w1Json.error})`);
  if (w1Res.status !== 401) process.exit(1);

  // 3. Webhook with valid signature and registered order
  const payload = JSON.stringify({
    orderId: '36S14862Y66466816',
    slipText: 'PACKING SLIP #4092: Dispatched Nike Pegasus 4 (Open-Hole Mesh Upper).'
  });
  const sig = crypto.createHmac('sha256', process.env.TCC_WEBHOOK_SECRET).update(payload).digest('hex');

  const w2Res = await fetch(`${baseUrl}/api/webhooks/fulfillment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-TCC-Signature': sig
    },
    body: payload
  });
  const w2Json = await w2Res.json();
  console.log(`[4/4] POST /api/webhooks/fulfillment (Signed + Registered Order) -> Status: ${w2Res.status} (Compliant: ${w2Json.result?.isCompliant}, Action: ${w2Json.result?.actionTaken})`);
  if (w2Res.status !== 200) process.exit(1);

  server.close(() => {
    console.log('\n[✔] ALL LIVE SERVER ENDPOINT CHECKS VERIFIED SUCCESSFULLY.');
    process.exit(0);
  });
}

main().catch(err => {
  console.error('Fatal live server test error:', err);
  process.exit(1);
});
