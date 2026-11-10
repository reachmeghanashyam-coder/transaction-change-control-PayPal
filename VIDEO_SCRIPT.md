# TCC Video Script · 90-Second Competitive Demonstration

> **Target Duration:** 90 Seconds  
> **Audio Posture:** Calm, authoritative, technical, zero buzzwords.  
> **Key Angle:** Why PayPal wins Agentic Commerce through Dual-Lock Governance.

---

### ACT 1: The Problem in Agentic Commerce (0:00 – 0:20)
* **Visual:** Claude Desktop chat window open. The user types: *"Find me Nike Pegasus Trail 4 running shoes in size 10 US. Must be 100% Waterproof GORE-TEX for a wet marathon."*
* **Voiceover:**
  > *"When an autonomous AI agent buys physical goods for a user, an acute vulnerability exists between order checkout and warehouse fulfillment: An AI agent's authority to buy is never authority for a merchant to alter the deal."*
* **Visual:** Claude Desktop calls `tcc_validate_pre_purchase_guardrails`, passes the budget check, and then calls `tcc_create_mandate_order`. A real PayPal Orders v2 token is returned with `intent: AUTHORIZE`.
* **Voiceover:**
  > *"TCC solves this by binding the agent's mandate to a delayed capture authorization on PayPal rails. Funds are held on reserve, but exactly zero dollars are captured."*

---

### ACT 2: In-Flight Fulfillment Audit (0:20 – 0:50)
* **Visual:** Cut to the TCC Spatial Gateway at `http://localhost:3000`. Left card shows **Phase 01: Pre-Purchase Mandate Locked**. Center shows **PayPal Hold Reserved ($0.00 Captured)**.
* **Voiceover:**
  > *"Now, the merchant's warehouse encounters a stockout. Their warehouse management system ships standard open mesh instead of waterproof GORE-TEX, and pushes a signed HMAC webhook to our gateway."*
* **Visual:** Click "Swap Trap". The right card updates with the warehouse packing slip. Gemini 3.5 Flash and our deterministic policy engine flag the missing membrane in real time.
* **Voiceover:**
  > *"Our dual-engine architecture combines a sub-2-millisecond deterministic policy gate with Gemini 3.5 Flash for unstructured packing slips. If Gemini encounters high demand or OCR corruption, the engine fails closed. The PayPal hold remains strictly frozen."*

---

### ACT 3: Sovereign Settlement Enforcement (0:50 – 1:15)
* **Visual:** Highlight the Center Card. The status reads: **HOLD FROZEN ON PAYPAL · $0.00 CAPTURED**. Show the two sovereign choices: "Reject & Void" and "Accept Mesh for $110.00".
* **Voiceover:**
  > *"Under traditional instant-capture checkout, the buyer suffers a ruined marathon and files a chargeback—costing the merchant $155 in lost revenue and dispute fees. Under TCC, the buyer has sovereign control: they can Reject & Void via PayPal's authorization API with zero fees..."*
* **Visual:** Click "Accept Mesh for $110.00". The center card transitions to green. Show the partial capture of $110.00 and $25.00 auto-refunded to the buyer.
* **Voiceover:**
  > *"...or accept an automated salvage amendment. TCC executes a partial capture on PayPal rails at $110, automatically releasing $25 back to the buyer. The sale is salvaged, and the dispute is eliminated at the protocol layer."*

---

### ACT 4: Verification & Protocol Moat (1:15 – 1:30)
* **Visual:** Terminal screen showing `npm test` running 12/12 tests passing with real TLS connections against `api-m.sandbox.paypal.com`. Then quick cut to the Judge Evidence Vault in the UI.
* **Voiceover:**
  > *"TCC features 12 automated verification tests, zero simulated responses, and an official Model Context Protocol server for Claude and Cursor. Neither Stripe nor Apple Pay provide in-flight contractual escrow for AI agents. With TCC, PayPal becomes the default payment rail for the agentic economy."*
