# i3 // Retreat Sandbox — agent guide

This is the Impact3 retreat AI sandbox. Non-coders run this Next.js app on their laptop and drive **you** (Claude Code) in plain English to build small, demo-able apps on top of pre-wired APIs. At the end of the day they push to Vercel for a real public URL.

The participant is **not a coder**. Explain what you're doing as you go, in plain English. Don't paste raw file contents back at them. Don't drown them in jargon. When you make a choice, give them a one-sentence "why".

This is a hackathon. Bias toward shippable + visually impressive over robust. It's fine to skip tests and edge cases. It is not fine to do anything in the "Hard rules" list.

---

## Hard rules

- **Never run the dev server.** The participant keeps `npm run dev` running themselves on `localhost:3000`. Do not run `npm run dev` / `npm start` / any equivalent watcher, even in the background. Hot reload is already happening — to verify a change, ask them to look at the browser, or run a one-shot like `npm run build`, `npx tsc --noEmit`, or `npm run lint`.
- **Never commit `.env` or any `.env.*` other than `.env.example`.** (The `.gitignore` enforces this, but don't fight it.)
- **Never log full API keys, tokens, or `process.env` values verbatim.** If you must show one for debugging, mask it: `sk-ant-***...***a4f2`.
- **Never prefix a secret with `NEXT_PUBLIC_`.** That ships it to the browser. If the browser genuinely needs to call an API that requires a secret, route through a server action or `app/api/.../route.ts` and keep the key server-side.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

Common Next 16 / React 19 / Tailwind v4 things to double-check against the docs:

- App Router only. No `pages/` directory.
- `params` and `searchParams` are **Promises** — `await` them.
- For instant client navigations, read `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md`. The relevant export is `unstable_instant`. Don't sprinkle Suspense boundaries without understanding where they need to go.
- `'use cache'` and `cacheComponents` are real but easy to misuse — read the doc before reaching for them.
- Tailwind v4: `@import "tailwindcss"` in `globals.css`, theme tokens via `@theme inline`. There is **no** `tailwind.config.js`.

---

## Stack

- Next.js 16, React 19, TypeScript, App Router
- Tailwind v4 (already wired in `app/globals.css`)
- Geist Sans + Geist Mono fonts (loaded in `app/layout.tsx`)

---

## How to interpret a participant's request

- **"Add X to this page"** / **"change Y on the home page"** → modify the page they're looking at (`app/page.tsx` by default, or whichever build they navigated to).
- **A new idea** ("build me a tweet analyzer", "make a sentiment dashboard") → scaffold a new route at `app/<slug>/page.tsx`, then add a link to it from the landing's builds list in `app/page.tsx` so they can find it again. Tell them the URL when you're done (`localhost:3000/<slug>`).
- When ambiguous, ask one short clarifying question — don't guess.

If example builds already exist under `app/` (e.g. `app/x-analyzer/`, `app/sentiment/`), **read one before scaffolding a new one** so your code matches the established pattern.

---

## Aesthetic defaults

Match the landing page vibe by default:

- Dark, terminal-leaning
- Geist Mono for prominent labels and code-ish copy
- Use the CSS variables already declared in `app/globals.css`: `--bg`, `--bg-soft`, `--panel`, `--line`, `--fg`, `--fg-muted`, `--fg-dim`, `--accent` (neon green), `--warn`, `--info`, `--pink`. They're exposed as Tailwind colors (`bg-panel`, `text-accent`, `border-line`, etc).
- Borders over shadows. Cards on grid backgrounds. Subtle scan lines.
- Use accent color sparingly for emphasis — it loses meaning if everything is neon.

If the participant asks for a different style, follow them. They're allowed to override.

---

## APIs available

`.env.example` is the source of truth for what's wired up. Real values live in `.env` (gitignored). Every key has been used in a previous project — assume they work.

| Env var | What it is | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Claude | Use `@anthropic-ai/sdk`. Default to the latest Claude Sonnet model unless asked otherwise. |
| `XAI_API_KEY` | xAI / Grok | OpenAI-compatible endpoint. |
| `TWITTER_BEARER_TOKEN` | X / Twitter v2 read API | Reads only. For writes/posts, use Apify or ask the user. |
| `APIFY_API_TOKEN` | Apify scrapers | **This is also how we get LinkedIn data** — there is no LinkedIn API key. Use the Apify LinkedIn actor. |
| `GEMINI_API_KEY` | Google Gemini | **"Nano Banana" = Gemini 2.5 Flash Image.** Use this model id for image generation/editing. |
| `VOYAGE_API_KEY` | Voyage AI | Embeddings / reranking. |
| `SLACK_BOT_TOKEN` | Slack bot | Read channels, threads, summarize. |
| `COOKIE3_USERNAME` + `COOKIE3_CREDENTIAL` | Cookie3 | On-chain social analytics, project sentiment. |
| `COINGECKO_API_KEY` | CoinGecko | Crypto market data, prices, market caps. |

---

## How to add an API client

Convention: thin wrappers in `lib/<service>.ts`. Page files should not read env vars directly.

1. If `lib/<service>.ts` exists, **read it first** and follow the existing pattern.
2. If it doesn't exist, create one. Initialize the SDK with the env var, export typed functions for the things you need. Keep it small — just enough for the current build.
3. If you need a **new** env var, add the key (with no value) to `.env.example`, and tell the participant they need to add the real value to their `.env` (and to Vercel before deploying).

---

## How to add an example to the landing page

When you scaffold a new build at `app/<slug>/page.tsx`, add a corresponding entry to the `PROMPTS` array in `app/page.tsx` (the one rendered under the "Steal one. Or invent your own." heading inside Stage 2). Set the `slug` field — entries with a `slug` render as clickable links with a `● LIVE` badge; entries without a slug stay as static starter-prompt ideas.

Example:
```ts
{
  tag: "X / TWITTER",       // the API or category
  title: "Reply Guy",
  body: "One-line description that reads as either a working feature or a starter prompt.",
  slug: "x-reply",          // omit for not-yet-built prompts
}
```

Put live builds at the top of the list so participants see them first.

---

## Patterns for LLM-generated content

These come from real bugs hit during this project — apply them to any build that uses Claude (or any LLM) to generate text or structured data.

### Forced structured output: use `tool_use`, not `output_config.format`

When you need an output with a fixed shape (exactly N fields, exactly N items), prefer the `tool_use` + `tool_choice` pattern over `output_config.format`. JSON schema in `output_config.format` does not support `minItems`/`maxItems`, so an array shape can't enforce a count and the model will silently drift (we've seen it return 25 items, or 2, instead of 5).

