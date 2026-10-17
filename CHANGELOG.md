# Changelog

All notable RugRadar policy and tool behavior changes are recorded here.

## 0.1.0 - 2026-10-17

### Added

- `assess_token_risk` for Base mainnet with strict MCP input/output schemas.
- Concurrent GoPlus token-security and DEX Screener market-context adapters.
- Bounded 3.5-second JSON transport with a 512 KiB decoded-response limit, redirect refusal, and structured source statuses.
- Versioned categorical policy with `PASS`, `REVIEW`, `BLOCK`, and `UNKNOWN` outcomes.
- Named critical findings, warnings, coverage gaps, normalized evidence, and explicit limitations.
- Deterministic unit, build, artifact, schema, discovery, and sample-call validation.
- Read-only GitHub Actions validation with exact Node.js and pnpm versions and commit-pinned official actions.

### Security

- Nonzero EVM addresses are canonicalized to lowercase for comparison.
- User-selected provider URLs, signing, private keys, transaction proposals, and broadcasting are excluded.
- Explicit critical findings take precedence over missing secondary evidence; missing required evidence otherwise fails closed as `UNKNOWN`.
- A trusted-token coverage exception does not suppress explicit modifiable-tax or other adverse signals.

### External gates

- PayBox hosted checks, portal calls, KYC, project submission, and public demo publication remain participant-controlled release steps.
