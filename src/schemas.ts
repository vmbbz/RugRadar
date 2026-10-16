import * as z from "zod/v4";

const EVM_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const ZERO_ADDRESS_PATTERN = /^0x0{40}$/i;

export const tokenAddressSchema = z
  .string()
  .regex(EVM_ADDRESS_PATTERN)
  .refine((value) => !ZERO_ADDRESS_PATTERN.test(value), "Zero address is not a token contract.");

export const assessTokenInputSchema = z.object({ tokenAddress: tokenAddressSchema }).strict();

export const sourceStatusSchema = z.enum([
  "AVAILABLE",
  "NO_DATA",
  "TIMEOUT",
  "RATE_LIMITED",
  "HTTP_ERROR",
  "INVALID_RESPONSE",
]);

export const sourceObservationSchema = z.object({
  name: z.enum(["goplus", "dexscreener"]),
  status: sourceStatusSchema,
  latencyMs: z.number().int().min(0).max(60_000),
  httpStatus: z.number().int().min(100).max(599).optional(),
}).strict();

export const tokenSecurityEvidenceSchema = z.object({
  name: z.string().max(128).nullable(),
  symbol: z.string().max(64).nullable(),
  openSource: z.boolean().nullable(),
  proxy: z.boolean().nullable(),
  trusted: z.boolean().nullable(),
  honeypot: z.boolean().nullable(),
  cannotBuy: z.boolean().nullable(),
  cannotSellAll: z.boolean().nullable(),
  buyTaxBps: z.number().int().min(0).max(1_000_000).nullable(),
  sellTaxBps: z.number().int().min(0).max(1_000_000).nullable(),
  transferTaxBps: z.number().int().min(0).max(1_000_000).nullable(),
  taxModifiable: z.boolean().nullable(),
  personalTaxModifiable: z.boolean().nullable(),
  hiddenOwner: z.boolean().nullable(),
  ownershipReclaimable: z.boolean().nullable(),
  blacklistControl: z.boolean().nullable(),
  whitelistControl: z.boolean().nullable(),
  mintable: z.boolean().nullable(),
  transferPausable: z.boolean().nullable(),
  tradingCooldown: z.boolean().nullable(),
  antiWhaleModifiable: z.boolean().nullable(),
  selfDestruct: z.boolean().nullable(),
  externalCall: z.boolean().nullable(),
}).strict();

export const marketEvidenceSchema = z.object({
  pairCount: z.number().int().min(0).max(256),
  aggregateLiquidityUsd: z.number().min(0).max(1_000_000_000_000_000),
  deepestLiquidityUsd: z.number().min(0).max(1_000_000_000_000_000).nullable(),
  primaryPairAddress: tokenAddressSchema.nullable(),
  primaryDex: z.string().max(64).nullable(),
  primaryPairAgeHours: z.number().min(0).max(10_000_000).nullable(),
}).strict();

export const riskCodeSchema = z.enum([
  "HONEYPOT",
  "CLOSED_SOURCE",
  "CANNOT_BUY",
  "CANNOT_SELL_ALL",
  "HIDDEN_OWNER",
  "OWNERSHIP_RECLAIMABLE",
  "PERSONAL_TAX_MODIFIABLE",
  "MODIFIABLE_TAX",
  "TRANSFER_PAUSABLE",
  "BLACKLIST_CONTROL",
  "WHITELIST_CONTROL",
  "SELF_DESTRUCT",
  "EXCESSIVE_BUY_TAX",
  "EXCESSIVE_SELL_TAX",
  "EXCESSIVE_TRANSFER_TAX",
  "UPGRADEABLE_PROXY",
  "MINTABLE",
  "EXTERNAL_CALL",
  "TRADING_COOLDOWN",
  "ANTI_WHALE_MODIFIABLE",
  "NONZERO_BUY_TAX",
  "NONZERO_SELL_TAX",
  "NONZERO_TRANSFER_TAX",
  "NO_DEX_PAIR",
  "LOW_LIQUIDITY",
  "NEW_PRIMARY_PAIR",
  "GOPLUS_UNAVAILABLE",
  "DEXSCREENER_UNAVAILABLE",
  "CORE_FIELDS_MISSING",
]);

export const riskItemSchema = z.object({
  code: riskCodeSchema,
  severity: z.enum(["CRITICAL", "WARNING", "GAP"]),
  message: z.string().min(1).max(256),
}).strict();

export const riskAssessmentSchema = z.object({
  chain: z.literal("eip155:8453"),
  token: z.object({
    address: tokenAddressSchema,
    name: z.string().max(128).nullable(),
    symbol: z.string().max(64).nullable(),
  }).strict(),
  verdict: z.enum(["PASS", "REVIEW", "BLOCK", "UNKNOWN"]),
  policyAllowsAction: z.boolean(),
  policyVersion: z.string().min(1).max(64),
  observedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
  blockers: z.array(riskItemSchema).max(32),
  warnings: z.array(riskItemSchema).max(32),
  coverage: z.object({
    level: z.enum(["COMPLETE", "PARTIAL", "NONE"]),
    sources: z.array(sourceObservationSchema).length(2),
    gaps: z.array(riskItemSchema).max(16),
  }).strict(),
  evidence: z.object({
    security: tokenSecurityEvidenceSchema.nullable(),
    market: marketEvidenceSchema.nullable(),
  }).strict(),
  limitations: z.array(z.string().min(1).max(256)).min(1).max(8),
}).strict();

export function normalizeAddress(address: string): string {
  return tokenAddressSchema.parse(address).toLowerCase();
}
