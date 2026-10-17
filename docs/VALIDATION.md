# RugRadar validation record

This record identifies the locally tested assessment artifact and separates verified facts from participant-controlled release gates.

## Validated source and artifact

| Field | Value |
|---|---|
| Validation time | `2026-10-16T22:43:24Z` |
| Code-bearing commit | `271f5d74f573da8d8995b1720c4f61059ad15c63` |
| Branch | `main` |
| Artifact | `dist/plugin.mjs` (generated and ignored) |
| Artifact bytes | `405056` |
| Artifact SHA-256 | `8acdcd2b7c9ec8cb0ee6fb95957648608de0be0187905a6f5e871dfef367d1bd` |
| Starter version | `1.0.2` |
| MCP protocol | `2026-07-28` |
| Runtime | Node.js `24.21.0`, Linux x64 |
| Package manager | pnpm `11.11.0` |

The remote `refs/heads/main` SHA was queried after the implementation push and exactly matched the code-bearing commit above. A later docs-only validation commit does not change the generated artifact; the final remote SHA must still be verified after that commit is pushed.

## Local evidence

| Gate | Result |
|---|---|
| Frozen lockfile install | Passed in WSL2 using the verified Linux toolchain |
| Strict TypeScript | Passed |
| Deterministic unit suite | 32 passed, 0 failed |
| Two byte-identical production builds | Passed |
| Artifact UTF-8 and size checks | Passed |
| MCP schema and protocol conformance | Passed |
| Tool discovery | 1 tool discovered |
| Live Base USDC sample call | Passed at validation time |
| Production dependency audit | No known vulnerabilities reported |
| Diff whitespace check | Passed |
| Forbidden tracked artifact scan | No `dist`, dependency, environment, key, log, temp, APK, or AAB path found |

The live sample proves connectivity only at the recorded time. It does not freeze provider data or establish that any token will retain a particular verdict.

## Release-state separation

| State | Status |
|---|---|
| Local assessment implementation | Verified |
| Source pushed to GitHub | Verified for the code-bearing commit above |
| GitHub Actions CI | Not available; first job never started because the owner account is locked due to a billing issue |
| PayBox artifact upload | Not run in this workspace |
| Hosted PayBox checks | Not run in this workspace |
| Portal tool calls | Not run in this workspace |
| Participant registration/KYC | Not confirmed in this workspace |
| Project submission | Not confirmed in this workspace |
| Private-plugin agent exercise | Not run in this workspace |
| Public X demo | Not confirmed in this workspace |
| Guarded buy/proposal path | Not implemented and not exposed |

Do not describe RugRadar as hosted, submitted, transaction-validated, or publicly demonstrated until the corresponding participant-controlled evidence is recorded.
