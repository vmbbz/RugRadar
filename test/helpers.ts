import type { MarketEvidence, SourceObservation, TokenSecurityEvidence } from "../src/domain/evidence.js";

export const safeSecurity: TokenSecurityEvidence = {
  name: "Example Token",
  symbol: "EXM",
  openSource: true,
  proxy: false,
  trusted: false,
  honeypot: false,
  cannotBuy: false,
  cannotSellAll: false,
  buyTaxBps: 0,
  sellTaxBps: 0,
  transferTaxBps: 0,
  taxModifiable: false,
  personalTaxModifiable: false,
  hiddenOwner: false,
  ownershipReclaimable: false,
  blacklistControl: false,
  whitelistControl: false,
  mintable: false,
  transferPausable: false,
  tradingCooldown: false,
  antiWhaleModifiable: false,
  selfDestruct: false,
  externalCall: false,
};

export const safeMarket: MarketEvidence = {
  pairCount: 2,
  aggregateLiquidityUsd: 300_000,
  deepestLiquidityUsd: 250_000,
  primaryPairId: "0x1111111111111111111111111111111111111111",
  primaryDex: "example-dex",
  primaryPairAgeHours: 720,
};

export const availableSources: SourceObservation[] = [
  { name: "goplus", status: "AVAILABLE", latencyMs: 10 },
  { name: "dexscreener", status: "AVAILABLE", latencyMs: 20 },
];
