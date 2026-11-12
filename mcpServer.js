// mcpServer.js
// Production Model Context Protocol (MCP) Server for TCC on PayPal Rails
// Standard StdioServerTransport compatible with Claude Desktop, Cursor, and any MCP Client

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

const paypal = require('./services/paypal');
const policyEngine = require('./services/policyEngine');
const aiExtractor = require('./services/aiExtractor');

const server = new Server(
  {
    name: 'tcc-paypal-rails',
    version: '1.0.0',
    description: 'Transaction Change Control on PayPal Rails — Fulfillment Governance for AI Shopping Agents'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Register Available Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'tcc_validate_pre_purchase_guardrails',
        description: 'Phase 1 Pre-Purchase Guardrail: Audits merchant cart terms, price limits, and seller substitution policy BEFORE funds commitment to verify invariant safety.',
        inputSchema: {
          type: 'object',
          properties: {
            cartPrice: { type: 'number', description: 'Proposed checkout price' },
            maxPriceBudget: { type: 'number', description: 'Buyer strict budget limit' },
            productTitle: { type: 'string', description: 'Product title being purchased' },
            requiredInvariants: {
              type: 'array',
              items: { type: 'string' },
              description: 'Strict non-negotiable specifications (e.g. ["100% GORE-TEX", "US 10.0"])'
            },
            merchantTerms: { type: 'string', description: 'Merchant substitution / terms clause text' }
          },
          required: ['cartPrice', 'maxPriceBudget', 'productTitle', 'requiredInvariants']
        }
      },
      {
        name: 'tcc_create_mandate_order',
        description: 'Creates an intent: AUTHORIZE order on PayPal Orders v2 rails with buyer mandate locking. Merchant cannot capture without verified compliance.',
        inputSchema: {
          type: 'object',
          properties: {
            amount: { type: 'string', description: 'Order total amount (e.g. "135.00")' },
            currency: { type: 'string', default: 'USD', description: 'ISO-4217 Currency Code' },
            product: { type: 'string', description: 'Product title / SKU' },
            mandateText: { type: 'string', description: 'Non-negotiable attribute specification (e.g. "100% GORE-TEX Waterproof")' }
          },
          required: ['amount', 'product', 'mandateText']
        }
      },
      {
        name: 'tcc_audit_fulfillment',
        description: 'Performs deterministic and AI-powered audit of a warehouse packing slip or ASN against the approved mandate baseline.',
        inputSchema: {
          type: 'object',
          properties: {
            slipText: { type: 'string', description: 'Raw packing slip text, ASN payload, or OCR content from warehouse' },
            approvedBaseline: {
              type: 'object',
              properties: {
                product: { type: 'string' },
                price: { type: 'number' },
                mandate: {
                  type: 'object',
                  properties: {
                    mandateText: { type: 'string' }
                  }
                }
              },
              required: ['product', 'price']
            }
          },
          required: ['slipText', 'approvedBaseline']
        }
      },
      {
        name: 'tcc_enforce_settlement',
        description: 'Enforces final settlement on PayPal Orders v2 rails: CAPTURE payment if compliant, or permanently VOID authorization hold if breached.',
        inputSchema: {
          type: 'object',
          properties: {
            authorizationId: { type: 'string', description: 'PayPal Authorization ID' },
            decision: { type: 'string', enum: ['CAPTURE', 'VOID'], description: 'Settlement decision' },
            captureAmount: { type: 'string', description: 'Amount to capture (full or partial discounted amount)' }
          },
          required: ['authorizationId', 'decision']
        }
      }
    ]
  };
});

// Handle Tool Executions
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'tcc_validate_pre_purchase_guardrails') {
      const isPriceSafe = args.cartPrice <= args.maxPriceBudget;
      const termsLower = (args.merchantTerms || '').toLowerCase();
      const hasUncheckedSubstitutionClause = termsLower.includes('substitut') || termsLower.includes('equivalent item') || termsLower.includes('seller discretion');

      const violations = [];
      if (!isPriceSafe) {
        violations.push(`Price ceiling breached: Cart price $${args.cartPrice} exceeds budget limit $${args.maxPriceBudget}`);
      }
      if (hasUncheckedSubstitutionClause) {
        violations.push(`Merchant terms contain unilateral substitution clause without buyer consent guarantee.`);
      }

      const passed = violations.length === 0;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              phase: 'PHASE_1_PRE_PURCHASE_GUARDRAIL',
              status: passed ? 'APPROVED_FOR_AUTHORIZATION' : 'REJECTED_GUARDRAIL_BREACH',
              passed,
              violations,
              recommendation: passed 
                ? 'Safe to execute tcc_create_mandate_order with intent: AUTHORIZE escrow lock.' 
                : 'Do not commit funds. Invariant violation detected before checkout.',
              guardrailAudit: {
                cartPrice: args.cartPrice,
                budgetCeiling: args.maxPriceBudget,
                invariantsCount: args.requiredInvariants?.length || 0,
                merchantTermsAudited: Boolean(args.merchantTerms)
              }
            }, null, 2)
          }
        ]
      };
    }

    if (name === 'tcc_create_mandate_order') {
      const order = await paypal.createOrder({
        amount: args.amount,
        description: `TCC Protected: ${args.product} (${args.mandateText})`
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'CREATED',
              orderId: order.orderId,
              approveLink: order.approveLink,
              intent: 'AUTHORIZE',
              protectionGate: 'FROZEN_PENDING_FULFILLMENT',
              mandate: {
                product: args.product,
                amount: args.amount,
                mandateText: args.mandateText
              }
            }, null, 2)
          }
        ]
      };
    }

    if (name === 'tcc_audit_fulfillment') {
      const aiResult = await aiExtractor.extractWarehouseSlipAttributes(args.slipText, {
        product: args.approvedBaseline.product,
        mandateText: args.approvedBaseline.mandate?.mandateText || '100% Waterproof Certified',
        maxPrice: args.approvedBaseline.price
      });

      const evaluation = policyEngine.evaluateAmendment(args.approvedBaseline, {
        attributes: {
          waterproofing: aiResult.attributes.mandatorySpecStatus
        }
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              aiExtraction: aiResult,
              evaluation,
              actionRequired: evaluation.requiresConsent ? 'FREEZE_HOLD_AND_REQUEST_CONSENT' : 'PROCEED_TO_CAPTURE'
            }, null, 2)
          }
        ]
      };
    }

    if (name === 'tcc_enforce_settlement') {
      if (args.decision === 'VOID') {
        const result = await paypal.voidAuthorization(args.authorizationId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'VOIDED',
                captured: '0.00',
                httpStatus: result.status,
                receipt: `Authorization ${args.authorizationId} permanently VOIDED on PayPal rails. $0.00 released.`
              }, null, 2)
            }
          ]
        };
      } else if (args.decision === 'CAPTURE') {
        const result = await paypal.captureAuthorization(args.authorizationId, args.captureAmount, true);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'CAPTURED',
                capturedAmount: args.captureAmount,
                captureId: result.captureId,
                receipt: `Captured $${args.captureAmount} on PayPal authorization ${args.authorizationId}. Merchant paid.`
              }, null, 2)
            }
          ]
        };
      }
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `TCC Rail Enforcement Error: ${error.message}`
        }
      ]
    };
  }
});

async function runStdio() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('TCC PayPal Rails MCP Server running on stdio');
}

if (require.main === module) {
  runStdio().catch((err) => {
    console.error('Fatal MCP startup error:', err);
    process.exit(1);
  });
}

module.exports = server;
