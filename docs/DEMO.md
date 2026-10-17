# RugRadar demo guide

The assessment-only demo should show useful evidence and a fail-closed result without implying that local proof is hosted proof or that `PASS` means safe.

## Local proof

Run:

```bash
pnpm test
```

Show the unit count, deterministic artifact hash and size, discovered tool count, and successful sample call. Do not show browser sessions, environment variables, or unrelated terminal history.

## Hosted judge flow

After uploading the exact tested artifact and allowing only the two documented hosts:

1. Ask RugRadar to assess Base USDC at `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`.
2. Point out the canonical address, observation time, provider statuses, categorical verdict, named findings, and limitations. Describe any live result exactly as returned; provider data can change.
3. Assess `0x0000000000000000000000000000000000000001` to demonstrate the expected coverage-gap path. If a provider unexpectedly has current evidence for it, use another clearly disclosed non-token address rather than claiming a predetermined result.
4. Show that an invalid or zero address is rejected before provider calls.
5. State that the plugin exposes no transaction tool and cannot sign or broadcast.

Suggested narration: “RugRadar is a Base-specific evidence gate. It combines normalized security and market context, makes missing coverage visible, and only marks current evidence policy-eligible when there are no blockers, warnings, or gaps. That is not a guarantee that a token is safe.”

## Recorded private-agent proof

The private ChatGPT-to-PayBox flow was exercised successfully at `2026-10-17T08:58:38Z`. ChatGPT discovered RugRadar, inspected `assess_token_risk`, and invoked it for Base USDC. The live result was `PASS` with `COMPLETE` coverage, both providers `AVAILABLE`, and no transaction proposed or initiated.

A second agent invocation at `2026-10-17T10:40:40.193Z` assessed `0x0000000000000000000000000000000000000001`. It returned `UNKNOWN`, `PARTIAL` coverage, `policyAllowsAction: false`, GoPlus `NO_DATA`, DEX Screener `AVAILABLE` with no pair, one evidence gap, one warning, and no transaction. This is the preferred fail-closed segment or companion screenshot for the public demo. Treat both calls as timestamped evidence, not permanent expected results.

## Published demo

The public X thread was posted on 2026-10-17:

- [RugRadar announcement and thread root](https://x.com/zerobyte0x00/status/2111414701490160106)
- [Favorable assessment video](https://x.com/zerobyte0x00/status/2111414705776460189)
- [Fail-closed `UNKNOWN` video](https://x.com/zerobyte0x00/status/2111414709299576907)

The videos are public evidence of the recorded agent flow, not a guarantee that providers or token evidence will remain unchanged.

## Recording checklist

- Keep the video short and show the PayBox flow, not only a local terminal.
- Do not call a mutable live address permanently safe or malicious.
- Show source status and uncertainty, not a fabricated numeric score.
- Do not expose email, KYC details, API keys, wallet secrets, portal tokens, or unrelated balances.
- Do not show OAuth authorization, wallet-permission, account-security, or notification screens. The private setup used a broader wallet grant than this read-only plugin requires; reduce its scope or disconnect it after recording.
- Record the hosted version identifier, artifact hash, submission confirmation, and public X URL outside the video as separate release evidence.
