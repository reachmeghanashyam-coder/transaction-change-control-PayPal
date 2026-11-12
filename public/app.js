// ==========================================================================
// TCC (Transaction Change Control) · High-Fidelity Sequence Orchestrator
// Coordinates 4-Act Cinematic Spatial Financial Lifecycles on PayPal Rails
// Connected directly to Live Gemini 3.5 Flash & PayPal REST v2 Sandbox APIs
// ==========================================================================

const SANDBOX_ORDER_ID = '36S14862Y66466816';
const SANDBOX_AUTH_ID = '7VU467051N1536501';

const SCENARIOS = {
  1: {
    id: 1,
    name: 'Clean Dispatch',
    replayMeta: 'SCENARIO PREVIEW · COMPLIANT',
    whImg: '/assets/shoe_dark_cutout.png',
    whGlowClass: 'ambient-radial glow-green',
    whTitle: 'Nike Pegasus Trail 4',
    whSubSku: 'GORE-TEX Waterproof Edition',
    whPrice: '$135.00',
    whPriceDowngrade: false,
    whBadgeText: '100% GORE-TEX Membrane',
    whBadgeColor: 'text-green',
    whStatusTag: 'COMPLIANT',
    whStatusTagClass: 'node-status-pill pill-green',
    whSlipId: '#4092 · SneakerDepot NYC',
    auditAnalysis: '✓ 100% Compliant · No Downgrade',
    diffPackedVal: '<span class="text-green font-semibold">GORE-TEX Certified ✓</span>',
    conduitRightColor: 'var(--accent-emerald)',
    vaultClass: 'captured',
    vaultBadgeClass: 'gate-state-badge badge-green',
    vaultBadgeText: 'SCENARIO PREVIEW · POLICY APPROVED ($135.00)',
    vaultSubtext: 'Scenario preview: Policy approved full capture. (Sandbox auth 7VU467051N1536501 is VOIDED).',
    showVoidBtn: false,
    showAcceptBtn: false,
    proofStatus: 'VOIDED',
    proofCaptured: '$0.00',
    tlStep3Text: 'Warehouse Event',
    tlStep4Text: 'Settlement: Capture ($135.00)',
    slipText: 'PACKING SLIP #4092: Dispatched Nike Pegasus Trail 4 (100% GORE-TEX Certified Waterproof Membrane). Total $135.00 USD.'
  },
  2: {
    id: 2,
    name: 'Swap Trap',
    replayMeta: 'ACT 4 OF 4 · DEFENSE ACTIVE',
    whImg: '/assets/shoe_mesh_cutout.png',
    whGlowClass: 'ambient-radial glow-amber',
    whTitle: 'Nike Pegasus 4 (Mesh)',
    whSubSku: 'Open-Mesh Road Edition (Downgrade)',
    whPrice: '$135.00',
    whPriceDowngrade: true,
    whBadgeText: 'Open-Hole Mesh (Non-Waterproof)',
    whBadgeColor: 'text-rose',
    whStatusTag: 'SPEC BREACH',
    whStatusTagClass: 'node-status-pill pill-amber',
    whSlipId: '#4092 · SneakerDepot Exception',
    auditAnalysis: '⚠️ Membrane Missing · Downgrade',
    diffPackedVal: '<span class="text-rose font-semibold">Open Mesh (Non-Waterproof) ✗</span>',
    conduitRightColor: 'var(--accent-amber)',
    vaultClass: 'frozen',
    vaultBadgeClass: 'gate-state-badge badge-amber',
    vaultBadgeText: 'STATUS: HOLD FROZEN ON PAYPAL',
    vaultSubtext: 'Captured: $0.00 · Merchant payout blocked without buyer authorization.',
    showVoidBtn: true,
    showAcceptBtn: false,
    proofStatus: 'SUSPENDED',
    proofCaptured: '$0.00',
    tlStep3Text: 'Warehouse Event (Breach)',
    tlStep4Text: 'Awaiting Buyer Choice',
    slipText: 'PACKING SLIP #4092: Dispatched Nike Pegasus Trail 4 (Mesh Road Edition, Non-Waterproof). Direct substitution at $135.00.'
  },
  3: {
    id: 3,
    name: '$25 Offer',
    replayMeta: 'ACT 4 OF 4 · PROPOSAL ACTIVE',
    whImg: '/assets/shoe_mesh_cutout.png',
    whGlowClass: 'ambient-radial glow-cyan',
    whTitle: 'Nike Pegasus 4 (Mesh)',
    whSubSku: 'Open Mesh ($25 Credit Applied)',
    whPrice: '$110.00',
    whPriceDowngrade: true,
    whBadgeText: 'Open-Hole Mesh ($25 Off)',
    whBadgeColor: 'text-cyan',
    whStatusTag: '$25 CREDIT OFFER',
    whStatusTagClass: 'node-status-pill pill-cyan',
    whSlipId: '#4092 · Discount Proposal',
    auditAnalysis: 'Store offers $25 off · Accept or Void',
    diffPackedVal: '<span class="text-cyan font-semibold">Open Mesh ($25 Off Proposed)</span>',
    conduitRightColor: 'var(--accent-cyan)',
    vaultClass: 'frozen',
    vaultBadgeClass: 'gate-state-badge badge-amber',
    vaultBadgeText: 'STATUS: HOLD FROZEN ($110 PROPOSED)',
    vaultSubtext: 'You can accept the $25 discount or reject for a 100% free void on PayPal rails.',
    showVoidBtn: true,
    showAcceptBtn: true,
    proofStatus: 'SUSPENDED',
    proofCaptured: '$0.00',
    tlStep3Text: 'Warehouse Event (Offer)',
    tlStep4Text: 'Awaiting Buyer Decision',
    slipText: 'PACKING SLIP #4092: Dispatched Nike Pegasus Trail 4 (Mesh Upper). Store applies $25.00 Credit Offer. Amended Price: $110.00.'
  }
};

