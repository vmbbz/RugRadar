> [!WARNING]
> This file contains the original brainstorming notes and an illustrative implementation. It is retained for provenance, but it is not the implementation specification. The researched scope, provider choices, risk semantics, and release gates in [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) supersede the sample code below.

https://x.com/PayBox/status/2111092311597744221

he first PayBox Hackathon is live!

build a plugin for our marketplace and compete for $20,000 USDC in prizes

start here: https://developer.paybox.sh


- PayBox launched its first hackathon encouraging developers to build plugins for their marketplace, which enables secure wallet, crypto, and card access for AI agents in DeFi and trading.
- The 30-second promo video uses humorous party scenes and a dramatic 80s-style character to announce $20,000 USDC in total prizes for the top 10 original plugins focused on AI x payments.
- Interested builders can start immediately via the developer portal at developer.paybox.sh, with the hackathon active as of October 16, 2026.

**PayBox plugins are MCP (Model Context Protocol) tools** that AI agents discover and call through the PayBox marketplace.

PayBox itself is a non-custodial credential vault: users connect wallets, cards, and secrets once; agents get scoped, revocable access. Plugins let agents act on external apps/services (read data, call APIs, propose payments or on-chain transactions). PayBox handles wallet selection, policy checks, user approval (often via passkey), signing, and execution — your plugin never sees private keys.

Suggested categories for the hackathon include:
- Creative (content/media/generative tools an agent can commission and pay for)
- Consumer finance (saving, moving, converting money within policy)
- Merchant tools (checkout, invoicing, payment flows)
- Predictions (markets an agent can price, enter, and settle)

If your service is already wrapped with **x402** (pay-per-request over HTTP 402), you’re halfway there — PayBox supports it natively.

### Tech stack
- **Language/runtime**: TypeScript on **Node.js 24**
- **Package manager**: **pnpm 11.11.0** (pinned lockfile required)
- **Core libraries**:
  - `@modelcontextprotocol/server` (MCP server)
  - `zod` (input/output schemas)
  - esbuild (bundles everything into a single `plugin.mjs`)
- **Protocol**: MCP (starter uses protocol version `2026-07-28`)
- Output: one self-contained `dist/plugin.mjs` (≤ 10 MiB, UTF-8)
- Platform support for local builds: macOS/Linux (Windows via WSL2)

Plugins run in a fresh sandbox per call (no persistent memory/disk). Network access is restricted to hostnames you explicitly configure in the portal; secrets are injected as brokered headers (never baked into the bundle).

