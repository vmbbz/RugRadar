import assert from "node:assert/strict";
import test from "node:test";

import { requestJson, type FetchLike } from "../src/providers/http.js";

const URL_VALUE = new URL("https://api.example.test/value");

test("bounded JSON transport returns parsed JSON", async () => {
  const fetchImpl: FetchLike = async () => jsonResponse({ ok: true });
  const result = await requestJson(URL_VALUE, fetchImpl);
  assert.equal(result.status, "AVAILABLE");
  if (result.status === "AVAILABLE") assert.deepEqual(result.value, { ok: true });
});

test("transport maps rate limits without exposing response bodies", async () => {
  const fetchImpl: FetchLike = async () => jsonResponse({ secretLikeBody: "not returned" }, 429);
  const result = await requestJson(URL_VALUE, fetchImpl);
  assert.deepEqual({ status: result.status, httpStatus: "httpStatus" in result ? result.httpStatus : undefined }, {
    status: "RATE_LIMITED",
    httpStatus: 429,
  });
  assert.equal("value" in result, false);
});

test("transport maps not-found and server failures without response bodies", async () => {
  const notFound: FetchLike = async () => jsonResponse({ detail: "not returned" }, 404);
  const missing = await requestJson(URL_VALUE, notFound);
  assert.equal(missing.status, "NO_DATA");
  assert.equal("value" in missing, false);

  const unavailable: FetchLike = async () => jsonResponse({ detail: "not returned" }, 503);
  const failed = await requestJson(URL_VALUE, unavailable);
  assert.equal(failed.status, "HTTP_ERROR");
  assert.equal("value" in failed, false);
});

test("transport rejects malformed and oversized responses", async () => {
  const malformed: FetchLike = async () => new Response("{", { headers: { "content-type": "application/json" } });
  assert.equal((await requestJson(URL_VALUE, malformed)).status, "INVALID_RESPONSE");

  const oversized: FetchLike = async () => new Response(JSON.stringify({ value: "large" }), {
    headers: { "content-type": "application/json", "content-length": "1000" },
  });
  assert.equal((await requestJson(URL_VALUE, oversized, 100, 10)).status, "INVALID_RESPONSE");
});

test("transport enforces its timeout", async () => {
  const never: FetchLike = async (_input, init) => await new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
  });
  assert.equal((await requestJson(URL_VALUE, never, 5)).status, "TIMEOUT");
});

test("transport requires JSON and requests no redirects", async () => {
  let observedInit: RequestInit | undefined;
  const fetchImpl: FetchLike = async (_input, init) => {
    observedInit = init;
    return new Response("plain text", { headers: { "content-type": "text/plain" } });
  };
  assert.equal((await requestJson(URL_VALUE, fetchImpl)).status, "INVALID_RESPONSE");
  assert.equal(observedInit?.redirect, "error");
  assert.equal(observedInit?.method, "GET");
});

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
