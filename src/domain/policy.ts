import {
  BLOCK_TAX_BPS,
  MIN_DEEPEST_LIQUIDITY_USD,
  MIN_PRIMARY_PAIR_AGE_HOURS,
  REVIEW_TAX_BPS,
} from "../config.js";
import type {
  CoverageLevel,
  MarketEvidence,
  RiskCode,
  RiskItem,
  RiskVerdict,
  SourceObservation,
  TokenSecurityEvidence,
} from "./evidence.js";

export interface PolicyDecision {
  verdict: RiskVerdict;
  blockers: RiskItem[];
  warnings: RiskItem[];
  gaps: RiskItem[];
  coverageLevel: CoverageLevel;
}

export function evaluateRiskPolicy(
  security: TokenSecurityEvidence | null,
  market: MarketEvidence | null,
  sources: SourceObservation[],
): PolicyDecision {
  const blockers: RiskItem[] = [];
  const warnings: RiskItem[] = [];
  const gaps: RiskItem[] = [];
  const goPlus = sources.find((source) => source.name === "goplus");
  const dexScreener = sources.find((source) => source.name === "dexscreener");

  if (goPlus?.status !== "AVAILABLE" || security === null) {
    gaps.push(gap("GOPLUS_UNAVAILABLE", `GoPlus security evidence is unavailable (${goPlus?.status ?? "missing"}).`));
  }
  if (dexScreener?.status !== "AVAILABLE" || market === null) {
    gaps.push(gap("DEXSCREENER_UNAVAILABLE", `DEX Screener market context is unavailable (${dexScreener?.status ?? "missing"}).`));
  }

  if (security !== null) {
    addCritical(blockers, security.honeypot === true, "HONEYPOT", "GoPlus reports honeypot behavior.");
    addCritical(blockers, security.openSource === false, "CLOSED_SOURCE", "The contract source is not verified; dependent checks may be incomplete.");
    addCritical(blockers, security.cannotBuy === true, "CANNOT_BUY", "The token reports a buy restriction.");
    addCritical(blockers, security.cannotSellAll === true, "CANNOT_SELL_ALL", "Holders may be unable to sell their full balance.");
    addCritical(blockers, security.hiddenOwner === true, "HIDDEN_OWNER", "The contract has a hidden owner mechanism.");
    addCritical(blockers, security.ownershipReclaimable === true, "OWNERSHIP_RECLAIMABLE", "Ownership can be reclaimed after apparent renunciation.");
    addCritical(blockers, security.personalTaxModifiable === true, "PERSONAL_TAX_MODIFIABLE", "The owner can set address-specific trading tax.");
    addCritical(blockers, security.taxModifiable === true, "MODIFIABLE_TAX", "Trading tax can be modified by the token's controller.");
    addCritical(blockers, security.transferPausable === true, "TRANSFER_PAUSABLE", "Token transfers can be paused.");
    addCritical(blockers, security.blacklistControl === true, "BLACKLIST_CONTROL", "The contract can blacklist selected addresses.");
    addCritical(blockers, security.whitelistControl === true, "WHITELIST_CONTROL", "The contract can restrict trading to selected addresses.");
    addCritical(blockers, security.selfDestruct === true, "SELF_DESTRUCT", "The contract exposes self-destruct behavior.");
    addCritical(blockers, above(security.buyTaxBps, BLOCK_TAX_BPS), "EXCESSIVE_BUY_TAX", `Buy tax exceeds ${BLOCK_TAX_BPS} bps.`);
    addCritical(blockers, above(security.sellTaxBps, BLOCK_TAX_BPS), "EXCESSIVE_SELL_TAX", `Sell tax exceeds ${BLOCK_TAX_BPS} bps.`);
    addCritical(blockers, above(security.transferTaxBps, BLOCK_TAX_BPS), "EXCESSIVE_TRANSFER_TAX", `Transfer tax exceeds ${BLOCK_TAX_BPS} bps.`);

    const required: Array<keyof TokenSecurityEvidence> = ["openSource", "honeypot", "buyTaxBps", "sellTaxBps"];
    if (security.trusted !== true) {
      required.push(
        "cannotBuy",
        "cannotSellAll",
        "hiddenOwner",
        "ownershipReclaimable",
        "taxModifiable",
        "personalTaxModifiable",
        "blacklistControl",
        "whitelistControl",
        "transferPausable",
      );
    }
    const missing = required.filter((field) => security[field] === null);
    if (missing.length > 0) {
      gaps.push(gap("CORE_FIELDS_MISSING", `Required security fields are unknown: ${missing.join(", ")}.`));
    }

    addWarning(warnings, security.proxy === true && security.trusted !== true, "UPGRADEABLE_PROXY", "The token uses a proxy or delegated implementation path.");
    addWarning(warnings, security.mintable === true, "MINTABLE", "Additional token supply can be minted.");
    addWarning(warnings, security.externalCall === true, "EXTERNAL_CALL", "Token behavior can call an external contract.");
    addWarning(warnings, security.tradingCooldown === true, "TRADING_COOLDOWN", "The token imposes a trading cooldown.");
    addWarning(warnings, security.antiWhaleModifiable === true, "ANTI_WHALE_MODIFIABLE", "Anti-whale limits can be modified.");
    addWarning(warnings, between(security.buyTaxBps, REVIEW_TAX_BPS, BLOCK_TAX_BPS), "NONZERO_BUY_TAX", `Buy tax is ${security.buyTaxBps ?? 0} bps.`);
    addWarning(warnings, between(security.sellTaxBps, REVIEW_TAX_BPS, BLOCK_TAX_BPS), "NONZERO_SELL_TAX", `Sell tax is ${security.sellTaxBps ?? 0} bps.`);
    addWarning(warnings, between(security.transferTaxBps, REVIEW_TAX_BPS, BLOCK_TAX_BPS), "NONZERO_TRANSFER_TAX", `Transfer tax is ${security.transferTaxBps ?? 0} bps.`);
  }

  if (market !== null) {
    addWarning(warnings, market.pairCount === 0, "NO_DEX_PAIR", "DEX Screener returned no Base trading pair for this token.");
    addWarning(
      warnings,
      market.deepestLiquidityUsd !== null && market.deepestLiquidityUsd < MIN_DEEPEST_LIQUIDITY_USD,
      "LOW_LIQUIDITY",
      `Deepest reported liquidity is below $${MIN_DEEPEST_LIQUIDITY_USD}.`,
    );
    addWarning(
      warnings,
      market.primaryPairAgeHours !== null && market.primaryPairAgeHours < MIN_PRIMARY_PAIR_AGE_HOURS,
      "NEW_PRIMARY_PAIR",
      `The deepest pair is less than ${MIN_PRIMARY_PAIR_AGE_HOURS} hours old.`,
    );
  }

  const coverageLevel = coverage(sources);
  const verdict: RiskVerdict = blockers.length > 0
    ? "BLOCK"
    : gaps.length > 0
      ? "UNKNOWN"
      : warnings.length > 0
        ? "REVIEW"
        : "PASS";
  return { verdict, blockers, warnings, gaps, coverageLevel };
}

function addCritical(target: RiskItem[], condition: boolean, code: RiskCode, message: string): void {
  if (condition) target.push({ code, severity: "CRITICAL", message });
}

function addWarning(target: RiskItem[], condition: boolean, code: RiskCode, message: string): void {
  if (condition) target.push({ code, severity: "WARNING", message });
}

function gap(code: RiskCode, message: string): RiskItem {
  return { code, severity: "GAP", message };
}

function above(value: number | null, ceiling: number): boolean {
  return value !== null && value > ceiling;
}

function between(value: number | null, floor: number, inclusiveCeiling: number): boolean {
  return value !== null && value >= floor && value <= inclusiveCeiling;
}

function coverage(sources: SourceObservation[]): CoverageLevel {
  const available = sources.filter((source) => source.status === "AVAILABLE").length;
  if (available === 2) return "COMPLETE";
  if (available === 1) return "PARTIAL";
  return "NONE";
}
