# RugRadar product and platform research

Date: 2026-10-16
Status: decision-ready research baseline
Scope: PayBox Chapter 1 hackathon, Base mainnet, token-risk assessment, and a possible guarded transaction proposal

## Executive conclusion

RugRadar is worth building, but not as the initial `analyze_token` plus unrelated USDC transfer concept.

The strongest product is an agent-native pre-trade control: it returns normalized evidence and a categorical policy decision, then repeats that assessment inside any tool that can propose a transaction. Its differentiation is not another scanner UI. It is a small, inspectable enforcement layer between an AI agent's intent and PayBox's approval/signing path.

The recommended build order is:

1. Ship a reliable, transparent Base token assessment tool.
2. Add a guarded native-ETH buy only if its quote validation, negative tests, hosted configuration, and PayBox simulation are all complete.
3. Defer ERC-20 sell-token flows, multichain support, user-configurable policies, and persistent monitoring.

## Research method

This brief uses official platform and provider documentation, direct read-only API probes, and official competitor product/API pages. Sources were accessed on 2026-10-16. Provider behavior and terms can change and must be rechecked before publication.

No third-party package or untrusted project code was installed or executed during this research round.

## Verified PayBox constraints

The official developer guide establishes the following implementation envelope:

| Constraint | Product consequence |
|---|---|
| Starter v1.0.2, Node.js 24.21.0, pnpm 11.11.0 | Pin exactly; do not compose a fresh toolchain. |
| macOS/Linux supported; Windows through WSL2 | Build and run official checks in WSL2 and Linux CI. |
| Fresh sandbox per operation; no persistent disk/memory | A guarded action must repeat the assessment in the same call. A previous tool result cannot be trusted as authorization state. |
| Ten-second operation budget | Parallelize bounded provider calls and reserve time for normalization. |
| Exact allowlisted HTTPS hosts | Document every runtime host and reject redirects. |
| One unsigned EVM call per proposal | ERC-20 approval plus swap cannot be one generic proposal. Start with native ETH input or require an already-established allowance later. |
| PayBox simulates proposals but does not provide a trusted decoded ERC-20/swap asset-change summary | RugRadar must validate quote fields itself and accurately describe the limits of the preview. |
| Maximum five-minute proposal expiry | Use the earlier of the PayBox helper expiry and provider quote expiry. |
| Local conformance, hosted tests, validation, approval, broadcast, and confirmation are distinct | Track and report every gate separately. |
| One project per participant; working plugin plus X demo required | Optimize for one complete vertical slice and preserve time for a real hosted demo. |

The Chapter 1 page says the event runs from October 16 at 08:00 through October 17 at 20:00 EDT. That is October 16 at 14:00 through October 18 at 02:00 SAST. KYC, account onboarding, a working marketplace plugin, and a short X video are external submission dependencies.

Sources:

