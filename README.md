# RugRadar

RugRadar is a read-only PayBox marketplace plugin that gives AI agents an evidence-backed risk gate before they interact with an unfamiliar Base token.

It does not label tokens as "safe." It validates a Base ERC-20 address, queries GoPlus token-security evidence and DEX Screener market context concurrently, normalizes both untrusted responses, and applies a deterministic policy that returns `PASS`, `REVIEW`, `BLOCK`, or `UNKNOWN` with explicit reasons.

## Project status

The Base assessment milestone is implemented and locally validated. The plugin currently exposes one tool:

- `assess_token_risk`: a read-only assessment with structured evidence, source status, coverage gaps, policy version, and human-readable summary.

The implementation deliberately contains no signing, private-key access, transaction proposal, swap, or broadcast path. `propose_guarded_buy` remains a gated future milestone and must not ship until its quote invariants, refusal behavior, PayBox simulation, and hosted checks all pass.

Release `0.1.1` has passed hosted PayBox checks and a live portal tool call, has been submitted to the hackathon, and is available for private testing while PayBox reviews it. Private agent exercise, manual review, and the public demo remain separate gates.

## Quick start

Prerequisites: Linux/WSL2, Node.js 24.21.0, and pnpm 11.11.0.

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run unit
pnpm test
```

`pnpm test` runs the unit suite, type-checks, performs two byte-identical production builds, validates the artifact limits and schemas, discovers the MCP tool, and calls the sample in `paybox-plugin.json`. It uses live provider data for that sample, so the returned verdict may become `UNKNOWN` during provider degradation even when deterministic unit tests remain green.

Generated output is `dist/plugin.mjs`. The directory is ignored and must not be committed.

## Policy summary

- `BLOCK`: explicit critical evidence is present, including honeypot/restriction signals, dangerous controller privileges, closed source, or a buy/sell/transfer tax above 1,000 basis points.
- `REVIEW`: evidence is complete but a non-critical concern is present, including an untrusted proxy, mintability, low liquidity, a young pair, or a nonzero tax up to 1,000 basis points.
- `UNKNOWN`: required evidence is missing, malformed, rate-limited, timed out, or otherwise unavailable.
- `PASS`: required evidence is present and no blocker, warning, or material gap fired. This is policy eligibility, not a guarantee.

Only `PASS` sets `policyAllowsAction` to `true`; there is currently no action tool that consumes it.

## Runtime boundaries

- Fixed chain: Base mainnet (`eip155:8453`).
- Fixed outbound hosts: `api.gopluslabs.io` and `api.dexscreener.com`.
- Per-provider timeout: 3.5 seconds.
- Maximum decoded provider response: 512 KiB.
- Redirects and user-supplied provider URLs are rejected by design.
- Public assessment endpoints require no plugin secret.

## Documentation

- [Development plan](docs/DEVELOPMENT_PLAN.md) — architecture, policy, milestones, tests, and release gates.
- [Operator runbook](docs/RUNBOOK.md) — setup, commands, PayBox configuration, failure handling, and release procedure.
- [Demo guide](docs/DEMO.md) — reproducible local and hosted assessment flow.
- [Validation record](docs/VALIDATION.md) — exact local artifact evidence, remote mapping, and external gate status.
- [Research brief](docs/research/2026-10-16-product-research.md) — platform constraints, provider evaluation, competitor landscape, probes, and sources.
- [Changelog](CHANGELOG.md) — shipped policy and behavior changes.
- [Original hackathon notes](HackathonPlan.md) — retained for provenance; illustrative code there is superseded by the implemented architecture.

## Safety notice

RugRadar is decision-support software, not financial advice, a smart-contract audit, or a guarantee against loss. Automated providers can be incomplete, stale, wrong, or blind to off-chain fraud and future privileged actions.
