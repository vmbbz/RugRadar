import assert from "node:assert/strict";
import test from "node:test";

import { evaluateRiskPolicy } from "../src/domain/policy.js";
import { availableSources, safeMarket, safeSecurity } from "./helpers.js";

test("complete clean evidence passes policy", () => {
  const result = evaluateRiskPolicy(safeSecurity, safeMarket, availableSources);
  assert.equal(result.verdict, "PASS");
  assert.equal(result.coverageLevel, "COMPLETE");
  assert.deepEqual(result.blockers, []);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.gaps, []);
});

test("explicit critical evidence blocks even when another provider is unavailable", () => {
  const sources = [
    availableSources[0]!,
    { name: "dexscreener" as const, status: "TIMEOUT" as const, latencyMs: 3_500 },
  ];
  const result = evaluateRiskPolicy({ ...safeSecurity, honeypot: true }, null, sources);
  assert.equal(result.verdict, "BLOCK");
  assert.equal(result.blockers[0]?.code, "HONEYPOT");
  assert.equal(result.gaps[0]?.code, "DEXSCREENER_UNAVAILABLE");
});

test("missing GoPlus evidence is unknown rather than safe", () => {
  const sources = [
    { name: "goplus" as const, status: "RATE_LIMITED" as const, latencyMs: 50, httpStatus: 429 },
    availableSources[1]!,
  ];
  const result = evaluateRiskPolicy(null, safeMarket, sources);
  assert.equal(result.verdict, "UNKNOWN");
  assert.equal(result.coverageLevel, "PARTIAL");
  assert.equal(result.gaps[0]?.code, "GOPLUS_UNAVAILABLE");
});

test("missing critical fields for an untrusted token is unknown", () => {
  const result = evaluateRiskPolicy({ ...safeSecurity, hiddenOwner: null }, safeMarket, availableSources);
  assert.equal(result.verdict, "UNKNOWN");
  assert.equal(result.gaps[0]?.code, "CORE_FIELDS_MISSING");
  assert.match(result.gaps[0]?.message ?? "", /hiddenOwner/);
});

test("a trusted proxy can pass when provider-dependent privilege fields are absent", () => {
  const result = evaluateRiskPolicy({
    ...safeSecurity,
    proxy: true,
    trusted: true,
    hiddenOwner: null,
    ownershipReclaimable: null,
    taxModifiable: null,
    personalTaxModifiable: null,
    blacklistControl: null,
    whitelistControl: null,
    transferPausable: null,
    cannotSellAll: null,
  }, safeMarket, availableSources);
  assert.equal(result.verdict, "PASS");
});

test("an untrusted proxy requires review", () => {
  const result = evaluateRiskPolicy({ ...safeSecurity, proxy: true }, safeMarket, availableSources);
  assert.equal(result.verdict, "REVIEW");
  assert.equal(result.warnings[0]?.code, "UPGRADEABLE_PROXY");
});

test("low liquidity and a new pair require review", () => {
  const result = evaluateRiskPolicy({ ...safeSecurity }, {
    ...safeMarket,
    deepestLiquidityUsd: 49_999,
    primaryPairAgeHours: 23.9,
  }, availableSources);
  assert.equal(result.verdict, "REVIEW");
  assert.deepEqual(result.warnings.map((warning) => warning.code), ["LOW_LIQUIDITY", "NEW_PRIMARY_PAIR"]);
});

test("tax thresholds distinguish review from block", () => {
  const review = evaluateRiskPolicy({ ...safeSecurity, sellTaxBps: 1_000 }, safeMarket, availableSources);
  assert.equal(review.verdict, "REVIEW");
  assert.equal(review.warnings[0]?.code, "NONZERO_SELL_TAX");

  const block = evaluateRiskPolicy({ ...safeSecurity, sellTaxBps: 1_001 }, safeMarket, availableSources);
  assert.equal(block.verdict, "BLOCK");
  assert.equal(block.blockers[0]?.code, "EXCESSIVE_SELL_TAX");

  const transferBlock = evaluateRiskPolicy({ ...safeSecurity, transferTaxBps: 1_001 }, safeMarket, availableSources);
  assert.equal(transferBlock.verdict, "BLOCK");
  assert.equal(transferBlock.blockers[0]?.code, "EXCESSIVE_TRANSFER_TAX");
});

test("provider trust does not bypass explicit modifiable tax evidence", () => {
  const result = evaluateRiskPolicy({ ...safeSecurity, trusted: true, taxModifiable: true }, safeMarket, availableSources);
  assert.equal(result.verdict, "BLOCK");
  assert.equal(result.blockers[0]?.code, "MODIFIABLE_TAX");
});