- [PayBox plugin developer guide](https://developer.paybox.sh/requirements.md)
- [PayBox Chapter 1 details](https://developer.paybox.sh/)
- [MoonPay Hackathons terms](https://developer.paybox.sh/terms)
- [PayBox product documentation](https://docs.paybox.sh/)

## Runtime data-provider evaluation

### GoPlus Token Security API — recommended primary source

Fit:

- The official token-security endpoint accepts a chain ID and token contract address.
- Base (`8453`) is supported by the live endpoint.
- Fields cover contract verification, proxy status, honeypot indicators, buy/sell taxes, privileged ownership controls, minting, blacklist/whitelist behavior, transfer controls, holder data, and DEX/liquidity observations.
- GoPlus describes the security API as open and license-free, with published free and paid quotas.
- The free support documentation states a 30-call-per-minute limit, while the current product pricing page describes credit-based limits. Treat limits as configuration facts to verify before launch.

Important semantics:

- Missing fields frequently mean `unknown`, not `false`.
- Closed-source or proxy contracts can cause other checks to be absent.
- Tax values are fractions (`0.01` means 1%), so string-to-decimal parsing must be exact.
- Provider trust-list membership is supporting evidence, not proof of future safety.
- Do not return the provider's entire raw payload; normalize only evidence used by policy.

Live probe on 2026-10-16:

- Request: Base USDC at `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`.
- Response: HTTP 200, API code `1`, message `OK`.
- Selected observations: symbol `USDC`, `is_honeypot=0`, buy and sell tax `0`, `is_open_source=1`, `is_proxy=1`.
- Lesson: proxy status by itself cannot be an automatic block. Policy must combine it with source availability, privileged controls, trusted-token evidence, and other signals.

Sources:

- [Token Security endpoint](https://docs.gopluslabs.io/reference/tokensecurityusingget_1)
- [Token Security response semantics](https://docs.gopluslabs.io/reference/response-details)
- [GoPlus API overview and pricing](https://www.gopluslabs.io/en/security-api)
- [GoPlus rate-limit support page](https://docs.gopluslabs.io/reference/support)

### DEX Screener API — recommended context source

Fit:

- The token-pairs endpoint provides Base pair identity, DEX, price, liquidity, volume, transaction counts, price change, and pair creation time.
- The endpoint's documented limit is 300 requests per minute.
- It needs no secret for the documented public endpoint.

Use:

- Market context only: aggregate liquidity, pair count, oldest/newest pair age, concentration in the deepest pair, and short-window buy/sell activity.
- Never infer contract safety from price, volume, token profile, paid promotion, or market capitalization.
- Treat missing pairs or low liquidity as insufficient execution evidence, not proof of fraud.

Live probe on 2026-10-16:

- Base USDC returned HTTP 200 from the token endpoint.
- The sampled endpoint returned a Base QuickSwap pair with current price/liquidity context.
- Live numeric values are deliberately not recorded as stable facts because they change continuously.

Sources:

- [DEX Screener API reference](https://docs.dexscreener.com/api/reference)
- [DEX Screener API terms](https://docs.dexscreener.com/api/api-terms-and-conditions)

### Honeypot.is — technically useful, excluded from the MVP

Technical fit is good: the API supports Base, performs buy/sell simulation, returns categorical risk, taxes, holder analysis, flags, contract-code observations, and liquidity/pair context.

Legal/product fit is currently poor. The published terms prohibit using the API to develop or market a product primarily competitive with Honeypot.is and restrict making API functionality available to third parties. RugRadar is close enough to that boundary that it should not ship this integration without written permission or legal review.

Live probe on 2026-10-16 confirmed that Base USDC returned HTTP 200 with a successful simulation and a non-honeypot result. That technical success does not override the terms concern.

Sources:

- [Honeypot.is supported chains](https://docs.honeypot.is/chains)
- [Honeypot check response](https://docs.honeypot.is/ishoneypot)
- [Honeypot.is API terms](https://docs.honeypot.is/terms)

### 0x Swap API — conditional action provider

Fit:

- The AllowanceHolder quote endpoint supports Base and returns executable EVM transaction data.
- All calls require an API key in `0x-api-key` and API version header `0x-version: v2`.
- The key can be configured as a PayBox host-scoped brokered header for `api.0x.org`; plugin code must not read or log it.
- Native currency is represented by `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`.

Constraints:

- ERC-20 input may require a separate allowance transaction. PayBox's generic proposal carries one EVM call, so that is not an honest one-step MVP.
- Permit2 requires an additional typed-data signature flow and is not the MVP path.
- Native ETH input avoids the allowance step, making a guarded buy the narrowest demonstrable action.
- Quote response data is external and untrusted. Validate chain, tokens, taker, sell amount/value, recipient semantics, liquidity, allowance issues, calldata shape, destination policy, expiry, and slippage before constructing the PayBox proposal.
- Request signed responses if practical; signature verification is a hardening item, not a substitute for field validation or PayBox simulation.

Sources:

- [0x Swap API quickstart](https://docs.0x.org/docs/introduction/quickstart/swap-tokens-with-0x-swap-api)
- [0x API overview](https://docs.0x.org/api-reference/api-overview)
- [0x API issues and native-token identifier](https://docs.0x.org/docs/introduction/api-issues)
- [0x response signatures](https://docs.0x.org/docs/developer-resources/response-signatures)

## Competitive landscape

| Product | Published strength | Gap RugRadar can target |
|---|---|---|
| GoPlus | Broad security APIs, AI-agent-oriented API, many normalized token risk fields | RugRadar can add PayBox-native policy enforcement, cross-source context, strict uncertainty semantics, and guarded action construction. |
| Token Sniffer | Scam-pattern database, contract/source analysis, token scores, malicious token/address feeds | Its API is paid and scanner-oriented; RugRadar's value is agent workflow control rather than another public score. |
| Quick Intel | Honeypot, tax, LP-lock, holder, owner-action, and contract capability analysis across many chains | Similar scanner breadth; RugRadar should avoid competing on number of signals and focus on explainable action gating. |
| Honeypot.is | Transaction simulation and honeypot-specific risk classification | Strong technical source, but current terms make it unsuitable for an unapproved competitive integration. |
| DEX Screener | Widely available pair and market telemetry | It supplies context, not a security verdict or execution policy. |

Sources:

- [Token Sniffer API introduction](https://tokensniffer.readme.io/reference/introduction)
- [Token Sniffer API pricing](https://tokensniffer.readme.io/reference/pricing)
- [Quick Intel developer APIs](https://quickintel.io/developers)
- [Quick Intel scanner overview](https://docs.quickintel.io/quick-intel-scanner/get-started-guides/scanner-overview)
- [GoPlus Security API for AI agents](https://docs.gopluslabs.io/reference/security-api-for-ai-agent)

## Product hypothesis

### User

An AI agent or user considering interaction with a Base token that is not already governed by a trusted asset list.

### Job to be done

Before proposing a token purchase, answer:

- Is the address valid on the intended chain?
- Which current findings are hard blockers?
- Which important checks are unknown or unsupported?
- Is there meaningful current market/liquidity context?
- What exactly would need human review?
- May the agent proceed under the published RugRadar policy?

### Differentiator

RugRadar is a policy boundary with machine-readable reasons. It does not collapse incomplete evidence into a reassuring score and does not allow a previous stateless scan to authorize a later action.

### Success metric for the hackathon

A judge can ask an agent to assess a known liquid Base token and a risky/unsupported token, see clearly different evidence-backed outcomes, and observe that the guarded action produces a PayBox proposal only for the passing case.

## Decision record

| Decision | Rationale |
|---|---|
| Base mainnet only for v1 | Matches the original idea, PayBox EVM proposals, GoPlus, DEX Screener, and 0x. Keeps the evidence model testable. |
| Categorical verdicts instead of a safety score | A numeric score suggests calibration that the project does not yet possess. |
| `UNKNOWN` is a first-class verdict | Provider absence, unsupported contracts, malformed data, and timeouts are not passes. |
| GoPlus primary, DEX Screener contextual | Strongest legal/technical fit among researched sources for the available time. |
| Exclude Honeypot.is | Published terms present a material integration risk. |
| No raw provider payload in output | Reduces schema/output size, avoids accidental unstable coupling, and makes policy evidence auditable. |
| Guarded buy repeats its scan | Required by stateless execution and prevents stale/cross-token authorization. |
| Native ETH input for the first swap | Avoids a separate ERC-20 approval call. |
| Read-only assessment is the must-ship slice | A correct refusal is more valuable than unsafe action theater. |

## Research risks and open external facts

These are not engineering questions and require owner confirmation or live portal access:

- Participant KYC and PayBox account eligibility.
- Whether the repository may be public during judging.
- Availability of a 0x API key for a brokered `0x-api-key` header.
- A funded Base wallet controlled by the participant for a tiny, explicitly approved demo.
- Written permission if Honeypot.is is reconsidered.
- Final X account and demo-post ownership.

Everything else in the MVP plan is engineering-owned and can proceed without delegating setup questions back to the owner.
