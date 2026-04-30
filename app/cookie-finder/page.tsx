"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { findAction } from "./actions";
import type { AccountBundle, FinderResult } from "@/lib/cookie-finder";
import type { CookieAccount, CookieTweet } from "@/lib/cookie3";

const EXAMPLES: Array<{ topic: string; label: string; tag: string }> = [
  { topic: "bitcoin", label: "Bitcoin", tag: "L1" },
  { topic: "skyecosystem", label: "Sky Ecosystem", tag: "DEFI" },
  { topic: "sharplink", label: "SharpLink", tag: "TREASURY" },
  { topic: "ethereum", label: "Ethereum", tag: "L1" },
  { topic: "polymarket", label: "Polymarket", tag: "PREDICTION" },
];

export default function CookieFinderPage() {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<FinderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();

  function runSearch(input: string) {
    const value = input.trim();
    if (!value) return;
    setTopic(value);
    setError(null);
    setResult(null);
    startSearch(async () => {
      const res = await findAction(value);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res.result);
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch(topic);
  }

  function onReset() {
    setResult(null);
    setError(null);
    setTopic("");
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
              build / <span className="text-accent">cookie-finder</span>
            </span>
            {result ? (
              <>
                <span className="text-fg-dim">·</span>
                <span className="text-fg-muted">
                  topic / <span className="text-fg">{result.topic}</span>
                </span>
              </>
            ) : null}
          </div>
          <div className="hidden items-center gap-4 text-fg-muted md:flex">
            <span>localhost:3000/cookie-finder</span>
          </div>
        </div>
      </header>

      {/* Empty state — hero + topic input + chips */}
      {!result ? (
        <>
          <section className="border-b border-line">
            <div className="mx-auto max-w-6xl px-6 pt-12 pb-10">
              <div className="text-xs font-semibold tracking-[0.2em] text-accent">
                SMART ACCOUNT FINDER
              </div>
              <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Find the voices that{" "}
                <span className="text-fg-dim">actually matter.</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-base">
                Type any topic. Get the 5 smartest accounts driving the
                conversation, their 5 sharpest takes, and a 30-second narrative
                summary. Cookie3 filters for signal, not volume.
              </p>
            </div>
          </section>

          <section className="border-b border-line">
            <div className="mx-auto max-w-6xl px-6 py-8">
              <form
                onSubmit={onSubmit}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <div className="flex flex-1 items-center gap-3 rounded-sm border border-line bg-panel px-4 py-3 focus-within:border-accent">
                  <span className="text-xs text-fg-dim">TOPIC</span>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. restaking, RWA, memecoin season, ZK rollups"
                    className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-dim focus:outline-none"
                    disabled={searching}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching || !topic.trim()}
                  className="rounded-sm border border-accent/60 bg-accent/10 px-6 py-3 text-sm font-semibold tracking-widest text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {searching ? "SEARCHING..." : "FIND SMART ACCOUNTS"}
                </button>
              </form>

              {searching ? (
                <div className="mt-4 flex items-center gap-3 rounded-sm border border-line bg-panel px-4 py-3 text-sm text-fg-muted">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                  <span>
                    Querying Cookie3 for top voices, pulling each account's
                    feed, ranking the most relevant takes. Takes 10-20 seconds.
                  </span>
                </div>
              ) : null}

              {error ? (
                <div className="mt-4 rounded-sm border border-warn/40 bg-warn/5 px-4 py-3 text-sm text-warn">
                  {error}
                </div>
              ) : null}

              <div className="mt-10">
                <div className="text-[11px] font-semibold tracking-[0.2em] text-fg-dim">
                  OR TRY ONE OF THESE
                </div>
                <div className="mt-3 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex.topic}
                      onClick={() => runSearch(ex.topic)}
                      disabled={searching}
                      className="group flex flex-col items-start gap-1 bg-panel p-4 text-left transition-colors hover:bg-bg-soft disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span className="text-[10px] font-semibold tracking-[0.2em] text-fg-dim">
                        {ex.tag}
                      </span>
                      <span className="text-sm font-semibold text-fg group-hover:text-accent">
                        {ex.label}
                      </span>
                      <span className="text-[11px] text-fg-dim">
                        /{ex.topic}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}

      {/* Loaded state — narrative + 5 account sections */}
      {result ? (
        <section className="border-b border-line">
          <div className="mx-auto max-w-6xl px-6 py-8">
            {/* Topic strip */}
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="text-xs">
                <span className="font-semibold tracking-[0.2em] text-fg-dim">
                  TOPIC
                </span>
                <span className="ml-3 text-fg">{result.topic}</span>
                <span className="ml-3 text-fg-dim">·</span>
                <span className="ml-3 text-fg-muted">
                  {result.bundles.length} smart accounts ·{" "}
                  {result.bundles.reduce((sum, b) => sum + b.tweets.length, 0)} tweets
                </span>
              </div>
              <button
                onClick={onReset}
                className="rounded-sm border border-line bg-panel px-3 py-1.5 text-[11px] font-semibold tracking-widest text-fg-muted transition-colors hover:border-accent/40 hover:text-accent"
              >
                ← NEW SEARCH
              </button>
            </div>

            {/* Narrative summary */}
            {result.narrative ? (
              <div className="mb-8 rounded-sm border border-accent/30 bg-accent/[0.03] p-5">
                <div className="text-[11px] font-semibold tracking-[0.2em] text-accent">
                  ◆ THE NARRATIVE
                </div>
                <p className="mt-2 text-base leading-relaxed text-fg">
                  {result.narrative}
                </p>
              </div>
            ) : null}

            {/* Account sections */}
            <div className="flex flex-col gap-10">
              {result.bundles.map((bundle, i) => (
                <AccountSection
                  key={bundle.account.username}
                  bundle={bundle}
                  rank={i + 1}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Next-level hint */}
      {result ? (
        <section className="border-b border-line">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <div className="rounded-sm border border-line bg-panel p-6">
              <div className="text-[10px] font-semibold tracking-[0.2em] text-accent">
                ↑ NEXT LEVEL
              </div>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                Want to track narratives over time? Ask Claude:{" "}
                <span className="text-fg">
                  "On the cookie-finder page, save my searches and let me come
                  back to compare how the narrative changes over time. Show me
                  which smart accounts moved positions and which takes
                  hardened or flipped."
                </span>
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <footer className="border-b border-line bg-bg-soft/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 text-xs text-fg-dim sm:flex-row sm:items-center sm:justify-between">
          <div>impact3 retreat · build · cookie-finder</div>
          <Link href="/" className="hover:text-accent">
            ← back to sandbox
          </Link>
        </div>
      </footer>
    </div>
  );
}

/* ---------- account section (header + tweets) ---------- */

function AccountSection({
  bundle,
  rank,
}: {
  bundle: AccountBundle;
  rank: number;
}) {
  return (
    <div>
      <AccountHeader account={bundle.account} rank={rank} />
      <div className="mt-3 flex flex-col gap-3">
        {bundle.tweets.map((tweet) => (
          <TweetCard key={tweet.id} tweet={tweet} account={bundle.account} />
        ))}
      </div>
    </div>
  );
}

function AccountHeader({
  account,
  rank,
}: {
  account: CookieAccount;
  rank: number;
}) {
  return (
    <div className="rounded-sm border border-line bg-panel p-5">
      <div className="flex items-start gap-4">
        <Avatar
          src={account.profile_image_url}
          name={account.display_name || account.username}
          size={56}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold tracking-[0.2em] text-accent">
              #{String(rank).padStart(2, "0")}
            </span>
            <span className="truncate text-base font-semibold text-fg">
              {account.display_name || account.username}
            </span>
            {account.verified ? <VerifiedBadge /> : null}
          </div>
          <a
            href={`https://x.com/${account.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-fg-muted hover:text-info hover:underline"
          >
            @{account.username}
          </a>
          {account.bio ? (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-fg-muted">
              {account.bio}
            </p>
          ) : null}
        </div>
      </div>

      {/* Cookie3-specific metrics */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric
          label="MINDSHARE"
          value={formatMindshare(account.mindshare)}
          accent
        />
        <Metric
          label="SMART FOLLOWERS"
          value={formatCount(account.smart_followers_count)}
          accent
        />
        <Metric
          label="FOLLOWERS"
          value={formatCount(account.followers_count)}
        />
        <Metric
          label="SMART ENG. PTS"
          value={formatCount(account.smart_engagement_points)}
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-sm border px-3 py-2 ${
        accent ? "border-accent/30 bg-accent/5" : "border-line bg-bg-soft"
      }`}
    >
      <div
        className={`text-[10px] font-semibold tracking-[0.18em] ${
          accent ? "text-accent" : "text-fg-dim"
        }`}
      >
        {label}
      </div>
      <div className="mt-0.5 text-base font-semibold tabular-nums text-fg">
        {value}
      </div>
    </div>
  );
}

/* ---------- X-faithful tweet card ---------- */

function TweetCard({
  tweet,
  account,
}: {
  tweet: CookieTweet;
  account: CookieAccount;
}) {
  return (
    <article
      className="rounded-2xl border border-[#2f3336] bg-black p-4 sm:p-5"
      style={{
        fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
      }}
    >
      <header className="flex items-start gap-3">
        <Avatar
          src={tweet.author_profile_image_url || account.profile_image_url}
          name={tweet.author_display_name || account.display_name || account.username}
          size={40}
          rounded
        />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0">
          <span className="truncate text-[15px] font-bold text-[#e7e9ea]">
            {tweet.author_display_name || account.display_name || account.username}
          </span>
          {account.verified ? <VerifiedBadge /> : null}
          <span className="truncate text-[15px] text-[#71767b]">
            @{tweet.author_username || account.username}
          </span>
          {tweet.created_at ? (
            <>
              <span className="text-[15px] text-[#71767b]">·</span>
              <span className="text-[15px] text-[#71767b]">
                {formatRelative(tweet.created_at)}
              </span>
            </>
          ) : null}
        </div>
      </header>

      <div className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-snug text-[#e7e9ea]">
        {tweet.text}
      </div>

      {tweet.media.length > 0 ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-[#2f3336]">
          <TweetMedia media={tweet.media[0]} url={tweet.url} />
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-6 text-[13px] text-[#71767b]">
        <Stat icon="reply" value={tweet.replies} />
        <Stat icon="retweet" value={tweet.retweets} />
        <Stat icon="like" value={tweet.likes} />
        <Stat icon="views" value={tweet.impressions} />
        {tweet.smart_engagements > 0 ? (
          <span className="flex items-center gap-1.5 text-accent">
            <span className="text-[10px] font-semibold tracking-[0.18em]">
              ◆ SMART
            </span>
            <span className="tabular-nums">
              {formatCount(tweet.smart_engagements)}
            </span>
          </span>
        ) : null}
        <a
          href={tweet.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto hover:text-[#1d9bf0]"
        >
          View on X →
        </a>
      </div>
    </article>
  );
}

function TweetMedia({
  media,
  url,
}: {
  media: { type: string; url: string; preview_image_url: string | null };
  url: string;
}) {
  const src = media.preview_image_url || media.url;
  if (media.type === "video" || media.type === "gif") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-video w-full bg-[#1d1f23]"
      >
        <SafeImg src={src} className="h-full w-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      <SafeImg
        src={src}
        className="block max-h-[480px] w-full object-cover"
      />
    </a>
  );
}

function Stat({
  icon,
  value,
}: {
  icon: "reply" | "retweet" | "like" | "views";
  value: number;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <StatIcon icon={icon} />
      <span className="tabular-nums">{formatCount(value)}</span>
    </span>
  );
}

function StatIcon({ icon }: { icon: "reply" | "retweet" | "like" | "views" }) {
  const props = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": true,
  };
  if (icon === "reply") {
    return (
      <svg {...props}>
        <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z" />
      </svg>
    );
  }
  if (icon === "retweet") {
    return (
      <svg {...props}>
        <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
      </svg>
    );
  }
  if (icon === "like") {
    return (
      <svg {...props}>
        <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z" />
    </svg>
  );
}

function VerifiedBadge() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 22 22"
      aria-label="Verified account"
      className="shrink-0"
    >
      <path
        fill="#1d9bf0"
        d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.575 1.817.02.647.219 1.276.575 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
      />
    </svg>
  );
}

/* ---------- shared bits ---------- */

function Avatar({
  src,
  name,
  size,
  rounded,
}: {
  src: string | null;
  name: string;
  size: number;
  rounded?: boolean;
}) {
  const [errored, setErrored] = useState(false);
  const initials = (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const radius = rounded ? "rounded-full" : "rounded-md";
  if (!src || errored) {
    return (
      <div
        className={`shrink-0 flex items-center justify-center bg-info/20 text-sm font-semibold text-info ${radius}`}
        style={{ width: size, height: size }}
      >
        {initials || "?"}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={`shrink-0 bg-bg-soft object-cover ${radius}`}
      style={{ width: size, height: size }}
      onError={() => setErrored(true)}
    />
  );
}

function SafeImg({ src, className }: { src: string; className: string }) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-[#1d1f23] text-xs text-[#71767b]`}
      >
        [media unavailable]
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

/* ---------- formatters ---------- */

function formatCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n < 1000) return String(n);
  if (n < 10_000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  if (n < 1_000_000) return Math.floor(n / 1000) + "K";
  if (n < 10_000_000)
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  return Math.floor(n / 1_000_000) + "M";
}

function formatMindshare(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "0";
  // Cookie3 mindshare is typically a small float (e.g. 0.0231 = 2.31%).
  if (n > 0 && n < 1) return (n * 100).toFixed(2) + "%";
  if (n < 100) return n.toFixed(2);
  return formatCount(n);
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}
