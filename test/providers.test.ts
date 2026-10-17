import assert from "node:assert/strict";
import test from "node:test";

import { parseDexScreenerPayload } from "../src/providers/dexscreener.js";
import { parseGoPlusPayload } from "../src/providers/goplus.js";

const ADDRESS = "0x2222222222222222222222222222222222222222";

test("GoPlus normalization uses exact conservative tax conversion", () => {
  const result = parseGoPlusPayload({
    code: 1,
    result: {
      [ADDRESS]: {
        token_name: "Example\u0000 Token",
        token_symbol: "EXM",
        is_open_source: "1",
        is_proxy: "0",
        trust_list: "0",
        is_honeypot: "0",
        cannot_buy: "0",
        cannot_sell_all: "0",
        buy_tax: "0.012345",
        sell_tax: "0",
        transfer_tax: "",
        slippage_modifiable: "0",
        personal_slippage_modifiable: "0",
        hidden_owner: "0",
        can_take_back_ownership: "0",
        is_blacklisted: "0",
        is_whitelisted: "0",
        is_mintable: "0",
        transfer_pausable: "0",
        trading_cooldown: "0",
        anti_whale_modifiable: "0",
        selfdestruct: "0",
        external_call: "0",
      },
    },
  }, ADDRESS.toUpperCase().replace("0X", "0x"));
  assert.ok(result);
  assert.equal(result.name, "Example  Token");
  assert.equal(result.buyTaxBps, 124);
  assert.equal(result.transferTaxBps, null);
  assert.equal(result.honeypot, false);
});

test("GoPlus missing token record is represented as no data", () => {
  assert.equal(parseGoPlusPayload({ code: "1", result: {} }, ADDRESS), null);
});

test("GoPlus rejects malformed tax values", () => {
  assert.throws(() => parseGoPlusPayload({
    code: 1,
    result: { [ADDRESS]: { buy_tax: "NaN" } },
  }, ADDRESS));
});

test("DEX Screener normalization filters chain and token, then ranks liquidity", () => {
  const nowMs = Date.parse("2026-10-17T00:00:00.000Z");
  const result = parseDexScreenerPayload([
    pair(ADDRESS, "0x3333333333333333333333333333333333333333", "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", 75_000, nowMs - 48 * 3_600_000),
    pair("0x4444444444444444444444444444444444444444", ADDRESS, "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", 125_000, nowMs - 72 * 3_600_000),
    { ...pair(ADDRESS, "0x5555555555555555555555555555555555555555", "0xcccccccccccccccccccccccccccccccccccccccc", 1_000_000, nowMs), chainId: "ethereum" },
    pair("0x6666666666666666666666666666666666666666", "0x7777777777777777777777777777777777777777", "0xdddddddddddddddddddddddddddddddddddddddd", 1_000_000, nowMs),
  ], ADDRESS, nowMs);
  assert.equal(result.pairCount, 2);
  assert.equal(result.aggregateLiquidityUsd, 200_000);
  assert.equal(result.deepestLiquidityUsd, 125_000);
  assert.equal(result.primaryPairId, "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  assert.equal(result.primaryPairAgeHours, 72);
});

test("DEX Screener empty result is valid market evidence with no pair", () => {
  assert.deepEqual(parseDexScreenerPayload([], ADDRESS, Date.now()), {
    pairCount: 0,
    aggregateLiquidityUsd: 0,
    deepestLiquidityUsd: null,
    primaryPairId: null,
    primaryDex: null,
    primaryPairAgeHours: null,
  });
});

test("DEX Screener accepts bounded opaque pool identifiers", () => {
  const nowMs = Date.parse("2026-10-17T00:00:00.000Z");
  const bytes32Pool = "0x867dbb1b6417abcb3696d5a5d9cc38cbf9f0f6d17355515fe1c8303e791832c4";
  const compositePool = "0x0C659734f1eEF9C63B7Ebdf78a164CDd745586Db-0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913-0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA";
  const result = parseDexScreenerPayload([
    pair(ADDRESS, "0x3333333333333333333333333333333333333333", bytes32Pool, 75_000, nowMs),
    pair(ADDRESS, "0x4444444444444444444444444444444444444444", compositePool, 125_000, nowMs),
  ], ADDRESS, nowMs);
  assert.equal(result.pairCount, 2);
  assert.equal(result.primaryPairId, compositePool);
});

test("DEX Screener rejects unsafe pool identifiers", () => {
  assert.throws(() => parseDexScreenerPayload([
    pair(ADDRESS, "0x3333333333333333333333333333333333333333", "pool id with spaces", 75_000, Date.now()),
  ], ADDRESS, Date.now()));
});

function pair(base: string, quote: string, pairAddress: string, liquidityUsd: number, pairCreatedAt: number) {
  return {
    chainId: "base",
    dexId: "example-dex",
    pairAddress,
    baseToken: { address: base },
    quoteToken: { address: quote },
    liquidity: { usd: liquidityUsd },
    pairCreatedAt,
  };
}
