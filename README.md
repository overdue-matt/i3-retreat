# i3 // Retreat Sandbox

The local app Impact3 retreat participants run during AI Day. A Next.js + Claude Code sandbox wired up to a handful of APIs (Anthropic, X, Apify, Slack, Cookie3, Gemini / Nano Banana, Voyage, CoinGecko).

Drive Claude Code in plain English to build small demoable apps on top of those APIs, then push to Vercel for a public URL.

## Setup

1. Install [VS Code](https://code.visualstudio.com).
2. Install the [Claude desktop app](https://claude.ai/download).
3. Clone this repo and open it in VS Code:
   ```bash
   git clone https://github.com/overdue-matt/i3-retreat
   ```
4. Drop your `.env` into the project root (provided at the retreat). Use `.env.example` as the reference for what keys are expected.
5. Install and run:
   ```bash
   npm install
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000).

## How to build something

Open the Claude desktop app, hit `Cmd / Ctrl + 3` to switch to the Claude Code tab, point it at this folder, and tell it what you want. The dev server hot-reloads the result.

The landing page lists existing builds (LIVE) and starter prompt ideas (IDEA) you can hand to Claude.

## What's inside

- `app/` — Next.js App Router pages. `app/page.tsx` is the landing. Existing builds live at `app/<slug>/page.tsx` (e.g. `app/x-reply/page.tsx`).
- `lib/` — thin wrappers around each API (`lib/anthropic.ts`, `lib/x.ts`). Add a new file per service, don't sprinkle env-var reads through pages.
- `AGENTS.md` — rules of the road for Claude Code. Read this if you're driving the agent.
- `.env.example` — what keys are expected. Real values live in `.env` (gitignored).

## Shipping to Vercel

Push to GitHub, import the repo on [vercel.com](https://vercel.com), then re-add your env vars in **Project → Settings → Environment Variables** (`.env` does NOT get pushed). Redeploy.

## Stack

Next.js 16 · React 19 · Tailwind v4 · TypeScript

## Heads up

This is a hackathon sandbox, not production.

- Don't commit `.env`. The `.gitignore` blocks it; don't fight that.
- Don't log full API keys.
- Never use `NEXT_PUBLIC_` for secrets — that ships them to the browser.
- If you leak a key, rotate it immediately.
