import * as z from "zod/v4";

import { BASE_DEXSCREENER_CHAIN } from "../config.js";
import type { MarketEvidence, ProviderResult, SourceObservation } from "../domain/evidence.js";
import { marketEvidenceSchema } from "../schemas.js";
import { requestJson, type FetchLike } from "./http.js";

const evmAddress = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const token = z.object({ address: evmAddress }).loose();
const pairSchema = z.object({
  chainId: z.string().max(32),
  dexId: z.string().max(64),
  pairAddress: evmAddress,
  baseToken: token,
  quoteToken: token,
  liquidity: z.object({ usd: z.number().finite().min(0).max(1_000_000_000_000_000).nullish() }).loose().nullish(),
  pairCreatedAt: z.number().int().min(0).max(9_999_999_999_999).nullish(),
}).loose();
const pairsSchema = z.array(pairSchema).max(256);

export async function fetchDexScreenerToken(
  address: string,
  fetchImpl: FetchLike = fetch,
  nowMs = Date.now(),
): Promise<ProviderResult<MarketEvidence>> {
  const url = new URL(`https://api.dexscreener.com/token-pairs/v1/${BASE_DEXSCREENER_CHAIN}/${address}`);
  const response = await requestJson(url, fetchImpl);
  const baseSource = { name: "dexscreener" as const, latencyMs: response.latencyMs };
  if (response.status !== "AVAILABLE") {
    return { source: { ...baseSource, status: response.status, ...httpStatus(response) } };
  }
  try {
    return {
      source: { ...baseSource, status: "AVAILABLE" },
      data: parseDexScreenerPayload(response.value, address, nowMs),
    };
  } catch {
    return { source: { ...baseSource, status: "INVALID_RESPONSE" } };
  }
}

export function parseDexScreenerPayload(payload: unknown, address: string, nowMs: number): MarketEvidence {
  const normalizedAddress = address.toLowerCase();
  const matchingPairs = pairsSchema.parse(payload).filter((pair) =>
    pair.chainId === BASE_DEXSCREENER_CHAIN &&
    (pair.baseToken.address.toLowerCase() === normalizedAddress || pair.quoteToken.address.toLowerCase() === normalizedAddress),
  );
  const ranked = [...matchingPairs].sort((left, right) => liquidity(right) - liquidity(left));
  const primary = ranked[0];
  const aggregate = matchingPairs.reduce((sum, pair) => sum + liquidity(pair), 0);
  if (!Number.isFinite(aggregate)) throw new Error("Aggregate liquidity is not finite.");

  let ageHours: number | null = null;
  if (primary?.pairCreatedAt != null) {
    ageHours = round(Math.max(0, nowMs - primary.pairCreatedAt) / 3_600_000, 1);
  }

  return marketEvidenceSchema.parse({
    pairCount: matchingPairs.length,
    aggregateLiquidityUsd: round(aggregate, 2),
    deepestLiquidityUsd: primary === undefined ? null : round(liquidity(primary), 2),
    primaryPairAddress: primary?.pairAddress.toLowerCase() ?? null,
    primaryDex: primary?.dexId ?? null,
    primaryPairAgeHours: ageHours,
  });
}

function liquidity(pair: z.infer<typeof pairSchema>): number {
  return pair.liquidity?.usd ?? 0;
}

function round(value: number, places: number): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function httpStatus(response: { httpStatus?: number }): Pick<SourceObservation, "httpStatus"> | object {
  return response.httpStatus === undefined ? {} : { httpStatus: response.httpStatus };
}
