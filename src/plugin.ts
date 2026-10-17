import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { assessTokenInputSchema, riskAssessmentSchema } from "./schemas.js";
import { createAssessTokenRiskHandler } from "./tools/assess-token-risk.js";

const PROTOCOL_VERSION = "2026-07-28";

function createServer() {
  const server = new McpServer(
    { name: "rugradar", version: "0.1.1" },
    { supportedProtocolVersions: [PROTOCOL_VERSION] },
  );

  server.registerTool(
    "assess_token_risk",
    {
      title: "Assess Base token risk",
      description:
        "Checks a Base token against current GoPlus security evidence and DEX Screener market context. Returns PASS, REVIEW, BLOCK, or UNKNOWN with explicit reasons. PASS is not a guarantee of safety.",
      inputSchema: assessTokenInputSchema,
      outputSchema: riskAssessmentSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    createAssessTokenRiskHandler(),
  );

  return server;
}

serveStdio(createServer, { legacy: "reject" });
