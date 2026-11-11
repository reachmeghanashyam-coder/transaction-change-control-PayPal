# Transaction Change Control on PayPal Rails

> **Autonomous Fulfillment Governance & Settlement Shield for AI Shopping Agents**  
> *Built for the PayPal AI Hackathon 2026 (`paypalaihackathon.devpost.com`)*

---

### Verified Live Sandbox Execution Links for Judges

> **Zero Mock Mode. Zero `SIM-` Fallbacks.** Every operation executes against live PayPal Sandbox infrastructure.

* **Live PayPal Sandbox Checkout Token:** [https://www.sandbox.paypal.com/checkoutnow?token=3UD04688N2031870R](https://www.sandbox.paypal.com/checkoutnow?token=3UD04688N2031870R)
* **Verified Ledger Authorization Record:** `7VU467051N1536501` (`status: "VOIDED"`, `amount: "135.00 USD"`)
* **Payee Merchant ID:** `9QY2YH5UFLKTJ` (`sb-zh47io53822863@business.example.com`)
* **Automated Integration Test Proof:** **13 Passed, 0 Failed** via `npm test` against `api-m.sandbox.paypal.com`.

---

### The Problem in Agentic Commerce

When an autonomous AI agent purchases physical goods on behalf of a user, an acute vulnerability exists between **order checkout** and **physical warehouse dispatch**:

> **"An AI agent's authority to buy is never authority for a store to alter the deal."**

In ecommerce fulfillment, inventory stockouts routinely lead to unapproved substitutions:
* **Consumer Footwear ($135.00):** Buyer mandates *100% Waterproof GORE-TEX* running shoes for a wet marathon; warehouse substitutes standard breathable mesh at full price.
* **Enterprise Hardware ($2,400.00):** Data center mandates *ECC Registered Server RAM*; distributor ships desktop non-ECC UDIMM (causing silent bit-flips and cluster crashes).
* **Industrial MRO ($850.00):** Marine operations mandate *Grade 316 Stainless Fasteners*; warehouse ships Grade 304 zinc-coated bolts (leading to rapid saltwater corrosion).

Under traditional instant-capture checkout:
1. The store immediately captures 100% of the funds.
2. Inferior or mismatched goods are shipped.
3. The buyer suffers a ruined event or hardware failure and files a chargeback. The merchant loses the entire sale, forfeits the inventory, and pays a $20.00 dispute penalty.

---

### Why TCC Makes PayPal the Default Payment Rail for AI Agents

Neither Stripe nor Apple Pay provide protocol-level contractual dispute prevention for autonomous agents. PayPal is historically built on **Trust and Buyer Protection**. 

By transforming **PayPal Orders v2** into an **Autonomous In-Flight Governance Layer**, TCC turns PayPal into the *only* payment rail where autonomous AI agents can safely commit capital without human supervision:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                           THE COMPLETE DUAL-LOCK PIPELINE                                   │
├────────────────────────────────┬────────────────────────────┬───────────────────────────────┤
│    PHASE 1: PRE-PURCHASE       │   PHASE 2: IN-FLIGHT       │     PHASE 3: POST-AUDIT       │
│      (Mandate & Escrow)        │      (Fulfillment)         │        (Settlement)           │
├────────────────────────────────┼────────────────────────────┼───────────────────────────────┤
│ • Agent Mandate Binding        │ • Merchant Warehouse ASN   │ • Verified Match -> CAPTURE   │
│ • Price & Spec Invariant Lock  │ • Gemini 3.5 Flash OCR/ASN │ • Spec Breach    -> VOID      │
│ • PayPal intent: AUTHORIZE     │ • Deterministic Policy     │ • Salvage Offer  -> ADAPT     │
│ • Hold $135.00 · Capture $0.00 │ • Fail-Closed State Engine │ • Zero Dispute Guarantee      │
└────────────────────────────────┴────────────────────────────┴───────────────────────────────┘
```

---

### The 3 Core Architectural Innovations

#### 1. Phase 1: Pre-Purchase Guardrail & Mandate Binding
Before committing funds, the AI shopping agent invokes `tcc_validate_pre_purchase_guardrails` over the official Model Context Protocol (MCP) or `POST /api/guardrails/pre-purchase`:
* **Budget Ceiling Enforcement:** Prevents checkout price overruns.
* **Deceptive Seller Clause Detection:** Flags clauses in merchant terms that claim unilateral rights to substitute goods without consent.
* **Invariant Lock:** Binds non-negotiable specifications (e.g. `100% GORE-TEX`) to a cryptographic SHA-256 hash.
* **Escrow Hold Initiation:** Places the order via PayPal Orders v2 with `intent: "AUTHORIZE"`. Funds are reserved on the buyer's balance, but **$0.00 is captured**.

#### 2. Dual-Engine Fulfillment Audit (Gemini 3.5 Flash + Deterministic Gate)
When the merchant's warehouse packs the order, the WMS (Shopify, ShipBob, Manhattan Associates) pushes a signed webhook (`POST /api/webhooks/fulfillment`) with HMAC-SHA256 signature verification:
* **Sub-2ms Deterministic AST Engine:** Immediate regex/AST verification guaranteeing high-throughput and predictable SLAs under heavy warehouse loads.
* **Gemini 3.5 Flash Semantic Extraction Layer:** Handles unstructured packing slips, thermal OCR outputs, and ambiguous line items using structured JSON schema output.
* **Fail-Closed Security:** If Gemini experiences high-demand spikes (HTTP 503) or OCR text is corrupted, the policy engine categorizes evidence as `UNKNOWN` and **fails closed**—the PayPal funds hold remains strictly frozen at $0.00 captured.

#### 3. Sovereign Settlement & The Stockout Salvage Model
When a substitution or spec breach occurs:
* **Option A: Instant Reject & Void ($0.00 Charged):** One-click call to PayPal REST v2 `/v2/payments/authorizations/{id}/void`. Immediate `HTTP 204 No Content`—zero chargeback fees, zero dispute filings.
* **Option B: Dynamic Salvage Negotiation ($110.00 Capture + $25.00 Restitution):** Rather than canceling the order, TCC executes a partial capture on PayPal rails ($110.00) while releasing $25.00 back to the buyer's card.

---

### The Economic Moat: Dispute Elimination & Stockout Salvage

Why would merchants and PayPal adopt TCC?

| Metric | Traditional Instant Capture | With TCC on PayPal Rails | Merchant Impact |
| :--- | :--- | :--- | :--- |
| **Warehouse Substitution** | Chargeback Filed | Dynamic $25 Amendment Accepted | **Dispute Eliminated** |
| **Merchant Net Payout** | `-$135.00` (Reversed) | `+$110.00` (Settled) | **+$110.00 Net Revenue Salvaged** |
| **Dispute Admin Fee** | `-$20.00` Penalty | `$0.00` | **+$20.00 Fee Avoided** |
| **Inventory Status** | Lost / Return Dispute | Retained by Customer | **Reverse Logistics Saved** |
| **Net Economics per Incident** | **-$155.00 Net Loss** | **+$110.00 Net Retained** | **+$265.00 Economic Delta** |

---

### Production Authentication Note (Gate 1 Defense)

In production agentic commerce, the buyer delegates payment authority to the AI agent via **PayPal Vault v3 / Pre-Approved Billing Agreements**, allowing the agent to capture or void holds autonomously. 

For sandbox evaluation, PayPal requires an interactive session approval. To ensure 100% reproducible testing by judges:
* **Live Sandbox Order Token:** `3UD04688N2031870R` ([PayPal Approval Link](https://www.sandbox.paypal.com/checkoutnow?token=3UD04688N2031870R))
* **Verified Ledger Authorization Record:** `7VU467051N1536501` (`status: "VOIDED"`, `amount: "135.00 USD"`)
* **Payee Merchant ID:** `9QY2YH5UFLKTJ` (`sb-zh47io53822863@business.example.com`)

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
# 1. Run Automated Test Suite (13/13 Passing)
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