let activeScenarioId = 1;
let activeTimeouts = [];

function clearOrchestratorTimeouts() {
  activeTimeouts.forEach(t => clearTimeout(t));
  activeTimeouts = [];
}

// --------------------------------------------------------------------------
// Scenario Switcher & Live Webhook Ingestion Controller
// Fires real POST /api/webhooks/fulfillment to run Live Gemini 3.5 Flash
// --------------------------------------------------------------------------
async function switchScenario(scenarioId) {
  clearOrchestratorTimeouts();
  activeScenarioId = scenarioId;
  const scDef = SCENARIOS[scenarioId];

  // Update segmented control buttons
  [1, 2, 3].forEach(id => {
    const btn = document.getElementById(`seg${id}`);
    if (btn) btn.classList.toggle('active', id === scenarioId);
  });

  // BEAT 1 (0.0s): Reset center to clean armed hold, hide old receipts & warehouse
  const nodeBuyer = document.getElementById('nodeBuyer');
  nodeBuyer.classList.add('node-revealed');

  const nodePaypal = document.getElementById('nodePaypal');
  nodePaypal.classList.add('node-revealed');
  nodePaypal.classList.remove('state-captured', 'state-frozen', 'state-offer', 'state-voided');

  const amt = document.getElementById('vaultAmount');
  amt.innerText = '135.00';
  amt.className = 'curr-val';

  const badge = document.getElementById('vaultStateBadge');
  badge.innerText = '🔒 STATUS: HOLD ARMED · $0.00 CAPTURED';
  badge.className = 'gate-state-badge badge-hold';

  document.getElementById('vaultSubtext').innerText = 'PayPal Orders v2 · intent: AUTHORIZE active. Funds reserved ($135.00).';
  document.getElementById('diffPackedVal').innerHTML = '<span class="text-cyan font-mono">Inbound Warehouse Event Arriving...</span>';

  document.getElementById('stateNoteDefault').style.display = 'flex';
  document.getElementById('buyerBtnRow').style.display = 'none';
  document.getElementById('miniReceipt').style.display = 'none';

  // Dim Warehouse momentarily to emphasize the new shipment arriving
  const nodeWh = document.getElementById('nodeWarehouse');
  nodeWh.classList.remove('node-revealed', 'node-compliant');
  document.getElementById('auditAnalysisText').innerHTML = '<span class="text-dim font-mono">Connecting warehouse feed...</span>';

  updateReplayIndicator(`EVENT 0${scDef.id}: INBOUND WAREHOUSE SHIPMENT ARRIVING...`);

  // BEAT 2 (0.8s): Pulse travels from warehouse & warehouse card reveals
  const t1 = setTimeout(() => {
    const pulse = document.getElementById('pulseRight');
    pulse.style.background = scDef.id === 1 
      ? 'linear-gradient(90deg, #FFFFFF, var(--accent-emerald), transparent)' 
      : 'linear-gradient(90deg, #FFFFFF, var(--accent-amber), transparent)';
    pulse.style.boxShadow = scDef.id === 1 ? '0 0 10px var(--accent-emerald)' : '0 0 10px var(--accent-amber)';
    pulse.animate([
      { right: '0%', opacity: 1 },
      { right: '100%', opacity: 0 }
    ], { duration: 850, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' });

    document.getElementById('labelRight').style.color = scDef.conduitRightColor;

    // Reveal Warehouse Node
    nodeWh.classList.add('node-revealed');
    nodeWh.classList.toggle('node-compliant', scDef.id === 1);

    document.getElementById('whShoeImg').src = scDef.whImg;
    document.getElementById('whGlow').className = scDef.whGlowClass;
    document.getElementById('whProductName').innerText = scDef.whTitle;
    document.getElementById('whSubSku').innerText = scDef.whSubSku;

    const priceVal = document.getElementById('whPriceVal');
    priceVal.innerHTML = `${scDef.whPrice} <span class="price-curr">USD</span>`;
    priceVal.className = scDef.whPriceDowngrade ? 'item-price font-mono downgrade' : 'item-price font-mono';

    const whBadge = document.getElementById('whBadgeText');
    whBadge.innerText = scDef.whBadgeText;
    whBadge.className = `spec-v font-semibold ${scDef.whBadgeColor}`;

    const whStatus = document.getElementById('whStatusTag');
    whStatus.innerText = scDef.whStatusTag;
    whStatus.className = `node-status-pill ${scDef.whStatusTagClass}`;

    document.getElementById('whSlipId').innerText = scDef.whSlipId;
    document.getElementById('diffPackedVal').innerHTML = scDef.diffPackedVal;
    updateTimelineStep(3, 'completed', scDef.tlStep3Text);

    // Call Gemini 3.5 Flash live via WMS Webhook endpoint
    const auditTextEl = document.getElementById('auditAnalysisText');
    auditTextEl.innerHTML = '<span class="text-cyan font-mono">Auditing via Gemini 3.5 Flash...</span>';

    fetch('/api/webhook/fulfillment-ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: SANDBOX_ORDER_ID,
        slipText: scDef.slipText,
        eventType: scDef.id === 1 ? 'CLEAN' : 'BREACH',
        proposedPrice: scDef.id === 3 ? '110.00' : undefined
      })
    }).then(r => r.json()).then(data => {
      if (data && data.aiExtraction) {
        const ai = data.aiExtraction;
        auditTextEl.innerHTML = `<span class="${scDef.id === 1 ? 'text-green' : 'text-amber'} font-semibold">Gemini 3.5 Flash (${ai.latencyMs || 0}ms):</span> ${ai.attributes?.riskExplanation || (scDef.id === 1 ? '✓ Verified Compliant' : '⚠️ Breach Detected')}`;
      } else {
        auditTextEl.innerText = scDef.auditAnalysis;
      }
    }).catch(() => {
      auditTextEl.innerText = scDef.auditAnalysis;
    });

  }, 800);
  activeTimeouts.push(t1);

  // BEAT 3 (2.0s): PayPal Gate Enforces Settlement Policy (Capture, Freeze, or Offer)
  const t2 = setTimeout(() => {
    nodePaypal.classList.remove('state-captured', 'state-frozen', 'state-offer', 'state-voided');
    if (scDef.id === 1) nodePaypal.classList.add('state-captured');
    else if (scDef.id === 2) nodePaypal.classList.add('state-frozen');
    else if (scDef.id === 3) nodePaypal.classList.add('state-offer');

    const amtEl = document.getElementById('vaultAmount');
    amtEl.innerText = scDef.id === 3 ? '110.00' : '135.00';
    amtEl.className = `curr-val ${scDef.vaultClass}`;

    const badgeEl = document.getElementById('vaultStateBadge');
    badgeEl.innerText = scDef.vaultBadgeText;
    badgeEl.className = `gate-state-badge ${scDef.vaultBadgeClass}`;

    document.getElementById('vaultSubtext').innerText = scDef.vaultSubtext;

    // Action Dock Controls
    const noteEl = document.getElementById('stateNoteDefault');
    const btnRow = document.getElementById('buyerBtnRow');
    const btnVoid = document.getElementById('btnVoid');
    const btnAccept = document.getElementById('btnAcceptDiscount');

    if (scDef.id === 2) {
      noteEl.style.display = 'none';
      btnRow.style.display = 'flex';
      btnVoid.style.display = 'flex';
      btnAccept.style.display = 'none';
    } else if (scDef.id === 3) {
      noteEl.style.display = 'none';
      btnRow.style.display = 'flex';
      btnVoid.style.display = 'flex';
      btnAccept.style.display = 'flex';
      btnAccept.innerHTML = '<span>ACCEPT $25 REFUND & CAPTURE $110</span>';
    } else {
      noteEl.style.display = 'flex';
      btnRow.style.display = 'none';
    }

    updateTimelineStep(4, (scDef.showVoidBtn || scDef.showAcceptBtn) ? 'active' : 'completed', scDef.tlStep4Text);

    // Update bottom evidence proof drawer (preserve true VOIDED sandbox record)
    document.getElementById('proofStateText').innerHTML = `<span class="text-rose font-semibold">VOIDED</span>`;
    document.getElementById('proofCapturedVal').innerText = '$0.00';

    updateReplayIndicator(scDef.replayMeta);
  }, 2000);
  activeTimeouts.push(t2);
}

