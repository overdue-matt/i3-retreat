"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  forecastAction,
  generateDraftAction,
  loadCompanyAction,
} from "./actions";
import type { LinkedInPost } from "@/lib/linkedin";
import type { Forecast } from "@/lib/linkedin-forecast";

type RightTab = "draft" | "generate";

const EXAMPLES: Array<{ slug: string; label: string; tag: string }> = [
  { slug: "litestrategy", label: "Lite Strategy", tag: "CRYPTO" },
  { slug: "jupiter-onchain", label: "Jupiter", tag: "DEFI" },
  { slug: "enlivex", label: "Enlivex", tag: "BIOTECH" },
  { slug: "coinbase", label: "Coinbase", tag: "CRYPTO" },
  { slug: "pepsico", label: "PepsiCo", tag: "CPG" },
];

export default function LinkedInForecastPage() {
  const [urlInput, setUrlInput] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [posts, setPosts] = useState<LinkedInPost[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();

  const [tab, setTab] = useState<RightTab>("draft");
  const [draft, setDraft] = useState("");
  const [topic, setTopic] = useState("");
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [forecasting, startForecast] = useTransition();
  const [generating, startGenerate] = useTransition();

  function loadCompany(input: string) {
    const value = input.trim();
    if (!value) return;
    setUrlInput(value);
    setLoadError(null);
    setPosts(null);
    setSlug(null);
    setForecast(null);
    setDraft("");
    setTopic("");
    startLoad(async () => {
      const res = await loadCompanyAction(value);
      if (!res.ok) {
        setLoadError(res.error);
        return;
      }
      setPosts(res.posts);
      setSlug(res.slug);
    });
  }

  function onLoadCompany(e: React.FormEvent) {
    e.preventDefault();
    loadCompany(urlInput);
  }

  function onForecast() {
    if (!posts || !draft.trim()) return;
    setForecastError(null);
    setForecast(null);
    startForecast(async () => {
      const res = await forecastAction(posts, draft);
      if (!res.ok) {
        setForecastError(res.error);
        return;
      }
      setForecast(res.forecast);
    });
  }

  function onGenerate() {
    if (!posts || !topic.trim()) return;
    setGenerateError(null);
    startGenerate(async () => {
      const res = await generateDraftAction(posts, topic);
      if (!res.ok) {
        setGenerateError(res.error);
        return;
      }
      setDraft(res.draft);
      setForecast(null);
      setTab("draft");
    });
  }

  function onReset() {
    setPosts(null);
    setSlug(null);
    setUrlInput("");
    setLoadError(null);
    setDraft("");
    setTopic("");
    setForecast(null);
    setForecastError(null);
    setGenerateError(null);
  }

  return (
    <div className="relative z-10 flex flex-1 flex-col text-fg">
      {/* Status bar */}
      <header className="border-b border-line bg-bg-soft/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3 text-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-fg-muted transition-colors hover:text-fg"
            >
              ← <span className="text-fg-dim">i3</span> sandbox
            </Link>
            <span className="text-fg-dim">·</span>
            <span className="text-fg-muted">
              build / <span className="text-accent">linkedin-forecast</span>
            </span>
            {slug ? (
              <>
                <span className="text-fg-dim">·</span>
                <span className="text-fg-muted">
                  company / <span className="text-fg">{slug}</span>
                </span>
              </>
            ) : null}
          </div>
          <div className="hidden items-center gap-4 text-fg-muted md:flex">
            <span>localhost:3000/linkedin-forecast</span>
          </div>
        </div>
      </header>

      {/* Empty state — hero + URL input + capabilities */}
      {!posts ? (
        <>
          <section className="border-b border-line">
            <div className="mx-auto max-w-6xl px-6 pt-12 pb-10">
              <div className="text-xs font-semibold tracking-[0.2em] text-accent">
                ENGAGEMENT FORECASTER
              </div>
              <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Predict how your post lands.{" "}
                <span className="text-fg-dim">Before you publish.</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-base">
                Paste a LinkedIn company URL and score
                drafts against their actual history.
              </p>
            </div>
          </section>

          <section className="border-b border-line">
            <div className="mx-auto max-w-6xl px-6 py-8">
              <form
                onSubmit={onLoadCompany}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <div className="flex flex-1 items-center gap-3 rounded-sm border border-line bg-panel px-4 py-3 focus-within:border-accent">
                  <span className="text-xs text-fg-dim">URL</span>
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="linkedin.com/company/stripe  (or just: stripe)"
                    className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-dim focus:outline-none"
                    disabled={loading}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !urlInput.trim()}
                  className="rounded-sm border border-accent/60 bg-accent/10 px-6 py-3 text-sm font-semibold tracking-widest text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? "SCRAPING..." : "LOAD POSTS"}
                </button>
              </form>

              {loading ? (
                <div className="mt-4 flex items-center gap-3 rounded-sm border border-line bg-panel px-4 py-3 text-sm text-fg-muted">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                  <span>
                    Scraping the last 50 posts. Takes a second. 
                  </span>
                </div>
              ) : null}

              {loadError ? (
                <div className="mt-4 rounded-sm border border-warn/40 bg-warn/5 px-4 py-3 text-sm text-warn">
                  {loadError}
                </div>
              ) : null}

              <div className="mt-10">
                <div className="text-[11px] font-semibold tracking-[0.2em] text-fg-dim">
                  OR TRY ONE OF THESE
                </div>
                <div className="mt-3 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex.slug}
                      onClick={() => loadCompany(ex.slug)}
                      disabled={loading}
                      className="group flex flex-col items-start gap-1 bg-panel p-4 text-left transition-colors hover:bg-bg-soft disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span className="text-[10px] font-semibold tracking-[0.2em] text-fg-dim">
                        {ex.tag}
                      </span>
                      <span className="text-sm font-semibold text-fg group-hover:text-accent">
                        {ex.label}
                      </span>
                      <span className="text-[11px] text-fg-dim">
                        /{ex.slug}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}

      {/* Loaded state — two columns, each scrolls independently on lg+ */}
      {posts ? (
        <section className="border-b border-line">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
            {/* Left: feed */}
            <div className="min-w-0 lg:h-[calc(100vh-120px)] lg:overflow-y-auto lg:pr-3">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="font-semibold tracking-[0.2em] text-fg-dim">
                    FEED
                  </span>
                  <span className="ml-3 text-fg-muted">
                    {posts.length} posts ·{" "}
                    <a
                      href={`https://linkedin.com/company/${slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-info hover:underline"
                    >
                      linkedin.com/company/{slug}
                    </a>
                  </span>
                </div>
                <button
                  onClick={onReset}
                  className="rounded-sm border border-line bg-panel px-3 py-1.5 text-[11px] font-semibold tracking-widest text-fg-muted transition-colors hover:border-accent/40 hover:text-accent"
                >
                  ← LOAD ANOTHER
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {posts.map((p) => (
                  <LinkedInCard
                    key={p.activity_urn}
                    post={p}
                    highlighted={
                      forecast?.similar_post_urns.includes(p.activity_urn) ??
                      false
                    }
                  />
                ))}
              </div>
            </div>

            {/* Right: forecaster */}
            <div className="min-w-0 lg:h-[calc(100vh-120px)] lg:overflow-y-auto lg:pr-3">
              <div className="mb-4 flex items-center gap-1 rounded-sm border border-line bg-panel p-1">
                <TabButton
                  active={tab === "draft"}
                  onClick={() => setTab("draft")}
                >
                  DRAFT · FORECAST
                </TabButton>
                <TabButton
                  active={tab === "generate"}
                  onClick={() => setTab("generate")}
                >
                  GENERATE FROM TOPIC ✨
                </TabButton>
              </div>

              {tab === "draft" ? (
                <DraftPanel
                  draft={draft}
                  setDraft={setDraft}
                  onForecast={onForecast}
                  forecasting={forecasting}
                  forecast={forecast}
                  error={forecastError}
                  posts={posts}
                />
              ) : (
                <GeneratePanel
                  topic={topic}
                  setTopic={setTopic}
                  onGenerate={onGenerate}
                  generating={generating}
                  error={generateError}
                />
              )}
            </div>
          </div>
        </section>
      ) : null}

      {posts && forecast && !forecasting ? (
        <section className="border-b border-line">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <div className="rounded-sm border border-line bg-panel p-6">
              <div className="text-[10px] font-semibold tracking-[0.2em] text-accent">
                ↑ NEXT LEVEL
              </div>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                LinkedIn's native analytics are shit. Ask Claude:{" "}
                <span className="text-fg">
                  "Build me a LinkedIn analytics dashboard at
                  /linkedin-analytics. Same URL input as the forecaster, but
                  instead of scoring drafts, turn the data into the dashboard
                  LinkedIn refuses to build: post-by-post engagement timeline,
                  the 5 posts driving most of it, format breakdown (image vs
                  video vs PDF), audience makeup from reaction types, and a
                  heatmap of when to post."
                </span>
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <footer className="border-b border-line bg-bg-soft/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 text-xs text-fg-dim sm:flex-row sm:items-center sm:justify-between">
          <div>impact3 retreat · build · linkedin-forecast</div>
          <Link href="/" className="hover:text-accent">
            ← back to sandbox
          </Link>
        </div>
      </footer>
    </div>
  );
}

/* ---------- right panel: draft + forecast ---------- */

function DraftPanel({
  draft,
  setDraft,
  onForecast,
  forecasting,
  forecast,
  error,
  posts,
}: {
  draft: string;
  setDraft: (v: string) => void;
  onForecast: () => void;
  forecasting: boolean;
  forecast: Forecast | null;
  error: string | null;
  posts: LinkedInPost[];
}) {
  const charCount = draft.length;
  const canForecast = draft.trim().length >= 10 && !forecasting;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-sm border border-line bg-panel p-4">
        <label className="text-[11px] font-semibold tracking-[0.2em] text-fg-dim">
          DRAFT POST
        </label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Paste or write a LinkedIn post here. We'll forecast how it lands against this company's last 50 posts."
          rows={10}
          className="mt-2 w-full resize-y rounded-sm border border-line bg-bg px-3 py-3 text-sm text-fg placeholder:text-fg-dim focus:border-accent focus:outline-none"
          disabled={forecasting}
          spellCheck={false}
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs tabular-nums text-fg-dim">
            {charCount} chars
          </span>
          <button
            onClick={onForecast}
            disabled={!canForecast}
            className="rounded-sm border border-accent/60 bg-accent/10 px-5 py-2 text-xs font-semibold tracking-widest text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {forecasting ? "FORECASTING..." : "FORECAST →"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-sm border border-warn/40 bg-warn/5 px-4 py-3 text-sm text-warn">
          {error}
        </div>
      ) : null}

      {forecasting ? <ForecastSkeleton /> : null}

      {forecast && !forecasting ? (
        <ForecastResult forecast={forecast} posts={posts} />
      ) : null}
    </div>
  );
}

function ForecastSkeleton() {
  return (
    <div className="rounded-sm border border-line bg-panel p-5">
      <div className="text-[11px] font-semibold tracking-[0.2em] text-fg-dim">
        ANALYZING...
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-sm bg-bg-soft"
          />
        ))}
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-bg-soft" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-bg-soft" />
        <div className="h-3 w-4/6 animate-pulse rounded bg-bg-soft" />
      </div>
    </div>
  );
}

function ForecastResult({
  forecast,
  posts,
}: {
  forecast: Forecast;
  posts: LinkedInPost[];
}) {
  const topPercent = Math.max(1, 100 - forecast.percentile);
  const isHighTier = forecast.percentile >= 50;
  const rankLabel = isHighTier
    ? `top ${topPercent}%`
    : `beats ${forecast.percentile}%`;
  const tier =
    forecast.percentile >= 80
      ? { label: "STRONG", color: "text-accent border-accent/40 bg-accent/5" }
      : forecast.percentile >= 50
        ? { label: "AVERAGE", color: "text-info border-info/40 bg-info/5" }
        : forecast.percentile >= 25
          ? { label: "WEAK", color: "text-warn border-warn/40 bg-warn/5" }
          : { label: "FLOP", color: "text-pink border-pink/40 bg-pink/5" };

  const similar = forecast.similar_post_urns
    .map((urn) => posts.find((p) => p.activity_urn === urn))
    .filter((p): p is LinkedInPost => p !== undefined);

  return (
    <div className="flex flex-col gap-4">
      {/* Top tier banner */}
      <div className={`flex items-center justify-between gap-3 rounded-sm border px-4 py-3 ${tier.color}`}>
        <div className="flex items-baseline gap-3">
          <span className="text-[10px] font-semibold tracking-[0.2em]">
            FORECAST
          </span>
          <span className="text-xs font-semibold tracking-widest">
            {tier.label}
          </span>
        </div>
        <div className="text-xs">
          <span className="font-semibold tabular-nums">{rankLabel}</span>{" "}
          <span className="opacity-70">of their posts</span>
        </div>
      </div>

      {/* Numbers */}
      <div className="grid grid-cols-3 gap-2">
        <Stat
          label="REACTIONS"
          value={forecast.predicted_reactions}
          icon={<HeartIcon />}
        />
        <Stat
          label="COMMENTS"
          value={forecast.predicted_comments}
          icon={<CommentIcon />}
        />
        <Stat
          label="REPOSTS"
          value={forecast.predicted_reposts}
          icon={<RepostIcon />}
        />
      </div>

      {/* Rationale */}
      {forecast.rationale ? (
        <div className="rounded-sm border border-line bg-panel p-4">
          <div className="text-[11px] font-semibold tracking-[0.2em] text-fg-dim">
            WHY THIS SCORE
          </div>
          <p className="mt-2 text-sm leading-relaxed text-fg">
            {forecast.rationale}
          </p>
        </div>
      ) : null}

      {/* Edits */}
      {forecast.edits.length > 0 ? (
        <div className="rounded-sm border border-accent/30 bg-accent/[0.03] p-4">
          <div className="text-[11px] font-semibold tracking-[0.2em] text-accent">
            ↑ EDITS TO PUSH IT UP
          </div>
          <ol className="mt-3 space-y-3">
            {forecast.edits.map((edit, i) => (
              <li
                key={i}
                className="flex gap-3 text-sm leading-relaxed text-fg"
              >
                <span className="shrink-0 font-semibold text-accent tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{edit}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {/* Similar posts — actual preview cards */}
      {similar.length > 0 ? (
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-[11px] font-semibold tracking-[0.2em] text-fg-dim">
              MOST SIMILAR PAST POSTS
            </div>
            <div className="text-[10px] tracking-widest text-fg-dim">
              ◆ HIGHLIGHTED IN FEED
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {similar.map((p) => (
              <LinkedInCard
                key={p.activity_urn}
                post={p}
                highlighted={false}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-sm border border-line bg-panel p-3">
      <div className="flex items-center gap-1.5 text-fg-dim">
        {icon}
        <span className="text-[10px] font-semibold tracking-[0.18em]">
          {label}
        </span>
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-fg">
        {formatCount(value)}
      </div>
    </div>
  );
}


/* ---------- right panel: generate ---------- */

function GeneratePanel({
  topic,
  setTopic,
  onGenerate,
  generating,
  error,
}: {
  topic: string;
  setTopic: (v: string) => void;
  onGenerate: () => void;
  generating: boolean;
  error: string | null;
}) {
  const canGenerate = topic.trim().length >= 3 && !generating;
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-sm border border-line bg-panel p-4">
        <label className="text-[11px] font-semibold tracking-[0.2em] text-fg-dim">
          TOPIC
        </label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. We just hit 1M users. Or: launching our new pricing tier next week."
          rows={4}
          className="mt-2 w-full resize-y rounded-sm border border-line bg-bg px-3 py-3 text-sm text-fg placeholder:text-fg-dim focus:border-accent focus:outline-none"
          disabled={generating}
          spellCheck={false}
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-fg-dim">
            We'll write it in their voice. You can edit before forecasting.
          </span>
          <button
            onClick={onGenerate}
            disabled={!canGenerate}
            className="rounded-sm border border-accent/60 bg-accent/10 px-5 py-2 text-xs font-semibold tracking-widest text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {generating ? "WRITING..." : "GENERATE ✨"}
          </button>
        </div>
      </div>

      {generating ? (
        <div className="rounded-sm border border-line bg-panel p-5">
          <div className="text-[11px] font-semibold tracking-[0.2em] text-fg-dim">
            DRAFTING IN THEIR VOICE...
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-bg-soft" />
            <div className="h-3 w-11/12 animate-pulse rounded bg-bg-soft" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-bg-soft" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-bg-soft" />
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-sm border border-warn/40 bg-warn/5 px-4 py-3 text-sm text-warn">
          {error}
        </div>
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-sm px-3 py-2 text-[11px] font-semibold tracking-[0.18em] transition-colors ${
        active
          ? "bg-accent/10 text-accent"
          : "text-fg-dim hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- LinkedIn-faithful post card ---------- */

function LinkedInCard({
  post,
  highlighted,
}: {
  post: LinkedInPost;
  highlighted: boolean;
}) {
  return (
    <article
      className={`overflow-hidden rounded-lg border border-line bg-panel text-fg transition-all ${
        highlighted ? "ring-2 ring-accent shadow-[0_0_30px_-5px_var(--accent-glow)]" : ""
      }`}
      style={{
        fontFamily:
          "-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Header */}
      <header className="flex items-start gap-3 px-4 pt-3">
        <CompanyAvatar
          src={post.author.logo_url}
          name={post.author.name}
        />
        <div className="min-w-0 flex-1">
          <a
            href={post.author.company_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-[14px] font-semibold text-fg hover:text-info hover:underline"
          >
            {post.author.name || "(unknown)"}
          </a>
          <div className="text-[12px] text-fg-muted">
            {formatFollowers(post.author.follower_count)} followers
          </div>
          <div className="flex items-center gap-1 text-[12px] text-fg-muted">
            <span>{post.posted_at_relative || formatPostedDate(post.posted_at_iso)}</span>
            <span>·</span>
            <GlobeIcon />
          </div>
        </div>
        {highlighted ? (
          <span className="shrink-0 rounded-sm border border-accent bg-accent/10 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-accent">
            ◆ SIMILAR
          </span>
        ) : null}
      </header>

      {/* Body */}
      <PostBody text={post.text} />

      {/* Media */}
      {post.media && post.media.items.length > 0 ? (
        <PostMedia media={post.media} postUrl={post.post_url} />
      ) : null}

      {/* Document */}
      {post.document ? (
        <PostDocument doc={post.document} postUrl={post.post_url} />
      ) : null}

      {/* Reactions footer */}
      <ReactionsFooter post={post} />
    </article>
  );
}

function CompanyAvatar({ src, name }: { src: string; name: string }) {
  const [errored, setErrored] = useState(false);
  const initials = (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  if (!src || errored) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-info/20 text-sm font-semibold text-info">
        {initials || "?"}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="h-12 w-12 shrink-0 rounded-md bg-bg-soft object-cover"
      onError={() => setErrored(true)}
    />
  );
}

function PostBody({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const limit = 280;
  const isLong = text.length > limit;
  const display = !isLong || expanded ? text : text.slice(0, limit).trimEnd();
  return (
    <div className="px-4 pt-3 text-[14px] leading-[1.45] text-fg">
      <div className="whitespace-pre-wrap break-words">{display}</div>
      {isLong && !expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="mt-1 text-[14px] text-fg-muted hover:text-info hover:underline"
        >
          ...see more
        </button>
      ) : null}
    </div>
  );
}

function PostMedia({
  media,
  postUrl,
}: {
  media: NonNullable<LinkedInPost["media"]>;
  postUrl: string;
}) {
  const items = media.items.slice(0, 4);
  if (items.length === 0) return null;

  if (media.type === "video") {
    const it = items[0];
    const thumb = it.thumbnail || it.url;
    return (
      <a
        href={postUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative mt-3 block aspect-video w-full overflow-hidden bg-black"
      >
        <SafeImg src={thumb} className="h-full w-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/70 backdrop-blur-sm">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </a>
    );
  }

  // Image grid
  if (items.length === 1) {
    return (
      <a
        href={postUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 block w-full overflow-hidden bg-line"
      >
        <SafeImg
          src={items[0].url}
          className="block max-h-[560px] w-full object-cover"
        />
      </a>
    );
  }

  if (items.length === 2) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-px bg-line">
        {items.map((it, i) => (
          <a
            key={i}
            href={postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block aspect-square overflow-hidden"
          >
            <SafeImg src={it.url} className="h-full w-full object-cover" />
          </a>
        ))}
      </div>
    );
  }

  // 3 or 4 images: first big-left, rest stacked-right
  return (
    <div className="mt-3 grid h-[400px] grid-cols-2 gap-px bg-line">
      <a
        href={postUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full overflow-hidden"
      >
        <SafeImg src={items[0].url} className="h-full w-full object-cover" />
      </a>
      <div className="grid grid-rows-2 gap-px">
        {items.slice(1, 3).map((it, i) => (
          <a
            key={i}
            href={postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block h-full overflow-hidden"
          >
            <SafeImg src={it.url} className="h-full w-full object-cover" />
            {i === 1 && items.length > 3 ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-2xl font-semibold text-white">
                +{items.length - 3}
              </div>
            ) : null}
          </a>
        ))}
      </div>
    </div>
  );
}

function SafeImg({ src, className }: { src: string; className: string }) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-bg-soft text-xs text-fg-dim`}
      >
        [media expired]
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={className}
      onError={() => setErrored(true)}
    />
  );
}

function PostDocument({
  doc,
  postUrl,
}: {
  doc: NonNullable<LinkedInPost["document"]>;
  postUrl: string;
}) {
  return (
    <a
      href={postUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 flex items-center gap-3 border-t border-line bg-bg-soft px-4 py-3 hover:bg-bg"
    >
      <div className="flex h-12 w-9 shrink-0 items-center justify-center rounded-sm bg-info text-[10px] font-bold text-white">
        PDF
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-fg">
          {doc.title}
        </div>
        <div className="text-[12px] text-fg-muted">
          {doc.page_count} pages · Document
        </div>
      </div>
    </a>
  );
}

type ReactionKind =
  | "like"
  | "celebrate"
  | "love"
  | "insightful"
  | "support"
  | "funny";

function ReactionsFooter({ post }: { post: LinkedInPost }) {
  const stats = post.stats;
  const reactionKinds: ReactionKind[] = [
    "like",
    "celebrate",
    "love",
    "insightful",
    "support",
    "funny",
  ];
  const topReactions = reactionKinds
    .filter((k) => stats[k] > 0)
    .sort((a, b) => stats[b] - stats[a])
    .slice(0, 3);

  return (
    <div className="mt-3 flex items-center justify-between gap-3 border-t border-line px-4 py-2 text-[12px] text-fg-muted">
      <div className="flex items-center gap-1">
        {topReactions.length > 0 ? (
          <div className="flex -space-x-1">
            {topReactions.map((k) => (
              <span
                key={k}
                className="flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-panel"
              >
                <ReactionIcon kind={k} />
              </span>
            ))}
          </div>
        ) : null}
        <span className="ml-1 tabular-nums">
          {formatCount(stats.total_reactions)}
        </span>
      </div>
      <div className="flex items-center gap-3 tabular-nums">
        {stats.comments > 0 ? <span>{formatCount(stats.comments)} comments</span> : null}
        {stats.reposts > 0 ? <span>{formatCount(stats.reposts)} reposts</span> : null}
      </div>
    </div>
  );
}

/* ---------- icons ---------- */

const REACTION_PALETTE: Record<ReactionKind, { bg: string; emoji: string }> = {
  like: { bg: "#0a66c2", emoji: "👍" },
  celebrate: { bg: "#6dae4f", emoji: "👏" },
  love: { bg: "#df704d", emoji: "❤" },
  insightful: { bg: "#f5bb54", emoji: "💡" },
  support: { bg: "#915be9", emoji: "🤝" },
  funny: { bg: "#5096a6", emoji: "😂" },
};

function ReactionIcon({ kind }: { kind: ReactionKind }) {
  const p = REACTION_PALETTE[kind];
  return (
    <span
      className="flex h-4 w-4 items-center justify-center rounded-full text-[10px]"
      style={{ background: p.bg }}
      aria-hidden
    >
      <span className="leading-none">{p.emoji}</span>
    </span>
  );
}

function HeartIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 21s-7.5-4.6-9.5-9.2C1.1 8.5 3.2 5 6.5 5c2 0 3.6 1.1 4.5 2.6l1 1.4 1-1.4C13.9 6.1 15.5 5 17.5 5c3.3 0 5.4 3.5 4 6.8C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 4h18v12H7l-4 4V4z" />
    </svg>
  );
}

function RepostIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4.5 3.88l4.43 4.14-1.36 1.46L5.5 7.55V16c0 1.1.9 2 2 2H13v2H7.5c-2.2 0-4-1.79-4-4V7.55L1.43 9.48.07 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.2 0 4 1.79 4 4v8.45l2.07-1.93 1.36 1.46-4.43 4.14-4.43-4.14 1.36-1.46 2.07 1.93V8c0-1.1-.9-2-2-2z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 2c1 0 2.4 1.7 3 4h-6c.6-2.3 2-4 3-4zM4.3 9h3.4c-.1.7-.2 1.5-.2 3s.1 2.3.2 3H4.3a8 8 0 010-6zm1.5 8h2.7c.5 1.5 1.2 2.8 2 3.7A8 8 0 015.8 17zM10 15c-.1-.7-.2-1.5-.2-3s.1-2.3.2-3h4c.1.7.2 1.5.2 3s-.1 2.3-.2 3h-4zm2 5c-1 0-2.4-1.7-3-4h6c-.6 2.3-2 4-3 4zm3.7-.3c.7-.9 1.4-2.2 2-3.7h2.7a8 8 0 01-4.7 3.7zM16.5 15c.1-.7.2-1.5.2-3s-.1-2.3-.2-3h3.4a8 8 0 010 6h-3.4zm2-8h-2.7c-.5-1.5-1.2-2.8-2-3.7A8 8 0 0118.5 7zM8.3 7H5.8a8 8 0 014.7-3.7C9.7 4.2 9 5.5 8.3 7z" />
    </svg>
  );
}

/* ---------- helpers ---------- */

function formatCount(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  if (n < 1_000_000) return Math.floor(n / 1000) + "K";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
}

function formatFollowers(n: number): string {
  if (!n) return "0";
  return n.toLocaleString("en-US");
}

function formatPostedDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${Math.max(1, diffMin)}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  const diffWk = Math.floor(diffDay / 7);
  if (diffWk < 5) return `${diffWk}w`;
  const diffMo = Math.floor(diffDay / 30);
  if (diffMo < 12) return `${diffMo}mo`;
  return `${Math.floor(diffDay / 365)}y`;
}