test("every boolean critical signal deterministically blocks", () => {
  const cases = [
    ["honeypot", "HONEYPOT"],
    ["cannotBuy", "CANNOT_BUY"],
    ["cannotSellAll", "CANNOT_SELL_ALL"],
    ["hiddenOwner", "HIDDEN_OWNER"],
    ["ownershipReclaimable", "OWNERSHIP_RECLAIMABLE"],
    ["personalTaxModifiable", "PERSONAL_TAX_MODIFIABLE"],
    ["taxModifiable", "MODIFIABLE_TAX"],
    ["transferPausable", "TRANSFER_PAUSABLE"],
    ["blacklistControl", "BLACKLIST_CONTROL"],
    ["whitelistControl", "WHITELIST_CONTROL"],
    ["selfDestruct", "SELF_DESTRUCT"],
  ] as const;

  for (const [field, code] of cases) {
    const result = evaluateRiskPolicy({ ...safeSecurity, [field]: true }, safeMarket, availableSources);
    assert.equal(result.verdict, "BLOCK", field);
    assert.equal(result.blockers[0]?.code, code, field);
  }

  const closedSource = evaluateRiskPolicy({ ...safeSecurity, openSource: false }, safeMarket, availableSources);
  assert.equal(closedSource.verdict, "BLOCK");
  assert.equal(closedSource.blockers[0]?.code, "CLOSED_SOURCE");
});

test("every non-tax boolean review signal deterministically reviews", () => {
  const cases = [
    ["mintable", "MINTABLE"],
    ["externalCall", "EXTERNAL_CALL"],
    ["tradingCooldown", "TRADING_COOLDOWN"],
    ["antiWhaleModifiable", "ANTI_WHALE_MODIFIABLE"],
  ] as const;

  for (const [field, code] of cases) {
    const result = evaluateRiskPolicy({ ...safeSecurity, [field]: true }, safeMarket, availableSources);
    assert.equal(result.verdict, "REVIEW", field);
    assert.equal(result.warnings[0]?.code, code, field);
  }
});

test("buy, sell, and transfer tax use the same conservative boundaries", () => {
  const cases = [
    ["buyTaxBps", "NONZERO_BUY_TAX", "EXCESSIVE_BUY_TAX"],
    ["sellTaxBps", "NONZERO_SELL_TAX", "EXCESSIVE_SELL_TAX"],
    ["transferTaxBps", "NONZERO_TRANSFER_TAX", "EXCESSIVE_TRANSFER_TAX"],
  ] as const;

  for (const [field, reviewCode, blockCode] of cases) {
    const zero = evaluateRiskPolicy({ ...safeSecurity, [field]: 0 }, safeMarket, availableSources);
    assert.equal(zero.verdict, "PASS", `${field}: zero`);

    const minimum = evaluateRiskPolicy({ ...safeSecurity, [field]: 1 }, safeMarket, availableSources);
    assert.equal(minimum.verdict, "REVIEW", `${field}: minimum`);
    assert.equal(minimum.warnings[0]?.code, reviewCode, `${field}: minimum`);

    const ceiling = evaluateRiskPolicy({ ...safeSecurity, [field]: 1_000 }, safeMarket, availableSources);
    assert.equal(ceiling.verdict, "REVIEW", `${field}: ceiling`);
    assert.equal(ceiling.warnings[0]?.code, reviewCode, `${field}: ceiling`);

    const excessive = evaluateRiskPolicy({ ...safeSecurity, [field]: 1_001 }, safeMarket, availableSources);
    assert.equal(excessive.verdict, "BLOCK", `${field}: excessive`);
    assert.equal(excessive.blockers[0]?.code, blockCode, `${field}: excessive`);
  }
});

test("market edge cases review while exact thresholds pass", () => {
  const noPair = evaluateRiskPolicy({ ...safeSecurity }, {
    ...safeMarket,
    pairCount: 0,
    aggregateLiquidityUsd: 0,
    deepestLiquidityUsd: null,
    primaryPairAddress: null,
    primaryDex: null,
    primaryPairAgeHours: null,
  }, availableSources);
  assert.equal(noPair.verdict, "REVIEW");
  assert.equal(noPair.warnings[0]?.code, "NO_DEX_PAIR");

  const thresholds = evaluateRiskPolicy({ ...safeSecurity }, {
    ...safeMarket,
    deepestLiquidityUsd: 50_000,
    primaryPairAgeHours: 24,
  }, availableSources);
  assert.equal(thresholds.verdict, "PASS");
});

test("coverage level is none when neither source is available", () => {
  const result = evaluateRiskPolicy(null, null, [
    { name: "goplus", status: "TIMEOUT", latencyMs: 3_500 },
    { name: "dexscreener", status: "HTTP_ERROR", latencyMs: 50, httpStatus: 503 },
  ]);
  assert.equal(result.verdict, "UNKNOWN");
  assert.equal(result.coverageLevel, "NONE");
  assert.deepEqual(result.gaps.map((entry) => entry.code), ["GOPLUS_UNAVAILABLE", "DEXSCREENER_UNAVAILABLE"]);
});
