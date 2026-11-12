// tests/test_lifecycles.js
// Automated Integration & Policy Test Harness verifying Financial Lifecycles,
// Fail-Closed Security, Express Routes, Strict Webhook HMAC, and PayPal Rails.

process.env.TCC_WEBHOOK_SECRET = process.env.TCC_WEBHOOK_SECRET || 'whsec_test_suite_secret_2026';

const assert = require('assert');
const crypto = require('crypto');
const http = require('http');
const policyEngine = require('../services/policyEngine');
const paypal = require('../services/paypal');
const aiExtractor = require('../services/aiExtractor');
const { app, ordersRegistry } = require('../server');

async function runTests() {
  console.log('================================================================');
  console.log('   TCC TEST SUITE: FINANCIAL LIFECYCLES, RAILS & ROUTES        ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ✗ FAIL: ${name} -> ${e.message}`);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ✗ FAIL: ${name} -> ${e.message}`);
      failed++;
    }
  }

  // 1. Policy Gate Tests
  console.log('[1/4] DETERMINISTIC POLICY GATE VERIFICATION');
  
  test('B2C Footwear: Open Mesh is recognized as UNKNOWN and triggers gate', () => {
    const slip = 'WH-DEPOT: SKU NK-PEG4-MSH, Upper: Open-Hole Mesh. Equivalent Grade.';
    const evidence = policyEngine.interpretWarehouseSlip(slip, 'CONSUMER_FOOTWEAR');
    const result = policyEngine.evaluateAmendment({
      mandate: { waterproofRequired: true }
    }, evidence, 'CONSUMER_FOOTWEAR');

    assert.strictEqual(evidence.attributes.waterproofing, policyEngine.EvidenceState.UNKNOWN);
    assert.strictEqual(result.verdict, 'MATERIAL_SPEC_BREACH');
    assert.strictEqual(result.requiresConsent, true);
  });

  test('B2B Server RAM: Non-ECC UDIMM detected as ABSENT and breaches data integrity', () => {
    const slip = 'SYS-DIST: SKU MEM-D5-64G-UDIMM, Non-ECC Unbuffered Desktop DDR5 10-pack.';
    const evidence = policyEngine.interpretWarehouseSlip(slip, 'ENTERPRISE_HARDWARE');
    const result = policyEngine.evaluateAmendment({
      mandate: { eccRequired: true }
    }, evidence, 'ENTERPRISE_HARDWARE');

    assert.strictEqual(evidence.attributes.ecc, policyEngine.EvidenceState.ABSENT);
    assert.strictEqual(result.verdict, 'MATERIAL_SPEC_BREACH');
  });

  test('Industrial MRO: Grade 304 detected as ABSENT for marine grade 316', () => {
    const slip = 'IND-FAST: 500x M12x60 Grade 304 Zinc-Coated Industrial Bolts.';
    const evidence = policyEngine.interpretWarehouseSlip(slip, 'INDUSTRIAL_MRO');
    const result = policyEngine.evaluateAmendment({
      mandate: { grade316Required: true }
    }, evidence, 'INDUSTRIAL_MRO');

    assert.strictEqual(evidence.attributes.grade316, policyEngine.EvidenceState.ABSENT);
    assert.strictEqual(result.verdict, 'MATERIAL_SPEC_BREACH');
  });

  test('Clean Fulfillment: 100% compliant slip passes policy without gate hold', () => {
    const slip = 'WH-DEPOT: SKU NK-PEG4-GTX, Upper: Waterproof GORE-TEX Membrane Certified.';
    const evidence = policyEngine.interpretWarehouseSlip(slip, 'CONSUMER_FOOTWEAR');
    const result = policyEngine.evaluateAmendment({
      mandate: { waterproofRequired: true }
    }, evidence, 'CONSUMER_FOOTWEAR');

    assert.strictEqual(result.verdict, 'COMPLIANT_FULFILLMENT');
    assert.strictEqual(result.requiresConsent, false);
  });

  // 2. Fail-Closed Security Tests
  console.log('\n[2/4] FAIL-CLOSED DEFENSIVE GATE VERIFICATION');

  test('Malformed / Corrupt OCR slip triggers UNKNOWN and fails closed (hold frozen)', () => {
    const corruptSlip = '@@@??GARBLED OCR NOISE ### SKU ??? INVALID';
    const evidence = policyEngine.interpretWarehouseSlip(corruptSlip, 'CONSUMER_FOOTWEAR');
    const result = policyEngine.evaluateAmendment({
      mandate: { waterproofRequired: true }
    }, evidence, 'CONSUMER_FOOTWEAR');

    assert.strictEqual(evidence.attributes.waterproofing, policyEngine.EvidenceState.UNKNOWN);
    assert.strictEqual(result.requiresConsent, true, 'Fail closed: consent mandatory');
    assert.strictEqual(result.verdict, 'MATERIAL_SPEC_BREACH');
  });

  test('AI extraction failure never defaults to compliant (merchant payout blocked)', () => {
    const mockAiFailure = {
      attributes: {
        mandatorySpecStatus: 'UNKNOWN'
      }
    };
    const result = policyEngine.evaluateAmendment({
      mandate: { waterproofRequired: true }
    }, mockAiFailure, 'CONSUMER_FOOTWEAR');

    assert.strictEqual(result.requiresConsent, true);
    assert.notStrictEqual(result.verdict, 'COMPLIANT_FULFILLMENT');
  });

  await testAsync('Gemini 3-Step Agentic Reasoning Chain validates physical material invariants', async () => {
    const ai = await aiExtractor.extractWarehouseSlipAttributes(
      'PACKING SLIP #4092: Dispatched Peg4 Rd Ed (Open-Hole Mesh Upper).',
      { product: 'Nike Pegasus Trail 4 GORE-TEX', mandateText: '100% Waterproof Certified', maxPrice: '135.00' }
    );
    assert.strictEqual(ai.success, true);
    assert.ok(ai.attributes.mandatorySpecStatus === 'ABSENT' || ai.attributes.mandatorySpecStatus === 'UNKNOWN', 'Breach detected');
    assert.ok(ai.attributes.materialReasoningChain && ai.attributes.materialReasoningChain.length >= 2, 'Reasoning chain must contain multiple steps');
  });

  // 3. PayPal Rails Verification
  console.log('\n[3/4] PAYPAL REST V2 RAILS VERIFICATION');
  
  await testAsync('PayPal OAuth token generation succeeds against api-m.sandbox.paypal.com', async () => {
    const token = await paypal.getAccessToken();
    assert.ok(token && token.length > 20, 'OAuth token returned from PayPal');
  });

  await testAsync('Live PayPal Authorization status inquiry validates VOIDED state', async () => {
    const verified = await paypal.getAuthorization('7VU467051N1536501');
    assert.strictEqual(verified.success, true);
    assert.strictEqual(verified.authStatus, 'VOIDED');
    assert.strictEqual(verified.amount, '135.00');
  });

  // 4. Express Routes & Webhook Integration Tests (Reviewer Priority #5)
  console.log('\n[4/4] EXPRESS ROUTES & STRICT WEBHOOK INTEGRATION VERIFICATION');

  // Boot ephemeral server on dynamic port
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const secret = process.env.TCC_WEBHOOK_SECRET;

  try {
    await testAsync('Route GET /health returns HTTP 200 with HEALTHY status', async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.status, 'HEALTHY');
      assert.strictEqual(json.service, 'tcc-paypal-gateway');
    });

    await testAsync('Route POST /api/guardrails/pre-purchase flags price ceiling breach', async () => {
      const res = await fetch(`${baseUrl}/api/guardrails/pre-purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartPrice: 150.00, maxPriceBudget: 135.00 })
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.passed, false);
      assert.strictEqual(json.status, 'REJECTED_GUARDRAIL_BREACH');
      assert.ok(json.violations[0].includes('Price ceiling breached'));
    });

    await testAsync('Route POST /api/guardrails/pre-purchase flags unilateral substitution terms', async () => {
      const res = await fetch(`${baseUrl}/api/guardrails/pre-purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartPrice: 135.00,
          maxPriceBudget: 135.00,
          merchantTerms: 'Seller reserves right to substitute with equivalent item at sole discretion.'
        })
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.passed, false);
      assert.ok(json.violations.some(v => v.includes('unilateral substitution clause')));
    });

    await testAsync('Webhook Route: rejects unsigned request with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/webhooks/fulfillment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slipText: 'Sample slip', orderId: '36S14862Y66466816' })
      });
      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.ok(json.error.includes('Missing required X-TCC-Signature'));
    });

    await testAsync('Webhook Route: rejects invalid HMAC signature with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/webhooks/fulfillment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-TCC-Signature': '0000000000000000000000000000000000000000000000000000000000000000'
        },
        body: JSON.stringify({ slipText: 'Sample slip', orderId: '36S14862Y66466816' })
      });
      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.ok(json.error.includes('signature verification failed'));
    });

    await testAsync('Webhook Route: rejects unregistered orderId with HTTP 404', async () => {
      const payload = JSON.stringify({ slipText: 'Sample slip', orderId: 'UNKNOWN_ORDER_999' });
      const validSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      const res = await fetch(`${baseUrl}/api/webhooks/fulfillment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-TCC-Signature': validSig
        },
        body: payload
      });
      assert.strictEqual(res.status, 404);
      const json = await res.json();
      assert.ok(json.error.includes('ORDER_NOT_FOUND'));
    });

    await testAsync('Webhook Route: verifies authentic HMAC, associates registered order, and triggers breach freeze', async () => {
      const payload = JSON.stringify({
        orderId: '36S14862Y66466816',
        slipText: 'PACKING SLIP #4092: Dispatched Nike Pegasus 4 (Open-Hole Mesh Upper).',
        packingSlipId: '#4092'
      });
      const validSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      const res = await fetch(`${baseUrl}/api/webhooks/fulfillment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-TCC-Signature': validSig
        },
        body: payload
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.result.isCompliant, false);
      assert.strictEqual(json.result.actionTaken, 'PAYPAL_HOLD_FROZEN_PENDING_BUYER');
    });

  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('\n================================================================');
  console.log(`   TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED       `);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
