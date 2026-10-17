# RugRadar operator runbook

This runbook covers the assessment-only v0.1.0 release candidate. It separates local proof from hosted PayBox proof and from project submission.

## 1. Supported release surface

- Tool: `assess_token_risk`
- Chain: Base mainnet (`eip155:8453`)
- Network hosts: `api.gopluslabs.io`, `api.dexscreener.com`
- Secrets: none
- Transaction capability: none
- Policy: `2026-10-17.1`

Do not add `api.0x.org`, a wallet credential, RPC credential, or signing secret for this release candidate. The bundled starter transaction helpers are not registered as tools.

## 2. Prerequisites

Use Linux or WSL2 with the versions pinned in `starter-version.json`:

- Node.js 24.21.0
- pnpm 11.11.0

Confirm the environment before installing:

```bash
node --version
pnpm --version
uname -s
uname -m
```

Expected values are `v24.21.0`, `11.11.0`, `Linux`, and `x86_64`. Do not use a Windows package manager binary through WSL; `command -v node` and `command -v pnpm` should resolve to Linux executables.

## 3. Clean install and validation

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run unit
pnpm test
git diff --check
git status --short
```

`pnpm test` performs the following:

1. runs the deterministic unit suite;
2. type-checks the project;
3. builds `dist/plugin.mjs` twice and compares its SHA-256 and byte count;
4. validates UTF-8 and the 10 MiB artifact ceiling;
5. validates MCP schemas and protocol behavior;
6. discovers `assess_token_risk`; and
7. calls the Base USDC sample from `paybox-plugin.json`.

The sample call is a live integration check. A provider outage or rate limit should produce a schema-valid `UNKNOWN`; diagnose source status rather than weakening policy. A protocol, startup, output-schema, or total operation-time failure still fails conformance.

To calculate the final artifact identity independently:

```bash
sha256sum dist/plugin.mjs
wc -c dist/plugin.mjs
```

Never commit `dist/`, `node_modules/`, logs, `.env` files, APK/AAB files, caches, or temporary downloads.

GitHub Actions is not an active release gate: the first attempted job was prevented from starting by an owner-account billing lock. The unverified workflow was removed so the repository does not claim CI evidence it does not have. After the owner resolves the account state, restore a read-only Linux workflow using the pinned toolchain; CI remains supporting evidence, not a replacement for local artifact reproduction or PayBox hosted checks.

## 4. Tool behavior

Example input:

```json
{
  "tokenAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
}
```

The address must be a nonzero 20-byte EVM address. RugRadar returns its canonical lowercase comparison form. Names and symbols are informational only; contract address plus fixed chain are the identity.

Verdict precedence is:

1. explicit critical signal → `BLOCK`;
2. otherwise any required evidence gap → `UNKNOWN`;
3. otherwise any review signal → `REVIEW`;
4. otherwise → `PASS`.

An explicit blocker remains `BLOCK` even if the other provider is unavailable. Only `PASS` sets `policyAllowsAction: true`, and this version has no action tool.

Current thresholds:

| Condition | Result |
|---|---|
| Buy, sell, or transfer tax = 0 bps | No tax finding |
| Tax from 1 through 1,000 bps | `REVIEW` |
| Tax above 1,000 bps | `BLOCK` |
| Deepest Base pair liquidity below USD 50,000 | `REVIEW` |
| Deepest Base pair age below 24 hours | `REVIEW` |
| No matching Base DEX pair | `REVIEW` |

GoPlus `trust_list: 1` permits a narrow coverage exception for proxy-dependent privilege fields that GoPlus omits on known trusted proxies. It never overrides an explicit adverse value, closed source, honeypot result, or excessive tax.

## 5. Source status and troubleshooting

| Status | Meaning | Operator response |
|---|---|---|
| `AVAILABLE` | Response parsed and normalized | Inspect evidence and verdict normally. |
| `NO_DATA` | Endpoint or token record was absent | Treat as `UNKNOWN`; verify address and retry later. |
| `TIMEOUT` | The 3.5-second budget expired | Check hosted egress and provider health; do not increase blindly. |
| `RATE_LIMITED` | Provider returned HTTP 429 | Wait for quota recovery; do not add internal retries. |
| `HTTP_ERROR` | Transport or non-special HTTP failure | Check host allowlist, TLS/DNS, and provider status. |
| `INVALID_RESPONSE` | Content type, byte bound, JSON, or schema failed | Suspect schema drift or a provider fault; review before adapting. |

Common checks:

- If both providers fail only in PayBox, confirm exactly the two documented hosts are allowed.
- If local unit tests pass but `pnpm test` fails at the sample call, inspect protocol/output errors and total operation timing first; ordinary provider degradation should be represented as `UNKNOWN`, not an MCP failure.
- If `INVALID_RESPONSE` persists, capture only a sanitized response shape outside logs, update the adapter and fixture tests, bump the policy/provider behavior version if semantics change, and run the full suite.
- If the artifact is not deterministic, stop release work and inspect environment/toolchain drift before rebuilding.
- Never paste provider response bodies, credentials, wallet data, or portal tokens into issues or logs.

## 6. PayBox hosted release procedure

These steps require participant-controlled portal access and cannot be proven by local tests.

1. Start from a clean committed source tree and run the full validation sequence.
2. Record the source commit, artifact SHA-256, artifact byte count, Node version, pnpm version, and UTC time.
3. Upload exactly `dist/plugin.mjs`.
4. Configure only `api.gopluslabs.io` and `api.dexscreener.com` as outbound hosts. Configure no secrets.
5. Run PayBox hosted checks and record the hosted plugin/version identifier and status.
6. Exercise Base USDC and a non-token/non-covered address through the portal. Confirm output schema, source states, limitations, and the lack of a transaction proposal.
7. Enable the private plugin and call it through the agent, not only the portal test form.
8. Record hosted results separately from local results.
9. Submit the project explicitly; an uploaded plugin is not proof of submission.
10. Verify the public demo and X URL without exposing unrelated accounts, emails, keys, or wallet information.

If uploaded bytes do not match the recorded hash, discard the hosted version and upload the tested artifact again. If a hosted fix changes source, repeat every affected local gate and create a new commit before rebuilding.

## 7. Incident posture

- Provider degradation: allow fail-closed `UNKNOWN`; do not relabel it `PASS`.
- Suspected schema drift: stop claiming hosted readiness, sanitize and reproduce, patch with tests, and republish.
- Policy defect: disable/unpublish the affected hosted version, fix and version the policy, then repeat local and hosted gates.
- Secret exposure: RugRadar needs no secrets. If unrelated credentials appear in output or history, revoke them and follow the hosting platform's remediation procedure; deleting a branch alone is insufficient.
- Transaction concern: this release cannot propose, sign, or broadcast a transaction. Any transaction prompt is outside RugRadar v0.1.0 and should be refused.