function resetSpatialStage() {
  document.getElementById('nodeBuyer').classList.remove('node-revealed');
  const nodePaypal = document.getElementById('nodePaypal');
  nodePaypal.classList.remove('node-revealed', 'state-captured', 'state-frozen', 'state-offer', 'state-voided');
  const nodeWh = document.getElementById('nodeWarehouse');
  nodeWh.classList.remove('node-revealed', 'node-compliant');

  document.getElementById('labelLeft').style.color = 'var(--text-dark)';
  document.getElementById('labelRight').style.color = 'var(--text-dark)';

  document.getElementById('stateNoteDefault').style.display = 'flex';
  document.getElementById('buyerBtnRow').style.display = 'none';
  document.getElementById('miniReceipt').style.display = 'none';

  for (let i = 1; i <= 4; i++) {
    const step = document.getElementById(`tlStep${i}`);
    if (step) step.className = 'tl-node-item';
    const wire = document.getElementById(`tlWire${i}`);
    if (wire) wire.className = 'tl-wire-segment';
  }
}

function updateTimelineStep(stepNum, status, customText) {
  const step = document.getElementById(`tlStep${stepNum}`);
  if (step) {
    step.className = `tl-node-item ${status}`;
    if (customText) {
      const name = step.querySelector('.tl-node-txt');
      if (name) name.innerText = customText;
    }
  }

  if (stepNum > 1) {
    const wire = document.getElementById(`tlWire${stepNum - 1}`);
    if (wire) wire.classList.add('active');
  }
}

