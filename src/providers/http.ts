import { MAX_PROVIDER_RESPONSE_BYTES, PROVIDER_TIMEOUT_MS } from "../config.js";
import type { SourceStatus } from "../domain/evidence.js";

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type JsonRequestResult =
  | { status: "AVAILABLE"; latencyMs: number; value: unknown }
  | { status: Exclude<SourceStatus, "AVAILABLE">; latencyMs: number; httpStatus?: number };

class InvalidResponseError extends Error {}

export async function requestJson(
  url: URL,
  fetchImpl: FetchLike = fetch,
  timeoutMs = PROVIDER_TIMEOUT_MS,
  maxBytes = MAX_PROVIDER_RESPONSE_BYTES,
): Promise<JsonRequestResult> {
  const started = performance.now();
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      const latencyMs = elapsed(started);
      if (response.status === 404) return { status: "NO_DATA", latencyMs, httpStatus: response.status };
      if (response.status === 429) return { status: "RATE_LIMITED", latencyMs, httpStatus: response.status };
      return { status: "HTTP_ERROR", latencyMs, httpStatus: response.status };
    }
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("application/json")) throw new InvalidResponseError("Expected JSON response.");
    const value = await readBoundedJson(response, maxBytes);
    return { status: "AVAILABLE", latencyMs: elapsed(started), value };
  } catch (error) {
    const latencyMs = elapsed(started);
    if (error instanceof InvalidResponseError || error instanceof SyntaxError) {
      return { status: "INVALID_RESPONSE", latencyMs };
    }
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      return { status: "TIMEOUT", latencyMs };
    }
    return { status: "HTTP_ERROR", latencyMs };
  }
}

async function readBoundedJson(response: Response, maxBytes: number): Promise<unknown> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null && /^\d+$/.test(declaredLength) && Number(declaredLength) > maxBytes) {
    throw new InvalidResponseError("Response exceeds byte limit.");
  }
  if (!response.body) throw new InvalidResponseError("Response body is missing.");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const next = await reader.read();
    if (next.done) break;
    total += next.value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new InvalidResponseError("Response exceeds byte limit.");
    }
    chunks.push(next.value);
  }
  const body = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
  return JSON.parse(body) as unknown;
}

function elapsed(started: number): number {
  return Math.max(0, Math.min(60_000, Math.round(performance.now() - started)));
}
