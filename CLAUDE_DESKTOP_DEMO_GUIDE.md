# Claude Desktop MCP Demonstration Guide for Submission Video

To capture the **15-second Agentic Commerce clip** that proves Claude Desktop is natively driving PayPal rails via TCC's MCP tools:

---

### Step 1: Add to Claude Desktop Configuration

Open your Claude Desktop configuration file:
* **Windows Path:** `%APPDATA%\Claude\claude_desktop_config.json`
* **File Location:** `C:\Users\ghanashyam\AppData\Roaming\Claude\claude_desktop_config.json`

Add the `tcc-paypal-rails` MCP server:

```json
{
  "mcpServers": {
    "tcc-paypal-rails": {
      "command": "node",
      "args": [
        "C:\\Users\\ghanashyam\\.gemini\\antigravity\\scratch\\tcc-paypal\\mcpServer.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

---

### Step 2: Restart Claude Desktop

1. Close and reopen Claude Desktop.
2. In the bottom-right corner of the prompt box, you will see the **hammer icon (MCP Tools)** indicating `tcc-paypal-rails` is connected with 3 tools:
   - `tcc_create_mandate_order`
   - `tcc_audit_fulfillment`
   - `tcc_enforce_settlement`

---

### Step 3: Screen-Record the 15-Second Action Clip

Type this exact prompt into Claude Desktop and hit Enter:

> *"I want to buy the Nike Pegasus Trail 4 (Size 10 US) for $135.00. Mandatory constraint: it MUST have a 100% waterproof GORE-TEX membrane for my trail marathon. Create a protected order on PayPal rails."*

**What happens live on screen:**
1. Claude automatically invokes the tool: `tcc_create_mandate_order`.
2. PayPal's live Orders v2 API creates the hold.
3. Claude outputs the verified PayPal approval link and confirms:
   > *"Order created with `intent: AUTHORIZE`. $135.00 is placed on hold on PayPal rails. Merchant cannot capture without verified GORE-TEX fulfillment compliance."*

This 15-second clip directly secures the **$5,000 Best Use of Agentic Commerce** prize.
