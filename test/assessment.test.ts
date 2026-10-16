import assert from "node:assert/strict";
import test from "node:test";

import { assessTokenRisk } from "../src/domain/assessment.js";
import { createAssessTokenRiskHandler } from "../src/tools/assess-token-risk.js";
import { safeMarket, safeSecurity } from "./helpers.js";

const ADDRESS = "0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD";
const NORMALIZED = ADDRESS.toLowerCase();
const NOW = new Date("2026-10-17T00:00:00.000Z");

test("assessment binds normalized address, evidence, policy, and timestamp", async () => {
  const assessment = await assessTokenRisk(ADDRESS, dependencies());
  assert.equal(assessment.token.address, NORMALIZED);
  assert.equal(assessment.verdict, "PASS");
  assert.equal(assessment.policyAllowsAction, true);
  assert.equal(assessment.observedAt, NOW.toISOString());
  assert.deepEqual(assessment.coverage.sources.map((source) => source.name), ["goplus", "dexscreener"]);
});

test("unexpected provider rejection becomes a fail-closed unknown result", async () => {
  const assessment = await assessTokenRisk(ADDRESS, {
    ...dependencies(),
    securityProvider: async () => { throw new Error("provider detail must not escape"); },
  });
  assert.equal(assessment.verdict, "UNKNOWN");
  assert.equal(assessment.policyAllowsAction, false);
  assert.equal(assessment.coverage.sources[0]?.status, "HTTP_ERROR");
  assert.equal(JSON.stringify(assessment).includes("provider detail"), false);
});

test("tool handler returns matching structured and human-readable results", async () => {
  const result = await createAssessTokenRiskHandler(dependencies())({ tokenAddress: ADDRESS });
  assert.equal(result.structuredContent.verdict, "PASS");
  assert.match(result.content[0]?.text ?? "", /RugRadar assessment/);
  assert.match(result.content[0]?.text ?? "", /not a guarantee/);
});

test("zero address is rejected before providers are called", async () => {
  await assert.rejects(() => assessTokenRisk("0x0000000000000000000000000000000000000000", dependencies()));
});

function dependencies() {
  return {
    now: () => NOW,
    securityProvider: async () => ({
      source: { name: "goplus" as const, status: "AVAILABLE" as const, latencyMs: 10 },
      data: safeSecurity,
    }),
    marketProvider: async () => ({
      source: { name: "dexscreener" as const, status: "AVAILABLE" as const, latencyMs: 20 },
      data: safeMarket,
    }),
  };
}