The reliable pattern is **named required string fields** on a tool's `input_schema`:

```ts
const REPLY_TOOL: Anthropic.Tool = {
  name: "submit_replies",
  input_schema: {
    type: "object",
    properties: {
      insight: { type: "string", description: "..." },
      agree_extend: { type: "string", description: "..." },
      contrarian: { type: "string", description: "..." },
      question: { type: "string", description: "..." },
      humor: { type: "string", description: "..." },
    },
    required: ["insight", "agree_extend", "contrarian", "question", "humor"],
  },
};

await client.messages.create({
  ...,
  tools: [REPLY_TOOL],
  tool_choice: { type: "tool", name: "submit_replies" },
});
```

Five required fields = exactly five strings. Schema-enforced, no drift.

### User-facing copy: kill the AI tells

When prompting Claude to generate copy that should pass for human-written (replies, posts, summaries, captions), explicitly forbid AI tells in the system prompt:

- **Em-dashes (—) and en-dashes (–).** Replace with commas, periods, colons, or restructure. Em-dashes are the #1 AI tell.
- **Sycophantic openers** ("Great post!", "Love this!", "100%").
- **Self-reference as an AI** ("As an AI...", "I'd suggest...").

Also remove em-dashes from your own system prompt. The model mirrors the punctuation it sees in its context, so an em-dash-heavy prompt produces em-dash-heavy output even when you've told it not to.

### Default model and parameters

For hackathon-tier content generation:

```ts
{
  model: "claude-sonnet-4-6",          // current latest Sonnet
  max_tokens: 4096,                    // give it headroom
  thinking: { type: "disabled" },      // creative chat doesn't need thinking
  output_config: { effort: "medium" }, // "low" can under-instruct on Sonnet 4.6
  system: [{
    type: "text",
    text: SYSTEM_PROMPT,
    cache_control: { type: "ephemeral" }, // cache the stable bit
  }],
}
```

Wire `cache_control` on the system prompt for any feature where the participant might re-roll / regenerate — first call writes the cache (1.25× cost), subsequent calls read it (~0.1× cost on the cached prefix).

---

## Patterns for Slack

### Bots can't read channels they aren't a member of — even public ones

`conversations.history` returns `error: "not_in_channel"` for any channel where `is_member` is false. Public-vs-private doesn't change this — Slack removed the legacy "read all public" tokens years ago. This is the #1 reason a Slack build "doesn't work" on first run.

Two paths:

- **Public channels** — call `conversations.join` (needs the `channels:join` bot scope, which our bot has) right before reading history. The bot self-joins, then history works. No user action required.
- **Private channels** — no API path. The user has to `/invite @YourBot` in Slack manually.

`lib/slack.ts` already does the public-channel auto-join in `loadOneChannel`. Reuse it rather than rebuilding the same dance.

---

## Brand assets

`public/favicon.png` is the project's brand mark, used in three places:

1. **Site favicon.** Wired up via `metadata.icons` in `app/layout.tsx`. Don't add an `app/favicon.ico` — Next will pick that up first and override the metadata.
2. **The user avatar in any "draft post / draft reply" preview** (e.g. the X reply cards in `app/x-reply/page.tsx` use `<img src="/favicon.png">` as the "you" avatar).
3. Anywhere else a "this is the i3 sandbox" mark fits.

Don't duplicate it as `app/icon.png`. One file, one place.

---

## When the participant wants to ship

They push to GitHub, then deploy via Vercel. Two things to remind them:

1. **`.env` does not get pushed.** Each variable must be pasted into Vercel → Project → Settings → Environment Variables, then redeploy.
2. The landing's "Stage 03" already covers this — point them there if helpful.
