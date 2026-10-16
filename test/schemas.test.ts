import assert from "node:assert/strict";
import test from "node:test";

import { assessTokenInputSchema, normalizeAddress } from "../src/schemas.js";

test("address validation accepts EVM addresses and canonicalizes comparison form", () => {
  const mixedCase = "0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD";
  assert.equal(normalizeAddress(mixedCase), mixedCase.toLowerCase());
});

test("address validation rejects malformed and zero addresses", () => {
  for (const value of [
    "",
    "0x1234",
    "0xgggggggggggggggggggggggggggggggggggggggg",
    "0x0000000000000000000000000000000000000000",
  ]) {
    assert.throws(() => normalizeAddress(value), value);
  }
});

test("tool input rejects unknown fields", () => {
  assert.throws(() => assessTokenInputSchema.parse({
    tokenAddress: "0x1111111111111111111111111111111111111111",
    providerUrl: "https://attacker.invalid",
  }));
});
