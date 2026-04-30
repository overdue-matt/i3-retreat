import Link from "next/link";

const STAGE_1_STEPS = [
  "Install VS Code",
  "Install the Claude desktop app",
  "Clone github.com/overdue-matt/i3-retreat",
  "Open the folder in VS Code",
  "Run npm install",
  "Run npm run dev",
  "Land here.",
];

const STAGE_2_STEPS = [
  {
    title: "Open Claude Code.",
    body: (
      <>
        Open the Claude desktop app and press{" "}
        <kbd className="kbd">Cmd / Ctrl</kbd>{" "}
        <span className="text-fg-dim">+</span>{" "}
        <kbd className="kbd">3</kbd> to switch to the Claude Code tab. Point it
        at this folder. That's your dev partner now.
      </>
    ),
  },
  {
    title: "Poke around.",
    body: (
      <>
        Open <code className="code">.env</code> in VS Code. That's where the
        API keys live. Open <code className="code">app/page.tsx</code> — that's
        this page. Skim the structure so you have a rough mental model.
      </>
    ),
  },
  {
    title: "Ask Claude to build something.",
    body: (
      <>
        Plain English. Steal a starter prompt below or invent your own. Claude
        writes the code, the dev server hot-reloads, your idea shows up in this
        tab a few seconds later.
      </>
    ),
  },
  {
    title: "Iterate until it's cool.",
    body: (
      <>
        "Make this red." "Add a chart." "Connect it to the Twitter API." The
        loop is fast and it's free to be wrong. Lean into it.
      </>
    ),
  },
];

const STAGE_3_STEPS = [
  {
    title: "Get a GitHub account.",
    body: (
      <>
        Sign up at <span className="text-info">github.com</span>. Create a new
        empty repo. Tell Claude "push this project to my new GitHub repo" and
        let it walk you through it.
      </>
    ),
  },
  {
    title: "Get a Vercel account.",
    body: (
      <>
        Sign up at <span className="text-info">vercel.com</span> and connect
        your GitHub. Click "Import Project", pick the repo, hit deploy. About
        60 seconds later you have a live URL on the public internet.
      </>
    ),
  },
  {
    title: "Add your env vars to Vercel.",
    body: (
      <>
        Your <code className="code">.env</code> file does <em>not</em> get
        pushed (more on that below). On Vercel, go to{" "}
        <span className="text-fg">Project → Settings → Environment Variables</span>{" "}
        and paste each key in. Redeploy.
      </>
    ),
  },
  {
    title: "Share the link.",
    body: (
      <>
        That's it. You've shipped a thing. The URL is real, anyone in the
        world can hit it. Drop it in the retreat channel.
      </>
    ),
  },
];

type Prompt = {
  tag: string;
  title: string;
  body: string;
  slug: string;
  color: string;
};

const PROMPTS: Prompt[] = [
  {
    tag: "X / TWITTER",
    title: "Reply Guy",
    body: "Paste any X post URL. Get five replies in five distinct angles: insight, agree+extend, contrarian, question, humor. Pick one and ship it back to X with one click.",
    slug: "x-reply",
    color: "info",
  },
  {
    tag: "SLACK",
    title: "Slack chat",
    body: "Pick channels, choose a window (24h to 30d), load every message + thread into Claude. Get a digest up top, then chat across all of it like it's one giant conversation.",
    slug: "slack-chat",
    color: "pink",
  },
  {
    tag: "NANO BANANA",
    title: "Roast Generator",
    body: "Paste any image. Get it back annotated with handwritten red-pen roasts, arrows, doodles, and harsh remarks. Works on profile screenshots, selfies, anything that deserves it.",
    slug: "roast",
    color: "warn",
  },
  {
    tag: "LINKEDIN",
    title: "Engagement Forecaster",
    body: "Paste a company's LinkedIn URL. We pull their last 50 posts, then score any draft against their actual history. Get predicted reactions, comments, reposts, plus three sharp edits to push the numbers up.",
    slug: "linkedin-forecast",
    color: "info",
  },
  {
    tag: "COOKIE3",
    title: "Smart Account Finder",
    body: "Type any topic. Get the 5 smartest accounts driving the conversation, their 5 sharpest takes, and a 30-second narrative summary. Cookie3 filters for signal, not volume.",
    slug: "cookie-finder",
    color: "pink",
  },
  {
    tag: "GROK + X + NANO",
    title: "News to Post",
    body: "Enter any topic + target X handle. Grok researches recent news, analyzes their voice from past posts, generates 3 post variations (hot take, explainer, contrarian), each with a custom image. Pick one and ship.",
    slug: "news-to-post",
    color: "accent",
  },
];

const APIS = [
  { name: "Anthropic / Claude", color: "accent" },
  { name: "X / Twitter", color: "info" },
  { name: "Slack", color: "pink" },
  { name: "Cookie3", color: "warn" },
  { name: "LinkedIn", color: "info" },
  { name: "Nano Banana", color: "pink" },
];