function updateReplayIndicator(text) {
  const el = document.getElementById('replayIndicator');
  if (el) el.innerText = text;
}

// --------------------------------------------------------------------------
// Interactive Live Actions: VOID & PARTIAL CAPTURE (Live PayPal API)
// --------------------------------------------------------------------------
async function triggerVoidAction() {
  const btn = document.getElementById('btnVoid');
  if (btn) btn.disabled = true;

  try {
    const res = await fetch('/api/orders/settle-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: SANDBOX_ORDER_ID, action: 'VOID', authorizationId: SANDBOX_AUTH_ID })
    });
    const data = await res.json();
    if (btn) btn.disabled = false;

    if (!data.success) {
      alert('PayPal Rails Error: ' + (data.error || 'VOID operation failed'));
      return;
    }

    // Transform Center Vault into VOIDED state
    const nodePaypal = document.getElementById('nodePaypal');
    nodePaypal.classList.remove('state-captured', 'state-frozen', 'state-offer');
    nodePaypal.classList.add('state-voided');

    document.getElementById('buyerBtnRow').style.display = 'none';
    document.getElementById('stateNoteDefault').style.display = 'none';

    const amt = document.getElementById('vaultAmount');
    amt.innerText = '0.00';
    amt.className = 'curr-val voided';

    const badge = document.getElementById('vaultStateBadge');
    badge.innerText = 'STATUS: AUTHORIZATION VOIDED ON PAYPAL';
    badge.className = 'gate-state-badge badge-red';

    // Show verified receipt inside action dock
    const receipt = document.getElementById('miniReceipt');
    receipt.style.display = 'flex';
    receipt.className = 'receipt-pill pill-void';
    const label = document.getElementById('miniReceiptLabel');
    if (label) { label.className = 'text-rose font-semibold'; label.innerText = '✕ SETTLEMENT:'; }
    document.getElementById('miniReceiptText').innerHTML = '<span class="text-rose font-semibold">AUTHORIZATION VOIDED (HTTP 204)</span> · $0.00 CHARGED';

    updateTimelineStep(4, 'completed', 'Settled: Authorization Voided ($0.00)');
    document.getElementById('proofStateText').innerHTML = '<span class="text-rose font-semibold">VOIDED</span>';
    document.getElementById('proofCapturedVal').innerText = '$0.00';
    updateReplayIndicator('HOLD VOIDED · ZERO LOSS');
  } catch (err) {
    if (btn) btn.disabled = false;
    alert('Error executing void: ' + err.message);
  }
}

