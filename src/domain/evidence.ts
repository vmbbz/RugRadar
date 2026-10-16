export type SourceName = "goplus" | "dexscreener";
export type SourceStatus =
  | "AVAILABLE"
  | "NO_DATA"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "HTTP_ERROR"
  | "INVALID_RESPONSE";

export interface SourceObservation {
  name: SourceName;
  status: SourceStatus;
  latencyMs: number;
  httpStatus?: number;
}

export interface ProviderResult<T> {
  source: SourceObservation;
  data?: T;
}

export interface TokenSecurityEvidence {
  name: string | null;
  symbol: string | null;
  openSource: boolean | null;
  proxy: boolean | null;
  trusted: boolean | null;
  honeypot: boolean | null;
  cannotBuy: boolean | null;
  cannotSellAll: boolean | null;
  buyTaxBps: number | null;
  sellTaxBps: number | null;
  transferTaxBps: number | null;
  taxModifiable: boolean | null;
  personalTaxModifiable: boolean | null;
  hiddenOwner: boolean | null;
  ownershipReclaimable: boolean | null;
  blacklistControl: boolean | null;
  whitelistControl: boolean | null;
  mintable: boolean | null;
  transferPausable: boolean | null;
  tradingCooldown: boolean | null;
  antiWhaleModifiable: boolean | null;
  selfDestruct: boolean | null;
  externalCall: boolean | null;
}

export interface MarketEvidence {
  pairCount: number;
  aggregateLiquidityUsd: number;
  deepestLiquidityUsd: number | null;
  primaryPairAddress: string | null;
  primaryDex: string | null;
  primaryPairAgeHours: number | null;
}

export type RiskVerdict = "PASS" | "REVIEW" | "BLOCK" | "UNKNOWN";
export type CoverageLevel = "COMPLETE" | "PARTIAL" | "NONE";
export type RiskSeverity = "CRITICAL" | "WARNING" | "GAP";

export type RiskCode =
  | "HONEYPOT"
  | "CLOSED_SOURCE"
  | "CANNOT_BUY"
  | "CANNOT_SELL_ALL"
  | "HIDDEN_OWNER"
  | "OWNERSHIP_RECLAIMABLE"
  | "PERSONAL_TAX_MODIFIABLE"
  | "MODIFIABLE_TAX"
  | "TRANSFER_PAUSABLE"
  | "BLACKLIST_CONTROL"
  | "WHITELIST_CONTROL"
  | "SELF_DESTRUCT"
  | "EXCESSIVE_BUY_TAX"
  | "EXCESSIVE_SELL_TAX"
  | "EXCESSIVE_TRANSFER_TAX"
  | "UPGRADEABLE_PROXY"
  | "MINTABLE"
  | "EXTERNAL_CALL"
  | "TRADING_COOLDOWN"
  | "ANTI_WHALE_MODIFIABLE"
  | "NONZERO_BUY_TAX"
  | "NONZERO_SELL_TAX"
  | "NONZERO_TRANSFER_TAX"
  | "NO_DEX_PAIR"
  | "LOW_LIQUIDITY"
  | "NEW_PRIMARY_PAIR"
  | "GOPLUS_UNAVAILABLE"
  | "DEXSCREENER_UNAVAILABLE"
  | "CORE_FIELDS_MISSING";

export interface RiskItem {
  code: RiskCode;
  severity: RiskSeverity;
  message: string;
}

export interface RiskAssessment {
  chain: "eip155:8453";
  token: {
    address: string;
    name: string | null;
    symbol: string | null;
  };
  verdict: RiskVerdict;
  policyAllowsAction: boolean;
  policyVersion: string;
  observedAt: string;
  blockers: RiskItem[];
  warnings: RiskItem[];
  coverage: {
    level: CoverageLevel;
    sources: SourceObservation[];
    gaps: RiskItem[];
  };
  evidence: {
    security: TokenSecurityEvidence | null;
    market: MarketEvidence | null;
  };
  limitations: string[];
}
