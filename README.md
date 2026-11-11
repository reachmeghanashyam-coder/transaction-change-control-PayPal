# Transaction Change Control on PayPal Rails

> **Autonomous Fulfillment Governance & Settlement Policy Layer for AI Shopping Agents**  
> *Built for the PayPal AI Hackathon 2026 (`paypalaihackathon.devpost.com`)*

---

### Verified Live Sandbox Execution Links for Judges

> **Zero Mock Mode. Zero `SIM-` Fallbacks.** Every operation executes against live PayPal Sandbox infrastructure.

* **Live PayPal Sandbox Checkout Token:** [https://www.sandbox.paypal.com/checkoutnow?token=3UD04688N2031870R](https://www.sandbox.paypal.com/checkoutnow?token=3UD04688N2031870R)
* **Verified Ledger Authorization Record:** `7VU467051N1536501` (`status: "VOIDED"`, `amount: "135.00 USD"`, verified on `api-m.sandbox.paypal.com`)
* **Payee Merchant ID:** `9QY2YH5UFLKTJ` (`sb-zh47io53822863@business.example.com`)
* **Automated Integration Test Proof:** **13 Passed, 0 Failed** via `npm test` against `api-m.sandbox.paypal.com`.

---

### The Problem in Agentic Commerce

When an autonomous AI agent purchases physical goods on behalf of a user, an acute vulnerability exists between **order checkout** and **physical warehouse dispatch**:

> **"An AI agent's authority to buy is never authority for a store to alter the deal."**

In ecommerce fulfillment, inventory stockouts routinely lead to unilateral substitutions:
* **Consumer Footwear ($135.00):** Buyer mandates *100% Waterproof GORE-TEX* running shoes for a wet marathon; warehouse substitutes standard breathable mesh at full price.
* **Enterprise Hardware ($2,400.00):** Data center mandates *ECC Registered Server RAM*; distributor ships desktop non-ECC UDIMM (causing silent bit-flips and cluster crashes).
* **Industrial MRO ($850.00):** Marine operations mandate *Grade 316 Stainless Fasteners*; warehouse ships Grade 304 zinc-coated bolts (leading to rapid saltwater corrosion).

Under traditional instant-capture checkout:
1. The store immediately captures 100% of the funds.
2. Inferior or mismatched goods are shipped.
3. The buyer suffers a ruined event or hardware failure and files an adversarial chargeback. The merchant loses the entire sale, forfeits the inventory, and pays a $20.00 dispute penalty.

---

### How TCC Leverages PayPal's Native Primitives

Traditional card rails and instant-capture checkout provide zero in-flight contractual verification. PayPal natively provides two foundational payment primitives: **`intent: AUTHORIZE`** (creating an authorized payment hold) and **`CAPTURE` / `VOID`** (settling or releasing that hold).

TCC introduces an **in-flight fulfillment governance and settlement policy engine** directly between authorization and capture:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                           THE COMPLETE DUAL-LOCK PIPELINE                                   │
├────────────────────────────────┬────────────────────────────┬───────────────────────────────┤
│    PHASE 1: PRE-PURCHASE       │   PHASE 2: IN-FLIGHT       │     PHASE 3: POST-AUDIT       │
│      (Mandate & Auth Hold)     │    (Fulfillment Audit)     │     (Governed Settlement)     │
├────────────────────────────────┼────────────────────────────┼───────────────────────────────┤
│ • Agent Mandate Binding        │ • Merchant Inbound Webhook │ • Verified Match -> CAPTURE   │
│ • Price & Spec Invariant Lock  │ • Gemini 3.5 Flash ASN OCR │ • Spec Breach    -> VOID      │
│ • PayPal intent: AUTHORIZE     │ • Deterministic Policy Gate│ • Buyer Amendment-> PARTIAL   │
│ • Hold $135.00 · Capture $0.00 │ • Fail-Closed State Engine │ • Dispute-Risk Reduction      │
└────────────────────────────────┴────────────────────────────┴───────────────────────────────┘
```

---

### The 3 Core Architectural Innovations

#### 1. Phase 1: Pre-Purchase Guardrail & Mandate Binding
Before committing funds, the AI shopping agent invokes `tcc_validate_pre_purchase_guardrails` over the official Model Context Protocol (MCP) or `POST /api/guardrails/pre-purchase`:
* **Budget Ceiling Enforcement:** Prevents checkout price overruns.
* **Deceptive Seller Clause Detection:** Flags clauses in merchant terms that claim unilateral rights to substitute goods without consent.
* **Invariant Lock:** Binds non-negotiable specifications (e.g. `100% GORE-TEX`) to a cryptographic SHA-256 hash.
* **PayPal Authorization Hold:** Places the order via PayPal Orders v2 with `intent: "AUTHORIZE"`. Funds are authorized on the buyer's payment method, but **$0.00 is captured**.

#### 2. Dual-Engine Fulfillment Audit (Gemini 3.5 Flash + Deterministic Gate)
When the merchant's warehouse packs the order, the WMS (Shopify, ShipBob, Manhattan Associates) pushes a signed webhook (`POST /api/webhooks/fulfillment`) with HMAC-SHA256 signature verification:
* **Sub-2ms Deterministic AST Engine:** Immediate regex/AST verification guaranteeing high-throughput and predictable SLAs under heavy warehouse loads.
* **Gemini 3.5 Flash Semantic Extraction Layer:** Handles unstructured packing slips, thermal OCR outputs, and ambiguous line items using structured JSON schema output.
* **Fail-Closed Security:** If Gemini experiences high-demand spikes (HTTP 503) or OCR text is corrupted, the policy engine categorizes evidence as `UNKNOWN` and **fails closed**—the PayPal authorization hold remains strictly uncaptured at $0.00.

#### 3. Governed Settlement & The Stockout Salvage Model
When a substitution or spec breach occurs:
* **Option A: Instant Reject & Void ($0.00 Captured):** Calls PayPal REST v2 `/v2/payments/authorizations/{id}/void`. Authorizations are voided cleanly on the PayPal ledger—zero chargeback fees, zero dispute filings.
* **Option B: Buyer-Consented Partial Settlement ($110.00 Capture):** If the buyer explicitly agrees to accept the downgraded item for a discount, TCC calls PayPal REST v2 `/v2/payments/authorizations/{id}/capture` with `amount: "110.00"` and `final_capture: true`. This captures the agreed amount and automatically releases the remaining $25.00 authorization hold back to the buyer's balance.

---

### Illustrative Economic Model: Dispute Reduction & Stockout Salvage

> **Disclaimer:** The figures below represent an illustrative unit-economics scenario for a retail merchant experiencing frequent stockouts, comparing instant capture with TCC governed settlement.

| Metric | Traditional Instant Capture | With TCC on PayPal Rails | Merchant Impact |
| :--- | :--- | :--- | :--- |
| **Warehouse Substitution** | Chargeback Filed | Consented $25 Amendment Accepted | **Dispute Risk Avoided** |
| **Merchant Net Payout** | `-$135.00` (Reversed) | `+$110.00` (Settled) | **+$110.00 Revenue Salvaged** |
| **Dispute Admin Fee** | `-$20.00` Penalty | `$0.00` | **+$20.00 Fee Avoided** |
| **Inventory Status** | Lost / Return Dispute | Retained by Customer | **Reverse Logistics Saved** |
| **Net Economics per Incident** | **-$155.00 Net Loss** | **+$110.00 Net Retained** | **+$265.00 Illustrative Delta** |

---

### Architectural Boundaries & Disclosures (Judge Transparency)

In accordance with institutional engineering rigor, we explicitly disclose the boundaries of the system:

1. **Evidence-Based Fulfillment Audit vs. Physical Inspection:**  
   TCC audits **inbound, HMAC-signed fulfillment documents** (packing slips, WMS shipment notifications, advanced shipping notices). It verifies that the merchant's declared fulfillment documentation complies with the buyer's invariant mandate before payment capture. It does not perform physical inspection of sealed parcels.
2. **PayPal Authorization Holds vs. Legal Escrow:**  
   PayPal's `intent: AUTHORIZE` creates a payment authorization hold. In PayPal's API, authorizations have a 3-day honor window and up to a 29-day capture window. It is not an independent third-party legal escrow trust account, but a native payment authorization hold.
3. **Sandbox Manual Payer Authentication:**  
   In PayPal Orders v2 Sandbox, orders created with `intent: AUTHORIZE` require interactive payer approval via `approveLink` before becoming capture-eligible authorizations. In a production enterprise AI agent deployment, payer authority is pre-delegated via **PayPal Vault v3 / Pre-Approved Billing Agreements**, allowing the agent to capture or void holds autonomously without interactive prompts.
4. **Partial Capture Mechanics:**  
   In PayPal REST v2, partial captures do not initiate an outbound refund transaction. When capturing $110.00 with `final_capture: true`, PayPal settles $110.00 and terminates the remaining $25.00 authorization reserve, ensuring the buyer is never billed for the uncaptured $25.00.

---

### Tech Stack & Multi-Client Protocols

* **Autonomous Agent Interfaces:**
  * **OpenAPI 3.1 Specification** (`/openapi.json` & `/docs`) for AI Agents & Custom GPT Actions ([Setup Guide](CHATGPT_ACTION_GUIDE.md)).
  * **Model Context Protocol (MCP)** (`@modelcontextprotocol/sdk`) for Claude Desktop, Cursor, and IDE coding agents.
  * **Autonomous Agent CLI:** `npm run agent:demo` executes full 5-act agent purchasing lifecycle against live PayPal rails.
* **Financial Rails:** PayPal REST v2 API (`/v2/checkout/orders`, `/v2/payments/authorizations`) with `intent: AUTHORIZE`.
* **AI Extraction Engine:** Google Gemini 3.5 Flash (`@google/genai`) with 3-tier resilient deterministic failover.
* **WMS Webhook Ingestion:** Native Shopify (`orders/fulfilled`) & ShipBob (`order.shipment.packed`) HMAC-SHA256 signature verification.
* **Backend:** Node.js, Express, Server-Sent Events (SSE).
* **Test Suite:** Zero-dependency automated test runner (`tests/test_lifecycles.js`) — **13 passing integration tests**.

---

### Verification & Reproduction in Under 60 Seconds (Stranger Test)

Any judge or developer can verify all claims locally or against our live deployment:

```bash
# 1. Run Automated Test Suite (13/13 Passing on PayPal Sandbox)
npm test

# 2. Run Autonomous AI Agent CLI (Executes Pre-Purchase Guardrails, PayPal Orders v2 Auth Hold, WMS Audit & Void)
npm run agent:demo

# 3. View Live Spatial Financial Cockpit (Hosted on Cloud Container)
# https://tcc-paypal.onrender.com
```

---

### Optional: Enterprise Agent Integration (ChatGPT / Claude / MCP)

For judges running external AI agent environments:
* **ChatGPT Custom GPT Action:** Point any OpenAPI-compatible client to `https://tcc-paypal.onrender.com/openapi.json` ([Detailed Instructions](CHATGPT_ACTION_GUIDE.md)).
* **MCP Stdio Server:** `node mcpServer.js` exposes 4 core settlement tools to any Model Context Protocol host.

```bash
# Launch MCP Server for Claude Desktop / Cursor
npm run mcp

# Launch Local Interactive Spatial Cockpit
npm start
# Cockpit:  http://localhost:3000
# OpenAPI:  http://localhost:3000/openapi.json
# Swagger:  http://localhost:3000/docs
# Health:   http://localhost:3000/health
```