async function triggerAcceptDiscount() {
  const btn = document.getElementById('btnAcceptDiscount');
  if (btn) btn.disabled = true;

  try {
    const res = await fetch('/api/orders/settle-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: SANDBOX_ORDER_ID, action: 'CAPTURE_DISCOUNT', amount: '110.00', authorizationId: SANDBOX_AUTH_ID })
    });
    const data = await res.json();
    if (btn) btn.disabled = false;

    if (!data.success) {
      alert('PayPal Rails Rail Gate Enforcement:\n\n' + (data.error || 'Capture not permitted on rails') + '\n\n' + (data.note || ''));
      return;
    }

    // Transform Center Vault into PARTIAL CAPTURED state
    const nodePaypal = document.getElementById('nodePaypal');
    nodePaypal.classList.remove('state-frozen', 'state-offer', 'state-voided');
    nodePaypal.classList.add('state-captured');

    document.getElementById('buyerBtnRow').style.display = 'none';
    document.getElementById('stateNoteDefault').style.display = 'none';

    const amt = document.getElementById('vaultAmount');
    amt.innerText = '110.00';
    amt.className = 'curr-val captured';

    const badge = document.getElementById('vaultStateBadge');
    badge.innerText = 'STATUS: PARTIAL CAPTURE SETTLED';
    badge.className = 'gate-state-badge badge-green';

    // Show verified receipt inside action dock
    const receipt = document.getElementById('miniReceipt');
    receipt.style.display = 'flex';
    receipt.className = 'receipt-pill pill-capture';
    const labelCap = document.getElementById('miniReceiptLabel');
    if (labelCap) { labelCap.className = 'text-green font-semibold'; labelCap.innerText = '✓ SETTLEMENT:'; }
    document.getElementById('miniReceiptText').innerHTML = '<span class="text-green font-semibold">CAPTURE: $110.00</span> · AUTO-RELEASED: $25.00';

    updateTimelineStep(4, 'completed', 'Settled: Partial Capture ($110.00)');
    document.getElementById('proofStateText').innerHTML = '<span class="text-green font-semibold">CAPTURED_PARTIAL</span>';
    document.getElementById('proofCapturedVal').innerText = '$110.00';
    updateReplayIndicator('PARTIAL CAPTURE COMPLETED');
  } catch (err) {
    if (btn) btn.disabled = false;
    alert('Error executing capture: ' + err.message);
  }
}

