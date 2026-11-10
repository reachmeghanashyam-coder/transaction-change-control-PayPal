# TCC (Transaction Change Control) · Architecture & Judging Defense

> **PayPal AI Hackathon 2026**
> **Category:** Best Use of Agentic Commerce / Best Use of PayPal + AI
> **Core Thesis:** *An AI agent's authority to buy is never authority for a store to alter the deal.*

---

## 1. Executive Summary & Problem Space

In 2026, autonomous AI shopping agents (Claude, Cursor, ChatGPT Operator) can browse the web, compare prices, and execute transactions on behalf of users. However, once an agent places an order, the transaction leaves the agent's control and enters the merchant's physical fulfillment pipeline (ERP, WMS, dropshipping hubs).

Merchants frequently encounter stockouts or supplier shortages and substitute items:
- A buyer orders **Nike Pegasus Trail 4 (GORE-TEX Waterproof)** for a wet marathon.
- The warehouse runs out of waterproof pairs and silently dispatches **Nike Pegasus Trail 4 (Open-Mesh Road Edition)**.
- If the merchant captured payment upfront, the buyer is trapped in a multi-week dispute or return nightmare.

**TCC solves this natively on PayPal Rails:**
1. The AI Agent places the order using **PayPal Orders v2** with `intent: AUTHORIZE`, placing a hold on the buyer's funds ($135.00) rather than capturing.
2. The agent commits the buyer's non-negotiable specification into the authorization contract.
3. When the warehouse dispatches the order, its packing slip / ASN is ingested via webhook or MCP.
4. Gemini 1.5 Flash + our deterministic 4-state policy engine audits the packing slip against the approved mandate.
5. If compliant $\to$ **Auto-Capture ($135.00)** is released to the merchant.
6. If breached $\to$ **Hold is Frozen ($0.00 captured)** on PayPal. The merchant cannot touch the funds. The buyer can void the transaction for a 100% clean cancellation (`HTTP 204` on PayPal API) or accept an amended discount proposal (e.g. $25 credit with partial capture).

---

## 2. Technical Architecture & Protocols

```mermaid
flowchart TD
    subgraph Agent ["Autonomous AI Agent"]
        A[Claude Desktop / Cursor] -->|MCP Stdio / JSON-RPC| MCP[mcpServer.js<br/>@modelcontextprotocol/sdk]
    end

    subgraph Gateway ["TCC Settlement Gateway (Node.js/Express)"]
        MCP --> Core[Gateway Orchestrator]
        WMS[Warehouse ERP / WMS] -->|POST /api/webhooks/fulfillment| WH_Engine[Webhook Ingestion Engine]
        WH_Engine --> Core
        Core --> AI[Gemini 1.5 Flash Extractor]
        AI --> Policy[Deterministic Policy Engine<br/>4-State Evidence Taxonomy]
    end

    subgraph PayPal ["PayPal REST v2 Rails (Sandbox)"]
        Core -->|POST /v2/checkout/orders| PP1[Orders v2: intent: AUTHORIZE]
        Core -->|POST /v2/payments/authorizations/{id}/capture| PP2[Full or Partial Capture]
        Core -->|POST /v2/payments/authorizations/{id}/void| PP3[Void Authorization]
    end

    subgraph UI ["Spatial Execution Canvas"]
        Core -.->|Server-Sent Events /api/events| Browser[Live Reactive Dashboard]
    end
```

### Protocol 1: Model Context Protocol (MCP)
- Fully compliant with `@modelcontextprotocol/sdk` over `StdioServerTransport`.
- Exposes 3 first-class agent tools:
  - `tcc_create_mandate_order`: Creates the `intent: AUTHORIZE` order and registers the spec.
  - `tcc_audit_fulfillment`: Audits warehouse slips against the baseline mandate.
  - `tcc_enforce_settlement`: Programmatically captures or voids on PayPal rails.
- One-click configuration for Claude Desktop: `claude_desktop_config.json`.

### Protocol 2: Enterprise Webhook Ingestion Engine (`/api/webhooks/fulfillment`)
- Ingests ASN and packing slip webhooks from Shopify, ShipBob, or custom WMS.
- Real-time Server-Sent Events (`/api/events`) push live fulfillment updates directly to open client monitors hands-free.

### Protocol 3: Deterministic Fail-Closed Security Gate
- Unlike naive LLM wrappers that hallucinate or fail open, TCC operates under strict financial safety:
  - If a packing slip is corrupted, OCR is unreadable, or the AI service times out, the engine classifies the evidence as `UNKNOWN`.
  - An `UNKNOWN` state **fails closed**: the PayPal authorization hold remains frozen, merchant payout is blocked, and funds remain safe in the buyer's account.

---

## 3. Rubric & Judging Defense (The 10 Gates)

| Gate | Requirement | TCC Implementation Proof |
| :--- | :--- | :--- |
| **Gate 1: Rubric First** | Best Use of Agentic Commerce & PayPal | Built specifically for autonomous agent purchase governance on PayPal Orders v2 rails. |
| **Gate 2: Real Runtime** | Native PayPal primitives | Uses real PayPal `intent: AUTHORIZE`, `/capture`, and `/void` REST v2 APIs on `api-m.sandbox.paypal.com`. |
| **Gate 3: 100% Real Execution** | Verified ledger artifacts | Permanent Sandbox Order ID: `36S14862Y66466816`, Authorization ID: `7VU467051N1536501`. Verified passing automated tests (`9/9 passing`). |
| **Gate 4: One Sharp Knife** | Focused problem | Solves one acute problem: in-flight fulfillment tampering in agentic commerce. |
| **Gate 5: Reproducible** | Can be tested in <2 min | `npm test` runs the complete test suite in 5 seconds. Interactive Swagger docs at `/docs`. Health check at `/health`. |
| **Gate 6: Fail-Closed** | Financial safety | Validated through test suite: corrupted slips and model dropouts fail closed without unauthorized captures. |

---

## 4. Verification & Testing

Run the full automated test harness:
```bash
npm test
```

Expected Output:
```text
================================================================
   TCC TEST SUITE: 3 FINANCIAL LIFECYCLES & POLICY ENGINE      
================================================================

[1/4] DETERMINISTIC POLICY GATE VERIFICATION
  ✓ PASS: B2C Footwear: Open Mesh is recognized as UNKNOWN and triggers gate
  ✓ PASS: B2B Server RAM: Non-ECC UDIMM detected as ABSENT and breaches data integrity
  ✓ PASS: Industrial MRO: Grade 304 detected as ABSENT for marine grade 316
  ✓ PASS: Clean Fulfillment: 100% compliant slip passes policy without gate hold

[2/4] FAIL-CLOSED DEFENSIVE GATE VERIFICATION
  ✓ PASS: Malformed / Corrupt OCR slip triggers UNKNOWN and fails closed (hold frozen)
  ✓ PASS: AI extraction failure never defaults to compliant (merchant payout blocked)

[3/4] PAYPAL REST V2 RAILS VERIFICATION
  ✓ PASS: PayPal OAuth token generation succeeds against api-m.sandbox.paypal.com
  ✓ PASS: Live PayPal Authorization status inquiry validates VOIDED state

[4/4] WEBHOOK & MCP ARCHITECTURE VERIFICATION
  ✓ PASS: MCP server definition registers 3 tools (tcc_create_mandate_order, tcc_audit_fulfillment, tcc_enforce_settlement)

================================================================
   TEST RUN COMPLETE: 9 PASSED, 0 FAILED       
================================================================
```