### How to build one
1. **Get the starter**
   Go to [https://developer.paybox.sh/requirements.md](https://developer.paybox.sh/requirements.md). Create a folder and copy the pinned starter files (v1.0.2) for `src/plugin.ts`, `src/paybox.ts`, `package.json`, `tsconfig.json`, lockfile, scripts, `paybox-plugin.json`, etc.

2. **Implement tools**
   Edit `src/plugin.ts`. Register one or more tools with `McpServer` + Zod schemas:

```ts
server.registerTool("your_tool", {
  title: "...",
  description: "...",
  inputSchema: z.object({ ... }).strict(),
  outputSchema: z.object({ ... }).strict(),
  annotations: { readOnlyHint: true, /* etc. */ },
}, async (args) => {
  // call external APIs (only allowed hosts) or
  // return a transaction proposal via helpers in src/paybox.ts
  return {
    content: [{ type: "text", text: "..." }],
    structuredContent: { ... },
  };
});
```

   - For wallet actions: return an **unsigned** transaction proposal (EVM or Solana) using the helpers in `src/paybox.ts`. Never request private keys.
   - For x402: propose a paid HTTP request; PayBox completes it after approval.
   - Keep tools small, fast (≤ ~10 s), and free of side effects during discovery.

3. **Configure sample call**
   Put a successful tool name + sample JSON arguments in `paybox-plugin.json`.

4. **Build & test locally**
   ```bash
   pnpm install --frozen-lockfile
   pnpm test   # type-check + deterministic build + MCP conformance
   ```
   Use `pnpm dev` for local stdio testing with an MCP host.

5. **Submit**
   - Register/sign in at [https://developer.paybox.sh](https://developer.paybox.sh).
   - Upload only `dist/plugin.mjs`.
   - Configure allowed network hosts, environment variables, and brokered secrets.
   - Run hosted checks, test tools (and optionally validate transaction proposals) in the portal.
   - Submit the project (also post a short demo video to X).

One project per participant for this chapter. Local success does **not** prove hosted network access, credentials, or real transaction execution will work — always test in the portal.

Full details, starter files, examples, and limits are in the official guide: [developer.paybox.sh/requirements.md](https://developer.paybox.sh/requirements.md). There’s also a short agent-oriented skill file at [developer.paybox.sh/skill.md](https://developer.paybox.sh/skill.md) if you’re using a coding agent to help build it.






**Coolest high-idea: “RugRadar” — Token Safety Guardian + Safe Action Proposer**

This stands out for the hackathon because:
- It directly solves a real pain for AI agents that trade/swap (agents aping into honeypots is a common failure mode).
- It combines **analysis** (read-only public API) with **action** (unsigned transaction proposal), showing the full PayBox power.
- It fits Consumer Finance / Predictions / DeFi and feels original + useful.
- Judges will love the “protect the user’s money” angle + clean demo potential (analyze a known good/bad token → propose a safe transfer or skip).
- Buildable in hours with the official starter; no private keys, no complex contracts needed for v1.

### What the plugin does
Two tools:
1. `analyze_token` — takes a Base chain token address, calls GoPlus Security API (public, free tier), returns a clear safety summary (honeypot risk, buy/sell tax, owner renounced, etc.).
2. `propose_safe_usdc_transfer` — only useful after a good analysis; proposes a small USDC transfer on Base (user still approves via PayBox). You can later extend it to a real swap router call.

### Full code (drop-in replacement)

**1. `src/plugin.ts`** (complete file)

```ts
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { encodeFunctionData, erc20Abi } from "viem"; // add this dep
import { atomicAmount, evmOutputSchema, proposeEvm } from "./paybox.js";

const PROTOCOL_VERSION = "2026-07-28";
const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const usdcAmount = z.string().regex(/^(0|[1-9]\d*)(\.\d{1,6})?$/); // up to 6 decimals

// GoPlus response shape (simplified)
const goplusToken = z.object({
  is_honeypot: z.string().optional(),
  honeypot_with_same_creator: z.string().optional(),
  buy_tax: z.string().optional(),
  sell_tax: z.string().optional(),
  is_open_source: z.string().optional(),
  owner_address: z.string().optional(),
  can_take_back_ownership: z.string().optional(),
  hidden_owner: z.string().optional(),
  is_proxy: z.string().optional(),
  is_mintable: z.string().optional(),
  holder_count: z.string().optional(),
}).passthrough();

function createServer() {
  const server = new McpServer(
    { name: "rug-radar", version: "1.0.0" },
    { supportedProtocolVersions: [PROTOCOL_VERSION] },
  );

  // Tool 1: Analyze token safety on Base
  server.registerTool(
    "analyze_token",
    {
      title: "Analyze token safety (RugRadar)",
      description:
        "Checks a Base (chain 8453) token for honeypot risk, taxes, ownership, and other red flags using public security data. Returns a clear human + structured summary.",
      inputSchema: z.object({
        tokenAddress: address,
      }).strict(),
      outputSchema: z.object({
        token: z.string(),
        safetyScore: z.number().min(0).max(100),
        summary: z.string(),
        risks: z.array(z.string()),
        raw: z.record(z.string(), z.any()).optional(),
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ tokenAddress }) => {
      try {
        const url = `https://api.gopluslabs.io/api/v1/token_security/8453?contract_addresses=${tokenAddress.toLowerCase()}`;
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(6_000),
          redirect: "error",
        });
        if (!res.ok) throw new Error(`GoPlus HTTP ${res.status}`);

        const json = await res.json();
        const result = json?.result?.[tokenAddress.toLowerCase()];
        if (!result) {
          return {
            isError: true,
            content: [{ type: "text", text: "Token not found or no security data available." }],
          };
        }

        const data = goplusToken.parse(result);
        const risks: string[] = [];
        let score = 100;

        if (data.is_honeypot === "1" || data.honeypot_with_same_creator === "1") {
          risks.push("HONEYPOT DETECTED");
          score -= 70;
        }
        if (Number(data.buy_tax || 0) > 10 || Number(data.sell_tax || 0) > 10) {
          risks.push(`High tax (buy ${data.buy_tax}%, sell ${data.sell_tax}%)`);
          score -= 25;
        }
        if (data.can_take_back_ownership === "1" || data.hidden_owner === "1") {
          risks.push("Owner can reclaim or is hidden");
          score -= 20;
        }
        if (data.is_proxy === "1") risks.push("Proxy contract");
        if (data.is_mintable === "1") {
          risks.push("Mintable");
          score -= 15;
        }
        if (data.is_open_source !== "1") {
          risks.push("Source not verified");
          score -= 10;
        }

        score = Math.max(0, Math.min(100, score));
        const summary =
          score >= 80
            ? `Looks relatively safe (score ${score}/100). Still DYOR.`
            : score >= 50
              ? `Medium risk (score ${score}/100). Proceed with caution.`
              : `HIGH RISK (score ${score}/100). Avoid or use tiny size only.`;

        return {
          content: [
            {
              type: "text",
              text: `RugRadar report for ${tokenAddress}:\n${summary}\nRisks: ${risks.length ? risks.join(" | ") : "None major detected"}`,
            },
          ],
          structuredContent: {
            token: tokenAddress,
            safetyScore: score,
            summary,
            risks,
            raw: data,
          },
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Analysis failed. Check network host api.gopluslabs.io is allowed and retry. (${String(err)})`,
            },
          ],
        };
      }
    },
  );

  // Tool 2: Propose a safe USDC transfer on Base (after good analysis)
  server.registerTool(
    "propose_safe_usdc_transfer",
    {
      title: "Propose safe USDC transfer on Base",
      description:
        "Builds an unsigned USDC transfer on Base (eip155:8453). Use only after a positive analyze_token result. Amount is in USDC (e.g. '1.5'). User must still approve in PayBox.",
      inputSchema: z
        .object({
          recipient: address,
          amountUsdc: usdcAmount,
        })
        .strict(),
      outputSchema: evmOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ recipient, amountUsdc }) => {
      const usdc = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // native USDC on Base
      const amount = atomicAmount(amountUsdc, 6);

      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [recipient as `0x${string}`, BigInt(amount)],
      });

      return proposeEvm({
        chain: "eip155:8453",
        to: usdc,
        value: "0",
        data,
      });
    },
  );

  return server;
}

serveStdio(createServer, { legacy: "reject" });
```

**2. Add the extra dependency** (in the starter folder):

```bash
pnpm add --save-exact viem@2.51.3
```

**3. `paybox-plugin.json`** (sample for local conformance — pick one tool)

```json
{
  "tool": "analyze_token",
  "arguments": {
    "tokenAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  }
}
```

(You can also test the transfer tool later with a zero or tiny amount.)

**4. Setup & run**

```bash
# after copying all starter files + the plugin.ts above
pnpm install --frozen-lockfile
pnpm test
```

In the developer portal:
- Upload `dist/plugin.mjs`
- Allow network host: `api.gopluslabs.io`
- (No secrets needed for this version)
- Test `analyze_token` with a real Base token (USDC itself, a known good token, and a known scam if you want drama)
- For the transfer tool, validate the proposal with one of your wallets

### Why this can win
- Clear value for any agent that touches tokens
- Demo is fast and visual (“this token scores 12 — don’t touch” vs “score 92 — propose $5 entry”)
- Shows both read + write (proposal) paths
- Easy to extend later (add Solana, real Jupiter/1inch quote + swap calldata, prediction-market odds, etc.)

You can rename it, tighten the scoring logic, or add a third tool that proposes a swap only when `safetyScore >= 80`. Ship the working plugin + a short X demo video showing the analyze → propose flow and you’re competitive.

Go build it — the starter + this code is everything you need for a strong Chapter 1 entry. Good luck!
