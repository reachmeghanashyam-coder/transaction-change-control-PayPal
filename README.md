# Transaction Change Control (TCC) on PayPal

> **Fulfillment verification and settlement control for AI shopping agents.**  
> Built for the PayPal AI Hackathon 2026 (`paypalaihackathon.devpost.com`).

---

## Live Sandbox Execution & Correlated Verification

* **Live PayPal Sandbox Checkout Token:** [https://www.sandbox.paypal.com/checkoutnow?token=3UD04688N2031870R](https://www.sandbox.paypal.com/checkoutnow?token=3UD04688N2031870R) *(Note: Sandbox tokens require interactive payer approval before conversion to authorizations; fresh tokens can be generated via `npm run agent:demo`).*
* **Verified Ledger Authorization Record:** `7VU467051N1536501` (`status: "VOIDED"`, `amount: "135.00 USD"`, verified on `api-m.sandbox.paypal.com`)
* **Payee Merchant ID:** `9QY2YH5UFLKTJ` (`sb-zh47io53822863@business.example.com`)
* **Automated Test Suite:** **13 Passed, 0 Failed** via `npm test` (3 live PayPal Sandbox API integration tests + 10 deterministic policy tests).

### How to Independently Verify the Correlated Mismatch-to-Void Workflow:
To prove the causal link connecting the buyer mandate, warehouse packing slip mismatch, and the resulting PayPal Sandbox void:
```bash
npm run verify:audit
```
This executes `scripts/verify_audit_trail.js`, querying `api-m.sandbox.paypal.com` directly:
1. **Mandate Reference:** Binds PayPal Order `36S14862Y66466816` and Authorization `7VU467051N1536501` to the $135.00 GORE-TEX specification.
2. **Fulfillment Evidence:** Ingests signed packing slip `#4092` attempting an unapproved open-mesh substitution.
3. **Policy Decision:** Triggers `MATERIAL_SPEC_BREACH` and halts capture.
4. **PayPal Ledger Verification:** Live query confirms PayPal Authorization `7VU467051N1536501` is `VOIDED` with $0.00 captured.

---

## The Problem

AI shopping agents can be authorized to purchase a specific product at an agreed price. But what happens when the merchant's warehouse substitutes that product before shipping?

Consider a simple example:

A buyer asks an agent to purchase Nike Pegasus Trail 4 GORE-TEX shoes for $135. The warehouse runs out of stock and packs the standard mesh version instead.

The merchant has changed an important part of the deal, but the payment may already have been captured. Under traditional checkout:
1. The store immediately captures 100% of the funds.
2. Inferior or mismatched goods are shipped.
3. The buyer disputes the transaction, resulting in chargebacks, inventory loss, and dispute fees.

TCC addresses this gap.

> **An agent's authority to buy is not permission for a merchant to change what the buyer agreed to purchase.**

---

## What TCC Does

PayPal already provides the payment authorization and settlement primitives (`intent: AUTHORIZE`, `CAPTURE`, and `VOID`). TCC adds the missing fulfillment-dependent decision layer between authorization and capture.

1. **Before purchase:** The agent validates the buyer's budget and product requirements, creates an order using `intent: AUTHORIZE`, guides the buyer through PayPal approval, and obtains the resulting authorization hold.
2. **During fulfillment:** TCC receives signed warehouse fulfillment documents (such as packing slips and advanced shipping notices) and checks the declared product against the buyer's original requirements.
3. **Before settlement:** TCC applies deterministic policies to the verification result. A matching item proceeds to capture. A mismatch triggers an immediate void, while an alternative requires explicit buyer approval before capturing an agreed amount.

The goal is straightforward: prevent an AI agent from settling a transaction for goods that don't match the buyer's agreed requirements.

---

## How TCC Works

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   THE TCC PIPELINE                                          │
├────────────────────────────────┬────────────────────────────┬───────────────────────────────┤
│    PHASE 1: PRE-PURCHASE       │   PHASE 2: IN-FLIGHT       │     PHASE 3: POST-AUDIT       │
│      (Mandate & Auth Hold)     │    (Fulfillment Audit)     │     (Governed Settlement)     │
├────────────────────────────────┼────────────────────────────┼───────────────────────────────┤
│ • Agent Mandate Binding        │ • Inbound Webhook Event    │ • Verified Match -> CAPTURE   │
│ • Budget Ceiling Enforcement   │ • Gemini 3.5 Flash Parsing │ • Spec Breach    -> VOID      │
│ • PayPal intent: AUTHORIZE     │ • Deterministic Policy Gate│ • Buyer Amendment-> PARTIAL   │
│ • Hold $135.00 · Capture $0.00 │ • Fail-Closed Decision     │ • Dispute-Risk Reduction      │
└────────────────────────────────┴────────────────────────────┴───────────────────────────────┘
```

---

## Three Key Capabilities

### 1. Pre-Purchase Guardrail & Mandate Binding
Before committing funds, the AI shopping agent invokes `POST /api/guardrails/pre-purchase` (or via Model Context Protocol):
* **Budget Ceiling Enforcement:** Validates checkout price against authorized budget limits.
* **Seller Term Auditing:** Flags clauses in merchant terms that claim unilateral rights to substitute goods without consent.
* **Invariant Lock:** Binds non-negotiable specifications (e.g. `100% GORE-TEX`) to a SHA-256 hash.
* **PayPal Authorization Sequence:** Creates an order with `intent: "AUTHORIZE"`. Upon buyer approval, TCC authorizes the order on PayPal REST v2. Funds are held on the buyer's payment method, but **$0.00 is captured**.

### 2. Fulfillment Evidence Verification
When the warehouse packs the order, the system receives a signed webhook (`POST /api/webhooks/fulfillment`) compatible with Shopify (`orders/fulfilled`) and ShipBob (`order.shipment.packed`) schemas:
* **Deterministic Policy Engine:** Immediate regex and schema verification checking structured line items and SKU invariants.
* **Gemini 3.5 Flash Extraction Layer:** Parses unstructured packing slips, thermal printer outputs, and ambiguous descriptions into a structured JSON schema.
* **Fail-Closed Security:** If the AI model is unavailable or evidence is conflicting, the policy engine marks evidence as `UNKNOWN` and **fails closed**—the PayPal authorization hold remains strictly uncaptured.

### 3. Governed Settlement
When a substitution or spec breach occurs:
* **Option A: Instant Void ($0.00 Captured):** Calls PayPal REST v2 `/v2/payments/authorizations/{id}/void`. The authorization is canceled on the PayPal ledger before capture. No capture is made for the voided authorization.
* **Option B: Buyer-Consented Partial Settlement ($110.00 Capture):** If the buyer explicitly consents to accept the alternative item for a discount, TCC captures the buyer-approved $110.00 using `final_capture: true`. The remaining $25.00 authorization is not captured; TCC verifies its final state and handles any remaining authorization according to PayPal's supported void and expiry behavior. The buyer is not charged the uncaptured difference.

---

## Why Merchants Might Use TCC

> **Illustrative Unit-Economics Scenario:** The following model illustrates theoretical unit economics for a retailer experiencing frequent inventory stockouts, comparing instant capture with TCC governed settlement. Assumptions: Merchant product cost, payment processing overhead, and return logistics vary by merchant tier.

| Metric | Traditional Instant Capture | With TCC on PayPal Rails | Merchant Impact |
| :--- | :--- | :--- | :--- |
| **Warehouse Substitution** | Chargeback Filed | Consented $25 Amendment Accepted | **Dispute Risk Avoided** |
| **Merchant Net Payout** | `-$135.00` (Reversed) | `+$110.00` (Settled) | **+$110.00 Revenue Salvaged** |
| **Dispute Admin Fee** | `-$20.00` Penalty | `$0.00` | **+$20.00 Fee Avoided** |
| **Inventory Status** | Lost / Return Dispute | Retained by Customer | **Reverse Logistics Saved** |
| **Net Economics per Incident** | **-$155.00 Net Loss** | **+$110.00 Net Retained** | **+$265.00 Illustrative Delta** |

---

## What the System Does and Doesn't Do

In the interest of technical accuracy and judge transparency, here are the system's exact boundaries:

1. **Document Verification vs. Physical Inspection:**  
   TCC audits **inbound, signed fulfillment documents** (packing slips, WMS shipment notifications, advanced shipping notices). It verifies that the merchant's declared fulfillment documentation matches the buyer's purchase invariants before payment capture. It does not physically inspect parcels.
2. **PayPal Authorization Holds vs. Legal Escrow:**  
   PayPal's `intent: AUTHORIZE` creates a payment authorization hold. In PayPal's API, authorizations have a 3-day honor window and up to a 29-day capture window. It is not an independent third-party legal escrow trust account, but a native payment authorization hold.
3. **Production Deployment vs. Prototype Sandbox:**  
   Autonomous payer authorization would require an explicitly supported PayPal payment-token or delegated-consent integration, appropriate merchant/partner approval, and buyer-granted authority. This prototype demonstrates the Sandbox approval and authorization flow; production delegation is not implemented or claimed.
4. **Partial Capture Mechanics:**  
   When capturing $110.00 against a $135.00 authorization, TCC requests a final capture of $110.00. The remaining $25.00 is not captured. TCC separately verifies and handles the remaining authorization according to PayPal's supported void or expiry behavior. The buyer is not charged the uncaptured difference.

---

## Run It Yourself (Local & Live)

Any judge or developer can verify the system in under 60 seconds:

```bash
# 1. Run Automated Test Suite
npm test
# Output: 13 Passed (3 live PayPal Sandbox API tests + 10 deterministic policy tests)

# 2. Run Correlated Audit Trail Verification (Proves Inbound Webhook -> Breach -> PayPal Void)
npm run verify:audit

# 3. Run Autonomous AI Agent CLI Demonstration
npm run agent:demo

# 4. View Live Cockpit (Hosted on Render)
# https://tcc-paypal.onrender.com
```

---

## Protocols & Interfaces

* **Autonomous Agent Interfaces:**
  * **OpenAPI 3.1 Specification** (`/openapi.json` & `/docs`) for AI Agents & Custom GPT Actions ([Setup Guide](CHATGPT_ACTION_GUIDE.md)).
  * **Model Context Protocol (MCP)** (`@modelcontextprotocol/sdk`) for Claude Desktop, Cursor, and IDE coding agents (`npm run mcp`).
* **Financial Rails:** PayPal REST v2 API (`/v2/checkout/orders`, `/v2/payments/authorizations`) with `intent: AUTHORIZE`.
* **AI Extraction Engine:** Google Gemini 3.5 Flash (`@google/genai`) with 3-tier resilient deterministic failover.
* **Webhook Ingestion:** Compatible with Shopify (`orders/fulfilled`) and ShipBob (`order.shipment.packed`) schemas with HMAC-SHA256 signature verification.
* **Backend:** Node.js, Express, Server-Sent Events (SSE).
