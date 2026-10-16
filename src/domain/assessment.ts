import { BASE_CAIP2, POLICY_VERSION } from "../config.js";
import type {
  MarketEvidence,
  ProviderResult,
  RiskAssessment,
  SourceName,
  TokenSecurityEvidence,
} from "./evidence.js";
import { evaluateRiskPolicy } from "./policy.js";
import { fetchDexScreenerToken } from "../providers/dexscreener.js";
import { fetchGoPlusToken } from "../providers/goplus.js";
import { normalizeAddress, riskAssessmentSchema } from "../schemas.js";

export interface AssessmentDependencies {
  securityProvider?: (address: string) => Promise<ProviderResult<TokenSecurityEvidence>>;
  marketProvider?: (address: string) => Promise<ProviderResult<MarketEvidence>>;
  now?: () => Date;
}

const LIMITATIONS = [
  "Automated evidence is not a smart-contract audit, financial advice, or a guarantee against loss.",
  "Provider data can be incomplete or stale, and future privileged actions can change token behavior.",
];

export async function assessTokenRisk(
  inputAddress: string,
  dependencies: AssessmentDependencies = {},
): Promise<RiskAssessment> {
  const address = normalizeAddress(inputAddress);
  const now = dependencies.now?.() ?? new Date();
  const securityProvider = dependencies.securityProvider ?? fetchGoPlusToken;
  const marketProvider = dependencies.marketProvider ?? ((value) => fetchDexScreenerToken(value, fetch, now.getTime()));
  const [security, market] = await Promise.all([
    settled("goplus", () => securityProvider(address)),
    settled("dexscreener", () => marketProvider(address)),
  ]);
  const sources = [security.source, market.source];
  const decision = evaluateRiskPolicy(security.data ?? null, market.data ?? null, sources);
  return riskAssessmentSchema.parse({
    chain: BASE_CAIP2,
    token: {
      address,
      name: security.data?.name ?? null,
      symbol: security.data?.symbol ?? null,
    },
    verdict: decision.verdict,
    policyAllowsAction: decision.verdict === "PASS",
    policyVersion: POLICY_VERSION,
    observedAt: now.toISOString(),
    blockers: decision.blockers,
    warnings: decision.warnings,
    coverage: {
      level: decision.coverageLevel,
      sources,
      gaps: decision.gaps,
    },
    evidence: {
      security: security.data ?? null,
      market: market.data ?? null,
    },
    limitations: LIMITATIONS,
  });
}

async function settled<T>(
  source: SourceName,
  operation: () => Promise<ProviderResult<T>>,
): Promise<ProviderResult<T>> {
  try {
    return await operation();
  } catch {
    return { source: { name: source, status: "HTTP_ERROR", latencyMs: 0 } };
  }
}
