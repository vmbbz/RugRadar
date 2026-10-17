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

## Superseded upload

The original `0.1.0` artifact (`405056` bytes, SHA-256 `8acdcd2b7c9ec8cb0ee6fb95957648608de0be0187905a6f5e871dfef367d1bd`) passed PayBox upload checks and its hosted tool call completed. That call correctly failed closed as `UNKNOWN`, but exposed an adapter defect: DEX Screener now returns some Base pool identifiers that are not 20-byte EVM addresses. Release `0.1.1` fixes that defect without weakening token-address validation. The original upload must not be submitted.

## Release-state separation

| State | Status |
|---|---|
| Local assessment implementation | Release `0.1.1` verified |
| Source pushed to GitHub | Verified for the current code-bearing commit above |
| GitHub Actions CI | Not available; first job never started because the owner account is locked due to a billing issue |
| PayBox artifact upload | Superseded `0.1.0` uploaded; `0.1.1` replacement pending |
| Hosted PayBox checks | Passed for superseded upload; replacement pending |
| Portal tool call | Succeeded for superseded upload but revealed the fixed DEX compatibility defect; replacement pending |
| Participant registration/KYC | Not separately confirmed in this workspace |
| Project submission | Not submitted |
| Private-plugin agent exercise | Pending submission |
| Public X demo | Not confirmed in this workspace |
| Guarded buy/proposal path | Not implemented and not exposed |

Do not submit the superseded artifact. Upload the current artifact, repeat hosted checks and the Base USDC tool call, and confirm `COMPLETE` coverage before accepting terms and selecting **Submit Project**.