export default function Home() {
  return (
    <div className="relative z-10 flex flex-1 flex-col text-fg">
      {/* Top status bar */}
      <header className="border-b border-line bg-bg-soft/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-accent live-dot" />
              <span className="relative h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="text-fg-muted">
              <span className="text-fg">localhost:3000</span>{" "}
              <span className="text-fg-dim">·</span>{" "}
              <span className="text-accent">SANDBOX READY</span>
            </span>
          </div>
          <div className="hidden items-center gap-4 text-fg-muted md:flex">
            <span>impact3 / retreat / ai-day</span>
            <span className="text-fg-dim">·</span>
            <span>v0.1.0</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="mb-8 flex items-center gap-3 text-xs text-fg-muted">
            <span className="text-accent">$</span>
            <span>./welcome.sh</span>
            <span className="cursor" />
          </div>

          <h1 className="text-5xl font-semibold leading-[0.95] tracking-tight sm:text-7xl md:text-8xl">
            <span className="text-fg-dim">i3</span>
            <span className="text-accent glow-text"> / / </span>
            <span className="text-fg">SETUP.</span>{" "}
            <span className="text-fg">BUILD.</span>{" "}
            <span className="text-fg">SHIP.</span>
          </h1>

          <p className="mt-8 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
            By the end of today you'll have a real local developer environment, a
            working app you built with Claude, and a public URL live on the internet.
          </p>
        </div>
      </section>

      {/* Stage 1 — Setup */}
      <Stage
        n="01"
        kicker="STAGE ONE"
        state="DONE"
        title="Setup."
        subtitle="The technical bit. If you're reading this, you've already done it."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <ol className="space-y-3">
            {STAGE_1_STEPS.map((step, i) => (
              <li
                key={step}
                className="flex items-baseline gap-4 text-sm text-fg-muted"
              >
                <span className="w-6 shrink-0 text-xs text-fg-dim">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-accent">✓</span>
                <span className="text-fg">{step}</span>
              </li>
            ))}
          </ol>
          <div className="rounded-sm border border-line bg-panel p-6 text-sm text-fg-muted">
            <div className="text-xs font-semibold tracking-[0.2em] text-fg-dim">
              IF YOU'RE STARTING FROM ZERO
            </div>
            <p className="mt-3 leading-relaxed">
              VS Code is a code editor. The Claude desktop app gives you Claude
              Code (a coding assistant that can read and edit files in this
              folder). The repo is the starter project. <code className="code">npm install</code>{" "}
              pulls down everything Next.js and friends need to run. <code className="code">npm run dev</code>{" "}
              starts a local web server on{" "}
              <span className="text-accent">localhost:3000</span> — that's
              what you're looking at.
            </p>
          </div>
        </div>
      </Stage>

      {/* Stage 2 — Build */}
      <Stage
        n="02"
        kicker="STAGE TWO"
        state="ACTIVE"
        title="Build something cool."
        subtitle="VS Code + Claude Code + this browser tab. The fastest creative loop you'll ever have."
      >
        <ol className="grid gap-px overflow-hidden border border-line bg-line md:grid-cols-2">
          {STAGE_2_STEPS.map((s, i) => (
            <li key={s.title} className="bg-panel p-6 sm:p-8">
              <div className="text-xs text-fg-dim">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-fg">
                {s.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted">
                {s.body}
              </p>
            </li>
          ))}
        </ol>

        {/* Starter prompts */}
        <div className="mt-16">
          <div className="text-xs font-semibold tracking-[0.2em] text-accent">
            STARTER PROMPTS
          </div>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            Steal one. Or invent your own.
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted">
            The interesting builds are the ones nobody asked for. These are
            just to get you off zero.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PROMPTS.map((p) => {
              const colorClasses = {
                accent: "border-accent/30 bg-accent/[0.03] hover:border-accent/60 hover:shadow-[0_0_30px_-5px_rgba(163,255,18,0.35)]",
                info: "border-info/30 bg-info/[0.03] hover:border-info/60 hover:shadow-[0_0_30px_-5px_rgba(90,209,255,0.35)]",
                warn: "border-warn/30 bg-warn/[0.03] hover:border-warn/60 hover:shadow-[0_0_30px_-5px_rgba(255,182,39,0.35)]",
                pink: "border-pink/30 bg-pink/[0.03] hover:border-pink/60 hover:shadow-[0_0_30px_-5px_rgba(255,77,141,0.35)]",
              };

              const tagColorClasses = {
                accent: "text-accent border-accent/40",
                info: "text-info border-info/40",
                warn: "text-warn border-warn/40",
                pink: "text-pink border-pink/40",
              };

              const liveColorClasses = {
                accent: "text-accent",
                info: "text-info",
                warn: "text-warn",
                pink: "text-pink",
              };

              return (
                <Link
                  key={p.title}
                  href={`/${p.slug}`}
                  className={`group relative flex flex-col gap-3 rounded-sm border p-6 transition-all sm:p-8 cursor-pointer hover:bg-bg-soft hover:z-10 ${colorClasses[p.color as keyof typeof colorClasses]}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`rounded-sm border bg-bg px-2 py-0.5 text-[10px] font-semibold tracking-widest ${tagColorClasses[p.color as keyof typeof tagColorClasses]}`}>
                      {p.tag}
                    </span>
                    <span className={`text-[10px] font-semibold tracking-widest ${liveColorClasses[p.color as keyof typeof liveColorClasses]}`}>
                      ● LIVE
                    </span>
                  </div>
                  <h3 className="text-2xl font-semibold tracking-tight text-fg">
                    {p.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-fg-muted">
                    {p.body}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-fg-dim">
                    <span>/{p.slug}</span>
                    <span className={`transition-transform group-hover:translate-x-1 ${liveColorClasses[p.color as keyof typeof liveColorClasses]}`}>
                      →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* APIs available */}
          <div className="mt-8 rounded-sm border border-line bg-panel p-6">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <span className="text-xs text-fg-dim tracking-[0.2em]">
                WIRED UP IN .ENV →
              </span>
              {APIS.map((api) => (
                <span
                  key={api.name}
                  className="flex items-center gap-2 text-xs text-fg"
                >
                  <span
                    className={
                      api.color === "accent"
                        ? "h-1.5 w-1.5 rounded-full bg-accent"
                        : api.color === "info"
                          ? "h-1.5 w-1.5 rounded-full bg-info"
                          : api.color === "warn"
                            ? "h-1.5 w-1.5 rounded-full bg-warn"
                            : "h-1.5 w-1.5 rounded-full bg-pink"
                    }
                  />
                  {api.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Stage>

      {/* Stage 3 — Ship */}
      <Stage
        n="03"
        kicker="STAGE THREE"
        state="NEXT"
        title="Push it live."
        subtitle="GitHub stores your code. Vercel turns it into a real URL on the internet. Both are free."
      >
        <ol className="grid gap-px overflow-hidden border border-line bg-line md:grid-cols-2">
          {STAGE_3_STEPS.map((s, i) => (
            <li key={s.title} className="bg-panel p-6 sm:p-8">
              <div className="text-xs text-fg-dim">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-fg">
                {s.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted">
                {s.body}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-8 grid gap-px overflow-hidden border border-line bg-line md:grid-cols-2">
          <Glossary
            term="GitHub"
            body="Cloud storage for code. Each project lives in a 'repo'. Public repos are visible to the internet, private repos aren't. Free for both."
          />
          <Glossary
            term="Vercel"
            body="A hosting platform that watches your GitHub repo. Every time you push a new commit, Vercel builds and deploys it automatically. Free for personal projects."
          />
        </div>
      </Stage>

      <footer className="border-b border-line bg-bg-soft/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 text-xs text-fg-dim sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-accent">●</span>
            <span>impact3 retreat · ai day · sandbox</span>
          </div>
          <div className="flex items-center gap-4">
            <span>built for one day, then archived</span>
            <span>·</span>
            <span className="cursor">have fun</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stage({
  n,
  kicker,
  state,
  title,
  subtitle,
  children,
}: {
  n: string;
  kicker: string;
  state: "DONE" | "ACTIVE" | "NEXT";
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const stateStyles =
    state === "DONE"
      ? "border-accent/40 bg-accent/10 text-accent"
      : state === "ACTIVE"
        ? "border-warn/40 bg-warn/10 text-warn"
        : "border-line bg-bg text-fg-dim";
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 text-xs font-semibold tracking-[0.2em] text-accent">
              <span className="text-fg-dim">{n}</span>
              <span>/</span>
              <span>{kicker}</span>
            </div>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-base">
                {subtitle}
              </p>
            ) : null}
          </div>
          <span
            className={`shrink-0 rounded-sm border px-3 py-1 text-[11px] font-semibold tracking-widest ${stateStyles}`}
          >
            {state === "DONE"
              ? "✓ DONE"
              : state === "ACTIVE"
                ? "▶ YOU ARE HERE"
                : "○ UP NEXT"}
          </span>
        </div>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

function Glossary({ term, body }: { term: string; body: string }) {
  return (
    <div className="bg-panel p-6">
      <div className="text-xs font-semibold tracking-[0.2em] text-fg-dim">
        WHAT IS
      </div>
      <h4 className="mt-2 text-xl font-semibold tracking-tight text-fg">
        {term}?
      </h4>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted">{body}</p>
    </div>
  );
}