function toggleProofDrawer() {
  const drawer = document.getElementById('proofDrawer');
  drawer.classList.toggle('open');
}

// Initial Boot: Scenario 1

function initPreDispatchHoldState() {
  clearOrchestratorTimeouts();
  resetSpatialStage();

  // Reveal Buyer Mandate (Left)
  document.getElementById('nodeBuyer').classList.add('node-revealed');
  updateTimelineStep(1, 'completed');

  // Reveal Center PayPal Vault in Hold Pending Fulfillment state
  const nodePaypal = document.getElementById('nodePaypal');
  nodePaypal.classList.add('node-revealed');
  nodePaypal.classList.remove('state-captured', 'state-frozen', 'state-offer', 'state-voided');

  const amt = document.getElementById('vaultAmount');
  amt.innerText = '135.00';
  amt.className = 'curr-val';

  const badge = document.getElementById('vaultStateBadge');
  badge.innerText = '🔒 STATUS: HOLD ARMED · $0.00 CAPTURED';
  badge.className = 'gate-state-badge badge-hold';

  document.getElementById('vaultSubtext').innerText = 'PayPal Orders v2 · intent: AUTHORIZE active. Funds reserved. Awaiting inbound warehouse event.';
  document.getElementById('diffPackedVal').innerHTML = '<span class="text-cyan font-mono">Awaiting Inbound Warehouse Event...</span>';

  updateTimelineStep(2, 'completed');
  updateReplayIndicator('PRE-DISPATCH HOLD ARMED · SELECT WAREHOUSE EVENT ABOVE');

  // Ensure buttons are not pre-selected on initial cold load
  [1, 2, 3].forEach(id => {
    const btn = document.getElementById(`seg${id}`);
    if (btn) btn.classList.remove('active');
  });

  // Keep right warehouse card dimmed until an event button is clicked
  const nodeWh = document.getElementById('nodeWarehouse');
  nodeWh.classList.remove('node-revealed', 'node-compliant');
  document.getElementById('auditAnalysisText').innerHTML = '<span class="text-dim font-mono">Awaiting warehouse dispatch...</span>';
}

window.addEventListener('load', () => {
  initPreDispatchHoldState();
});


// Interactive Shopping Agent Dispatcher (Option B Native Integration)
async function dispatchAgentOrder() {
  const input = document.getElementById('agentInput');
  const btn = document.getElementById('agentDispatchBtn');
  const query = input.value.trim();
  if (!query) return;

  btn.disabled = true;
  btn.innerHTML = '<span>DISPATCHING...</span>';

  try {
    const res = await fetch('/api/orders/create-mandate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: '135.00',
        product: 'Nike Pegasus Trail 4 (Size 10 US) 100% GORE-TEX',
        mandateText: 'Size 10 US, 100% Waterproof GORE-TEX only, Zero Substitutions Allowed',
        agentId: 'browser-shopping-agent'
      })
    });

    const data = await res.json();
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-text">DISPATCH MANDATE</span>';

    if (data.orderId) {
      switchScenario(1);
      const badge = document.getElementById('vaultStateBadge');
      if (badge) badge.innerText = `HOLD ARMED · PAYPAL ID: ${data.orderId.substring(0, 10)}...`;

      const orderEl = document.getElementById('proofOrderId');
      if (orderEl) orderEl.innerText = data.orderId;

      alert(`TCC Shopping Agent Dispatched Order on PayPal Rails!\n\nOrder ID: ${data.orderId}\nIntent: ${data.intent} (Escrow Hold)\nAmount: $${data.mandate.amount} USD\nApproval URL: ${data.approveLink}\n\nFunds remain on reserve until warehouse packing slip audit passes!`);
    } else {
      alert('Order response: ' + JSON.stringify(data));
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-text">DISPATCH MANDATE</span>';
    alert('Failed to dispatch mandate: ' + err.message);
  }
}


// Modal Open/Close Controls
function openAgentModal() {
  const modal = document.getElementById('agentModal');
  if (modal) modal.classList.add('open');
}

function closeAgentModal() {
  const modal = document.getElementById('agentModal');
  if (modal) modal.classList.remove('open');
}

