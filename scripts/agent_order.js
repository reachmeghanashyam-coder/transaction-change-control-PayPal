// scripts/agent_order.js
// Lean 5-line Autonomous Shopping Agent Dispatch for 6-second video opening

const paypal = require('../services/paypal');

async function main() {
  console.log('\n[AGENT DISPATCH] Autonomous Shopping Agent Initiated');
  console.log('   Target:  Nike Pegasus Trail 4 (Size 10 US, 100% GORE-TEX)');
  console.log('   Budget:  $135.00 USD Max (Zero Unilateral Substitution Allowed)');
  console.log('   Rails:   PayPal Orders v2 (intent: AUTHORIZE)');

  const order = await paypal.createOrder({
    amount: '135.00',
    description: 'TCC Protected: Nike Pegasus Trail 4 GORE-TEX (Size 10 US)'
  });

  console.log(`   Order:   ${order.orderId} -> Authorization Hold Pending ($135.00)`);
  console.log(`   Status:  HOLD_PENDING_FULFILLMENT ($0.00 Captured)\n`);
}

main();
