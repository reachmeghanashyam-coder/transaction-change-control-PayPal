# TCC · Transaction Change Control on PayPal Rails

> **Autonomous Fulfillment Governance & Settlement Shield for AI Shopping Agents**  
> *Built for the PayPal AI Hackathon 2026 (`paypalaihackathon.devpost.com`)*

---

### Production Context in Agentic Commerce

When an autonomous AI agent purchases physical goods on behalf of a user, an acute vulnerability exists between **order checkout** and **physical warehouse dispatch**:

> **An AI agent's authority to buy is never authority for a store to alter the deal.**

In physical ecommerce fulfillment, inventory stockouts routinely lead to unapproved substitutions (e.g. buyer mandates *100% Waterproof GORE-TEX* running shoes for a wet marathon; the warehouse runs out of stock and substitutes *standard breathable mesh* at full price).

Under traditional instant-capture checkout:
1. The store immediately captures 100% of the funds ($135.00).
2. Inferior or mismatched goods are shipped.
3. The buyer suffers a ruined event, and the merchant faces a dispute fee + reverse logistics costs.

---

### The Architecture: How TCC Works in Real Life

TCC uses native **PayPal Orders v2** primitives to govern fulfillment before final funds settlement:

```
[1. AI SHOPPING AGENT] ──(intent: AUTHORIZE)──► [2. PAYPAL RAILS]
     Claude / Cursor / Operator                     Holds $135.00 on reserve
     Mandate: "100% GORE-TEX Required"              Captured: $0.00
                                                           ▲
                                                           │ (Settlement Directive)
[3. WAREHOUSE ERP / WMS] ──(Webhook + HMAC)───► [4. TCC GATEWAY]
     Shopify / ShipBob / Manhattan                  Gemini 3.5 Flash + Policy Gate
     Slip: "Dispatched Open-Mesh"                   Verifies compliance in real time
```

1. **Mandate Lock:** The AI shopping agent places the order using PayPal Orders v2 with `intent: "AUTHORIZE"`. Funds are reserved on the buyer's card, but **$0.00 is captured**.
2. **Asynchronous Webhook Ingestion:** When the merchant's warehouse packs the item, the ERP/WMS fires a signed webhook (`POST /api/webhooks/fulfillment`) containing the packing slip / ASN data.
3. **Deterministic Fail-Closed Audit:** Gemini 3.5 Flash extracts the shipped attributes and exact citations. A deterministic 4-state policy engine evaluates compliance. If specifications are missing or unverified, state resolves to `UNKNOWN` and **fails closed** (the PayPal hold remains strictly frozen).
4. **Sovereign Settlement Enforcement:**
   - **Compliant Dispatch:** Full capture (`$135.00`) is released to the merchant via PayPal Orders v2.
   - **Spec Breach:** The hold is frozen ($0.00). The buyer can **Reject & Void** via live PayPal API (`HTTP 204 No Content` / zero chargeback fees) or **Accept at Discount** (e.g. `$110.00` partial capture, with `$25.00` auto-released back to the buyer's balance).

---

### Real PayPal Sandbox Verification Proof

Zero simulated or mocked financial responses. All operations execute directly against `api-m.sandbox.paypal.com`:

* **Live Sandbox Order ID:** `9BY84793TD703174E`
* **PayPal Hosted Approval Link:** [https://www.sandbox.paypal.com/checkoutnow?token=9BY84793TD703174E](https://www.sandbox.paypal.com/checkoutnow?token=9BY84793TD703174E)
* **Verified Voided Authorization Record:** `7VU467051N1536501` (`status: "VOIDED"`)
* **Payee Merchant ID:** `9QY2YH5UFLKTJ` (`sb-zh47io53822863@business.example.com`)

---

### Why Merchants and PayPal Win (Commercial Economics)

| Stakeholder | Traditional Commerce | With TCC on PayPal Rails |
| :--- | :--- | :--- |
| **Merchant** | Unwanted substitution triggers chargeback (`-$135.00` + `$20.00` fee + lost inventory). | **Dispute Immunity:** Scenario 3 salvages the sale via dynamic $25 amendment ($110.00 capture). Zero chargeback fees. |
| **Buyer** | Trapped in multi-week return shipping and card dispute arbitration. | **Zero-Risk Guarantee:** Unapproved items are voided with 1 click before funds ever settle. |
| **PayPal** | Absorbs high dispute arbitration costs and customer service churn. | **Default Agentic Rail:** Captures 2.9% + $0.30 on recovered transactions and positions PayPal as the trusted settlement layer for AI commerce. |

---

### Tech Stack & Protocols

* **Financial Rails:** PayPal REST v2 API (`/v2/checkout/orders`, `/v2/payments/authorizations`)
* **AI Extraction Engine:** Google Gemini 3.5 Flash (`@google/genai`) with structured JSON schema enforcement
* **Agent Interface:** Official Model Context Protocol (`@modelcontextprotocol/sdk`) over `StdioServerTransport`
* **Backend:** Node.js, Express, Server-Sent Events (SSE), Crypto (HMAC-SHA256)
* **Testing:** Custom zero-dependency automated integration harness (`tests/test_lifecycles.js`)

---

### Developer Quickstart & Verification

#### 1. Run Automated Test Harness (9/9 Passing)
Verifies policy engine, fail-closed security, live PayPal OAuth token generation, and sandbox authorization inquiries:
```bash
npm test
```

#### 2. Run Autonomous Agent CLI Walkthrough
Simulates an end-to-end autonomous shopping agent transaction in under 6 seconds:
```bash
npm run agent:demo
```

#### 3. Run Model Context Protocol (MCP) Server
Compatible with Claude Desktop, Cursor, and any MCP client:
```bash
npm run mcp
```
*(Claude Desktop configuration available in `claude_desktop_config.json`).*

#### 4. Launch Local Interactive Gateway
```bash
npm start
```
* **Spatial Cockpit:** `http://localhost:3000`
* **Interactive API Docs (Swagger):** `http://localhost:3000/docs`
* **Gateway Health Endpoint:** `http://localhost:3000/health`