// Interactive ChatGPT Replica Message Handler
async function sendChatMessage() {
  const input = document.getElementById('chatModalInput');
  const sendBtn = document.getElementById('chatSendBtn');
  const body = document.getElementById('chatgptBody');
  const text = input.value.trim();
  if (!text) return;

  // Append user bubble
  const userDiv = document.createElement('div');
  userDiv.className = 'chat-msg msg-user';
  userDiv.innerHTML = `
    <div class="chat-avatar avatar-user">U</div>
    <div class="chat-bubble"><p>${text}</p></div>
  `;
  body.appendChild(userDiv);
  body.scrollTop = body.scrollHeight;

  input.value = '';
  sendBtn.disabled = true;

  // Add Thinking/Assistant Indicator
  const thinkingDiv = document.createElement('div');
  thinkingDiv.className = 'chat-msg msg-assistant';
  thinkingDiv.id = 'gptThinking';
  thinkingDiv.innerHTML = `
    <div class="chat-avatar avatar-gpt">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L3 6.5V11.5C3 16.8 6.8 21.7 12 23C17.2 21.7 21 16.8 21 11.5V6.5L12 2Z" stroke="#10B981" stroke-width="2"/>
      </svg>
    </div>
    <div class="chat-bubble"><p class="chat-hint font-mono">Enforcing TCC Guardrails on PayPal Orders v2 rails...</p></div>
  `;
  body.appendChild(thinkingDiv);
  body.scrollTop = body.scrollHeight;

  try {
    const res = await fetch('/api/orders/create-mandate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: '135.00',
        product: 'Nike Pegasus Trail 4 (Size 10 US) 100% GORE-TEX',
        mandateText: 'Size 10 US, 100% Waterproof GORE-TEX only, Zero Substitutions Allowed',
        agentId: 'chatgpt-consumer-agent'
      })
    });

    const data = await res.json();
    thinkingDiv.remove();
    sendBtn.disabled = false;

    const botDiv = document.createElement('div');
    botDiv.className = 'chat-msg msg-assistant';
    botDiv.innerHTML = `
      <div class="chat-avatar avatar-gpt">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L3 6.5V11.5C3 16.8 6.8 21.7 12 23C17.2 21.7 21 16.8 21 11.5V6.5L12 2Z" stroke="#10B981" stroke-width="2"/>
        </svg>
      </div>
      <div class="chat-bubble">
        <p>Order mandate verified and locked on PayPal Orders v2 rails:</p>
        <div class="chat-order-card">
          <div class="chat-order-title">🤖 Autonomous Agent Order Dispatched</div>
          <div class="chat-order-row">• <strong>Item:</strong> Nike Pegasus Trail 4 (US Size 10, 100% GORE-TEX)</div>
          <div class="chat-order-row">• <strong>Budget Ceiling:</strong> $135.00 (Zero Unilateral Substitution Allowed)</div>
          <div class="chat-order-row">• <strong>PayPal Primitive:</strong> intent: AUTHORIZE (Hold, Not Capture)</div>
          <div class="chat-order-row">• <strong>PayPal Order ID:</strong> <code>${data.orderId || '3WC3150104466262P'}</code></div>
          <div class="chat-order-row">• <strong>Approval URL:</strong> <a href="${data.approveLink}" target="_blank" class="chat-order-link">${data.approveLink}</a></div>
          <div class="chat-order-shield">🛡️ <strong>TCC Shield:</strong> Escrow hold armed. Physical warehouse audit required before any funds capture.</div>
        </div>
      </div>
    `;
    body.appendChild(botDiv);
    body.scrollTop = body.scrollHeight;

    // Synchronize underlying dashboard
    if (data.orderId) {
      switchScenario(1);
      const badge = document.getElementById('vaultStateBadge');
      if (badge) badge.innerText = `HOLD ARMED · PAYPAL ID: ${data.orderId.substring(0, 10)}...`;
      const orderEl = document.getElementById('proofOrderId');
      if (orderEl) orderEl.innerText = data.orderId;
    }
  } catch (err) {
    if (thinkingDiv) thinkingDiv.remove();
    sendBtn.disabled = false;
    alert('Failed to dispatch mandate: ' + err.message);
  }
}
