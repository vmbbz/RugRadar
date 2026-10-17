# RugRadar validation record

This record identifies the currently tested assessment artifact and separates verified facts from participant-controlled release gates.

## Current validated source and artifact

| Field | Value |
|---|---|
| Release | `0.1.1` |
| Policy | `2026-10-17.2` |
| Validation time | `2026-10-17T08:28:26Z` |
| Code-bearing commit | `528cf9156bb8f5addfae7b4ac7d1e0f1e17c408d` |
| Branch | `main` |
| Artifact | `dist/plugin.mjs` (generated and ignored) |
| Artifact bytes | `405108` |
| Artifact SHA-256 | `baa4541d1daa6d763d86f29c5ec45d3323be865d985f3962dead8bb0630b05da` |
| Starter version | `1.0.2` |
| MCP protocol | `2026-07-28` |
| Runtime | Node.js `24.21.0`, Linux x64 |
| Package manager | pnpm `11.11.0` |

The remote `refs/heads/main` SHA was queried after the fix push and exactly matched the code-bearing commit above. A later docs-only validation commit does not change the generated artifact; the final remote SHA must still be verified after that commit is pushed.

## Local evidence

| Gate | Result |
|---|---|
| Frozen lockfile install | Passed in WSL2 using the verified Linux toolchain |
| Strict TypeScript | Passed |
| Deterministic unit suite | 34 passed, 0 failed |
| Opaque DEX pool-ID regressions | 20-byte, 32-byte, and composite identifiers accepted; unsafe identifiers rejected |
| Two byte-identical production builds | Passed |
| Artifact UTF-8 and size checks | Passed |
| MCP schema and protocol conformance | Passed |
| Tool discovery | 1 tool discovered |
| Live Base USDC assessment | `PASS`, `COMPLETE`; GoPlus and DEX Screener both `AVAILABLE` at validation time |
| Production dependency audit | No known vulnerabilities reported |
| Diff whitespace check | Passed |
| Forbidden tracked artifact scan | No `dist`, dependency, environment, key, log, temp, APK, or AAB path found |

The live sample proves connectivity only at the recorded time. It does not freeze provider data or establish that any token will retain a particular verdict.

## Hosted PayBox evidence

The replacement `0.1.1` upload was exercised through the PayBox developer portal at `2026-10-17T08:36:00.743Z` using Base USDC (`0x833589fcd6edb6e08f4c7c32d4f71b54bda02913`). The schema-valid result reported:

- server version `0.1.1` and policy `2026-10-17.2`;
- `PASS` with `policyAllowsAction: true`;
- `COMPLETE` coverage;
- GoPlus `AVAILABLE` in 523 ms;
- DEX Screener `AVAILABLE` in 197 ms;
- 30 matching Base pairs, no blockers, no warnings, and no evidence gaps; and
- `isError: false`.

This proves the replacement's hosted read-only path worked for that invocation. It does not turn `PASS` into a safety guarantee or prove future provider availability.

## Submission evidence

At `2026-10-17T08:41:19Z`, the participant supplied a portal screenshot showing:

- the project status badge `Submitted`;
- the confirmation “RugRadar was submitted. Your hackathon entry is complete”;
- the project marked available in PayBox for private testing while under review; and
- the replacement hosted test result still visible with `PASS`, policy `2026-10-17.2`, and server version `0.1.1`.

This establishes hackathon submission for the tested replacement. It does not establish public marketplace approval or private agent invocation.

## Private enablement evidence

The participant supplied PayBox plugin screens showing acceptance and successful private enablement of the submitted version:

- PayBox version ID `4ff6a720-9ee0-4ce1-821a-251d827270d7`;
- bundle SHA-256 `baa4541d1daa6d763d86f29c5ec45d3323be865d985f3962dead8bb0630b05da`, exactly matching the locally validated artifact;
- network access limited to `api.dexscreener.com` and `api.gopluslabs.io`;
- no developer-provided credentials or environment settings;
- tool `assess_token_risk`; and
- status `Unofficial plugin · Enabled`, private to the participant's account.

This proves the intended reviewed bytes and permissions were enabled privately. An invocation through an agent remains separate evidence.

## Superseded upload

The original `0.1.0` artifact (`405056` bytes, SHA-256 `8acdcd2b7c9ec8cb0ee6fb95957648608de0be0187905a6f5e871dfef367d1bd`) passed PayBox upload checks and its hosted tool call completed. That call correctly failed closed as `UNKNOWN`, but exposed an adapter defect: DEX Screener now returns some Base pool identifiers that are not 20-byte EVM addresses. Release `0.1.1` fixes that defect without weakening token-address validation. The original upload must not be submitted.

## Release-state separation

| State | Status |
|---|---|
| Local assessment implementation | Release `0.1.1` verified |
| Source pushed to GitHub | Verified for the current code-bearing commit above |
| GitHub Actions CI | Not available; first job never started because the owner account is locked due to a billing issue |
| PayBox artifact upload | Release `0.1.1` uploaded as the replacement |
| Hosted PayBox checks | Replacement loaded and exposed the expected tool; portal tool execution succeeded |
| Portal tool call | Release `0.1.1` returned `PASS` with `COMPLETE` coverage and both providers `AVAILABLE` |
| Participant registration/KYC | Not separately confirmed in this workspace |
| Project submission | Confirmed submitted in the PayBox portal |
| Private plugin enablement | Confirmed for the exact validated bundle hash and intended permissions |
| Private-plugin agent invocation | Pending |
| Public X demo | Not confirmed in this workspace |
| Guarded buy/proposal path | Not implemented and not exposed |

The submitted replacement is privately enabled. Discover its installed identifiers, invoke it through an agent, and record that result separately.
