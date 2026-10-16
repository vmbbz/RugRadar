# RugRadar

RugRadar is a proposed PayBox marketplace plugin that gives AI agents an evidence-backed risk gate before they interact with an unfamiliar Base token.

The product is deliberately framed as risk assessment, not a promise that a token is "safe." Its core behavior is:

1. normalize current token-security and market evidence;
2. return a transparent `PASS`, `REVIEW`, `BLOCK`, or `UNKNOWN` decision;
3. refuse action when critical evidence is adverse, missing, malformed, or stale; and
4. optionally create a tightly bounded PayBox transaction proposal for the exact token that was assessed.

## Project status

Planning and technical research are complete. Implementation has not started yet.

The recommended hackathon slice is Base mainnet only:

- `assess_token_risk`: read-only assessment using GoPlus security data plus DEX Screener market context.
- `propose_guarded_buy`: an optional native-ETH-to-token 0x quote and PayBox EVM proposal, created only after the tool repeats the assessment and the strict action policy returns `PASS`.

The guarded action is a second milestone. A complete, well-tested assessment tool is preferable to a partially safe swap flow.

## Documentation

- [Development plan](docs/DEVELOPMENT_PLAN.md) — scope, architecture, tool contracts, policy, milestones, tests, operations, and release gates.
- [Research brief](docs/research/2026-10-16-product-research.md) — platform constraints, provider evaluation, competitor landscape, live probes, and source links.
- [Original hackathon notes](HackathonPlan.md) — retained for provenance; its sample implementation is superseded by the development plan.

## Product principles

- Unknown is not safe.
- Evidence is more useful than a magic score.
- A read-only finding must not silently authorize a later action.
- Each action re-checks the target because PayBox plugin calls are stateless.
- No plugin code receives private keys, signs transactions, or broadcasts them.
- Provider claims and transaction labels are untrusted until validated.
- Local conformance, hosted execution, transaction simulation, user approval, broadcast, and confirmation are separate gates.

## Technical baseline

- TypeScript on Node.js 24.21.0
- pnpm 11.11.0 with the PayBox starter v1.0.2 lockfile
- MCP protocol version `2026-07-28`
- One deterministic `dist/plugin.mjs` artifact, no larger than 10 MiB
- Base mainnet (`eip155:8453`)

The implementation will be scaffolded from the official PayBox starter rather than from the illustrative code in the original notes.

## Safety notice

RugRadar will be a decision-support control, not financial advice, a smart-contract audit, or a guarantee against loss. Automated scanners can be incomplete, stale, wrong, or blind to off-chain fraud and future privileged actions.
