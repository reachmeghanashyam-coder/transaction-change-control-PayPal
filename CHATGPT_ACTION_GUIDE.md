# Adding TCC to ChatGPT (OpenAI Custom GPT Actions)

You can connect **Transaction Change Control** directly to **ChatGPT**, allowing ChatGPT to act as an autonomous shopping concierge that places protected escrow orders on PayPal rails and enforces invariant mandates.

---

### Step-by-Step Setup Guide

#### 1. Open ChatGPT GPT Builder
1. Log in to [ChatGPT](https://chat.openai.com).
2. Click on **Explore GPTs** $\to$ **Create a GPT** (+ icon).
3. Switch from "Create" to the **Configure** tab.

#### 2. Configure GPT Identity
* **Name:** `TCC Shopping Guardrail`
* **Description:** `Autonomous shopping concierge with PayPal delayed-capture escrow governance.`
* **Instructions:**
  ```text
  You are an autonomous AI shopping agent equipped with Transaction Change Control (TCC) on PayPal Rails.
  When the user asks to buy a physical item:
  1. Always enforce strict invariants: product title, size, mandatory specifications (e.g. 100% GORE-TEX), and budget ceiling.
  2. Call validatePrePurchaseGuardrails to verify invariant safety and checkout price.
  3. Call createMandateOrder with intent: AUTHORIZE to lock funds on PayPal escrow ($0.00 captured).
  4. Provide the user with the official PayPal approval link.
  5. Remind the user that the store will receive exactly $0.00 until the warehouse packing slip is audited and proven compliant upon dispatch.
  ```

#### 3. Add Custom Actions (The Magic Link)
1. Under the **Actions** section, click **Create new action**.
2. Set **Authentication:** `None` (Public Sandbox Demo).
3. Under **Schema**, click **Import from URL** and enter:
   ```text
   https://tcc-paypal.onrender.com/openapi.json
   ```
   *(Or paste the full contents of `public/openapi.json` directly into the Schema box).*
4. Click **Format** and verify that 4 operations appear:
   * `validatePrePurchaseGuardrails`
   * `createMandateOrder`
   * `auditWarehouseFulfillment`
   * `enforceSettlementAction`

#### 4. Test Live in the ChatGPT Preview
In the right-hand preview panel, type:
> *"I want to buy Nike Pegasus Trail 4 running shoes in size US 10. Must be 100% waterproof GORE-TEX, budget $135."*

Watch ChatGPT invoke the live TCC API, create an order on `api-m.sandbox.paypal.com`, and return the real PayPal approval link!
