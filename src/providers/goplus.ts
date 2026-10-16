import * as z from "zod/v4";

import { BASE_CHAIN_ID } from "../config.js";
import type { ProviderResult, SourceObservation, TokenSecurityEvidence } from "../domain/evidence.js";
import { tokenSecurityEvidenceSchema } from "../schemas.js";
import { requestJson, type FetchLike } from "./http.js";

const flag = z.union([z.literal("0"), z.literal("1"), z.literal("")]).nullish();
const decimal = z.string().max(128).nullish();
const shortText = z.string().max(128).nullish();

const tokenSchema = z.object({
  token_name: shortText,
  token_symbol: z.string().max(64).nullish(),
  is_open_source: flag,
  is_proxy: flag,
  trust_list: flag,
  is_honeypot: flag,
  cannot_buy: flag,
  cannot_sell_all: flag,
  buy_tax: decimal,
  sell_tax: decimal,
  transfer_tax: decimal,
  slippage_modifiable: flag,
  personal_slippage_modifiable: flag,
  hidden_owner: flag,
  can_take_back_ownership: flag,
  is_blacklisted: flag,
  is_whitelisted: flag,
  is_mintable: flag,
  transfer_pausable: flag,
  trading_cooldown: flag,
  anti_whale_modifiable: flag,
  selfdestruct: flag,
  external_call: flag,
}).loose();

const envelopeSchema = z.object({
  code: z.union([z.number().int(), z.string().max(32)]),
  result: z.record(z.string(), z.unknown()).optional(),
}).loose();

export async function fetchGoPlusToken(
  address: string,
  fetchImpl: FetchLike = fetch,
): Promise<ProviderResult<TokenSecurityEvidence>> {
  const url = new URL(`https://api.gopluslabs.io/api/v1/token_security/${BASE_CHAIN_ID}`);
  url.searchParams.set("contract_addresses", address);
  const response = await requestJson(url, fetchImpl);
  const baseSource = { name: "goplus" as const, latencyMs: response.latencyMs };
  if (response.status !== "AVAILABLE") {
    return { source: { ...baseSource, status: response.status, ...httpStatus(response) } };
  }

  try {
    const data = parseGoPlusPayload(response.value, address);
    if (data === null) return { source: { ...baseSource, status: "NO_DATA" } };
    return { source: { ...baseSource, status: "AVAILABLE" }, data };
  } catch {
    return { source: { ...baseSource, status: "INVALID_RESPONSE" } };
  }
}

export function parseGoPlusPayload(payload: unknown, address: string): TokenSecurityEvidence | null {
  const envelope = envelopeSchema.parse(payload);
  if (String(envelope.code) !== "1" || envelope.result === undefined) {
    throw new Error("GoPlus returned a non-success envelope.");
  }
  const record = envelope.result[address.toLowerCase()];
  if (record === undefined || record === null) return null;
  const token = tokenSchema.parse(record);
  return tokenSecurityEvidenceSchema.parse({
    name: cleanText(token.token_name),
    symbol: cleanText(token.token_symbol),
    openSource: parseFlag(token.is_open_source),
    proxy: parseFlag(token.is_proxy),
    trusted: parseFlag(token.trust_list),
    honeypot: parseFlag(token.is_honeypot),
    cannotBuy: parseFlag(token.cannot_buy),
    cannotSellAll: parseFlag(token.cannot_sell_all),
    buyTaxBps: parseTaxBps(token.buy_tax),
    sellTaxBps: parseTaxBps(token.sell_tax),
    transferTaxBps: parseTaxBps(token.transfer_tax),
    taxModifiable: parseFlag(token.slippage_modifiable),
    personalTaxModifiable: parseFlag(token.personal_slippage_modifiable),
    hiddenOwner: parseFlag(token.hidden_owner),
    ownershipReclaimable: parseFlag(token.can_take_back_ownership),
    blacklistControl: parseFlag(token.is_blacklisted),
    whitelistControl: parseFlag(token.is_whitelisted),
    mintable: parseFlag(token.is_mintable),
    transferPausable: parseFlag(token.transfer_pausable),
    tradingCooldown: parseFlag(token.trading_cooldown),
    antiWhaleModifiable: parseFlag(token.anti_whale_modifiable),
    selfDestruct: parseFlag(token.selfdestruct),
    externalCall: parseFlag(token.external_call),
  });
}

function parseFlag(value: "0" | "1" | "" | null | undefined): boolean | null {
  if (value === "1") return true;
  if (value === "0") return false;
  return null;
}

function parseTaxBps(value: string | null | undefined): number | null {
  if (value === undefined || value === null || value === "") return null;
  const match = /^(0|[1-9]\d*)(?:\.(\d+))?$/.exec(value);
  if (!match) throw new Error("Invalid tax fraction.");
  const whole = match[1] ?? "0";
  const fraction = match[2] ?? "";
  const denominator = 10n ** BigInt(fraction.length);
  const numerator = BigInt(whole) * denominator + BigInt(fraction || "0");
  const bps = (numerator * 10_000n + denominator - 1n) / denominator;
  if (bps > 1_000_000n) throw new Error("Tax fraction exceeds supported range.");
  return Number(bps);
}

function cleanText(value: string | null | undefined): string | null {
  const cleaned = value?.replace(/[\u0000-\u001f\u007f]/g, " ").trim() ?? "";
  return cleaned.length === 0 ? null : cleaned;
}

function httpStatus(response: { httpStatus?: number }): Pick<SourceObservation, "httpStatus"> | object {
  return response.httpStatus === undefined ? {} : { httpStatus: response.httpStatus };
}
