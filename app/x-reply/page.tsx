"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { fetchTweetAction, generateRepliesAction } from "./actions";
import type { Tweet, Media } from "@/lib/x";
import type { Reply, ReplyAngle } from "@/lib/anthropic";

const ANGLE_LABELS: Record<ReplyAngle, string> = {
  INSIGHT: "INSIGHT",
  AGREE_EXTEND: "AGREE + EXTEND",
  CONTRARIAN: "CONTRARIAN",
  QUESTION: "QUESTION",
  HUMOR: "HUMOR",
};

const ANGLE_COLORS: Record<ReplyAngle, string> = {
  INSIGHT: "text-accent border-accent/40 bg-accent/5",
  AGREE_EXTEND: "text-info border-info/40 bg-info/5",
  CONTRARIAN: "text-warn border-warn/40 bg-warn/5",
  QUESTION: "text-pink border-pink/40 bg-pink/5",
  HUMOR: "text-fg border-line bg-bg-soft",
};

export default function XReplyPage() {
  const [url, setUrl] = useState("");
  const [tweet, setTweet] = useState<Tweet | null>(null);
  const [replies, setReplies] = useState<Reply[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasRolled, setHasRolled] = useState(false);
  const [fetching, startFetch] = useTransition();
  const [generating, startGenerate] = useTransition();

  function onLoadTweet(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError(null);
    setReplies(null);
    setHasRolled(false);
    startFetch(async () => {
      const res = await fetchTweetAction(url.trim());
      if (!res.ok) {
        setError(res.error);
        setTweet(null);
        return;
      }
      setTweet(res.tweet);
      // Auto-roll on load.
      startGenerate(async () => {
        const out = await generateRepliesAction(res.tweet);
        if (!out.ok) {
          setError(out.error);
          return;
        }
        setReplies(out.replies);
        setHasRolled(true);
      });
    });
  }

  function onRoll() {
    if (!tweet) return;
    setError(null);
    startGenerate(async () => {
      const out = await generateRepliesAction(tweet);
      if (!out.ok) {
        setError(out.error);
        return;
      }
      setReplies(out.replies);
      setHasRolled(true);
    });
  }

  return (
    <div className="relative z-10 flex flex-1 flex-col text-fg">
      {/* Status bar */}
      <header className="border-b border-line bg-bg-soft/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-3 text-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-fg-muted transition-colors hover:text-fg"
            >
              ← <span className="text-fg-dim">i3</span> sandbox
            </Link>
            <span className="text-fg-dim">·</span>
            <span className="text-fg-muted">
              build / <span className="text-accent">x-reply</span>
            </span>
          </div>
          <div className="hidden items-center gap-4 text-fg-muted md:flex">
            <span>localhost:3000/x-reply</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 pt-12 pb-10">
          <div className="text-xs font-semibold tracking-[0.2em] text-accent">
            REPLY GUY · ASSEMBLED
          </div>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Paste a post.{" "}
            <span className="text-fg-dim">Get five replies.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-base">
            Five distinct angles — insight, agree+extend, contrarian, question,
            humor. Pick the one you like and ship it. Roll again if they're
            mid.
          </p>
        </div>
      </section>

      {/* URL input */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <form onSubmit={onLoadTweet} className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 items-center gap-3 rounded-sm border border-line bg-panel px-4 py-3 focus-within:border-accent">
              <span className="text-xs text-fg-dim">URL</span>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://x.com/anyhandle/status/1234567890"
                className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-dim focus:outline-none"
                disabled={fetching || generating}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <button
              type="submit"
              disabled={fetching || generating || !url.trim()}
              className="rounded-sm border border-accent/60 bg-accent/10 px-6 py-3 text-sm font-semibold tracking-widest text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {fetching ? "FETCHING..." : "LOAD POST"}
            </button>
          </form>

          {error ? (
            <div className="mt-4 rounded-sm border border-warn/40 bg-warn/5 px-4 py-3 text-sm text-warn">
              {error}
            </div>
          ) : null}
        </div>
      </section>

      {/* Tweet + Replies thread */}
      {tweet ? (
        <section className="border-b border-line">
          <div className="mx-auto max-w-5xl px-6 py-10">
            <div className="mx-auto w-full max-w-[600px]">
              <TweetCard tweet={tweet} />

              {/* Thread connector */}
              <div className="ml-[27px] h-6 w-0.5 bg-[#2f3336]" />

              {/* Loading skeleton */}
              {generating && !replies ? (
                <div className="rounded-2xl border border-[#2f3336] bg-black p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-[#1d1f23]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-24 animate-pulse bg-[#1d1f23]" />
                      <div className="h-3 w-full animate-pulse bg-[#1d1f23]" />
                      <div className="h-3 w-5/6 animate-pulse bg-[#1d1f23]" />
                    </div>
                  </div>
                </div>
              ) : null}

              {replies ? (
                <ReplyCarousel
                  replies={replies}
                  tweetId={tweet.id}
                  tweetAuthor={tweet.author.username}
                  onRoll={onRoll}
                  rolling={generating}
                />
              ) : null}

              {/* Hint */}
              {hasRolled ? (
                <div className="mt-6 rounded-sm border border-line bg-panel p-5">
                  <div className="text-[10px] font-semibold tracking-[0.2em] text-accent">
                    ↑ NEXT LEVEL
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                    Replies feel off? Ask Claude:{" "}
                    <span className="text-fg">
                      "On the x-reply page, can we add a voice trainer? Point it at any X account, learn
                      how they write, and use that voice for generating the replies."
                    </span>
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <footer className="border-b border-line bg-bg-soft/40">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-6 text-xs text-fg-dim sm:flex-row sm:items-center sm:justify-between">
          <div>impact3 retreat · build · x-reply</div>
          <Link href="/" className="hover:text-accent">
            ← back to sandbox
          </Link>
        </div>
      </footer>
    </div>
  );
}

/* ---------- X-faithful tweet card ---------- */

function TweetCard({ tweet, embedded = false }: { tweet: Tweet | Omit<Tweet, "quoted">; embedded?: boolean }) {
  const t = tweet as Tweet;
  return (
    <article
      className={
        embedded
          ? "rounded-2xl border border-[#2f3336] p-3"
          : "rounded-2xl border border-[#2f3336] bg-black p-4 sm:p-5"
      }
      style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif" }}
    >
      {/* Header */}
      <header className="flex items-start gap-3">
        {tweet.author.profile_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tweet.author.profile_image_url}
            alt=""
            className={embedded ? "h-6 w-6 rounded-full" : "h-10 w-10 rounded-full"}
          />
        ) : (
          <div
            className={
              embedded
                ? "h-6 w-6 rounded-full bg-[#1d1f23]"
                : "h-10 w-10 rounded-full bg-[#1d1f23]"
            }
          />
        )}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0">
          <span className="truncate text-[15px] font-bold text-[#e7e9ea]">
            {tweet.author.name}
          </span>
          {tweet.author.verified ? (
            <VerifiedBadge />
          ) : null}
          <span className="truncate text-[15px] text-[#71767b]">
            @{tweet.author.username}
          </span>
          {!embedded && tweet.created_at ? (
            <>
              <span className="text-[15px] text-[#71767b]">·</span>
              <span className="text-[15px] text-[#71767b]">
                {formatDate(tweet.created_at)}
              </span>
            </>
          ) : null}
        </div>
      </header>

      {/* Body */}
      <div
        className={`mt-2 whitespace-pre-wrap break-words text-[#e7e9ea] ${
          embedded ? "text-[14px] leading-snug" : "text-[15px] leading-snug"
        }`}
      >
        {tweet.text}
      </div>

      {/* Media */}
      {tweet.media.length > 0 ? (
        <MediaGrid media={tweet.media} tweetUrl={t.url} />
      ) : null}

      {/* Quoted */}
      {!embedded && (tweet as Tweet).quoted ? (
        <div className="mt-3">
          <TweetCard tweet={(tweet as Tweet).quoted!} embedded />
        </div>
      ) : null}

      {/* Metrics */}
      {!embedded ? (
        <div className="mt-4 flex items-center gap-6 text-[13px] text-[#71767b]">
          <Metric icon="reply" value={tweet.metrics.reply_count} />
          <Metric icon="retweet" value={tweet.metrics.retweet_count} />
          <Metric icon="like" value={tweet.metrics.like_count} />
          {tweet.metrics.impression_count !== undefined ? (
            <Metric icon="views" value={tweet.metrics.impression_count} />
          ) : null}
          <a
            href={t.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto hover:text-[#1d9bf0]"
          >
            View on X →
          </a>
        </div>
      ) : null}
    </article>
  );
}

function MediaGrid({ media, tweetUrl }: { media: Media[]; tweetUrl: string }) {
  const cols = media.length === 1 ? "grid-cols-1" : "grid-cols-2";
  const gap = "gap-0.5";
  return (
    <div className={`mt-3 grid overflow-hidden rounded-2xl border border-[#2f3336] ${cols} ${gap}`}>
      {media.map((m, i) => (
        <a
          key={i}
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block aspect-video bg-[#1d1f23] overflow-hidden"
        >
          {m.type === "photo" && m.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={m.url}
              alt={m.alt_text || ""}
              className="h-full w-full object-cover"
            />
          ) : m.preview_image_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.preview_image_url}
                alt={m.alt_text || ""}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-[#71767b]">
              [{m.type}]
            </div>
          )}
        </a>
      ))}
    </div>
  );
}

function Metric({
  icon,
  value,
}: {
  icon: "reply" | "retweet" | "like" | "views";
  value: number;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <MetricIcon icon={icon} />
      <span>{formatCount(value)}</span>
    </span>
  );
}

function MetricIcon({ icon }: { icon: "reply" | "retweet" | "like" | "views" }) {
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
  // views
  return (
    <svg {...props}>
      <path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z" />
    </svg>
  );
}

function VerifiedBadge() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 22 22"
      aria-label="Verified account"
      className="shrink-0"
    >
      <g>
        <path
          fill="#1d9bf0"
          d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.575 1.817.02.647.219 1.276.575 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
        />
      </g>
    </svg>
  );
}

/* ---------- Reply carousel ---------- */

function ReplyCarousel({
  replies,
  tweetId,
  tweetAuthor,
  onRoll,
  rolling,
}: {
  replies: Reply[];
  tweetId: string;
  tweetAuthor: string;
  onRoll: () => void;
  rolling: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Re-sync active index when replies change (e.g. after a roll).
  useEffect(() => {
    setActiveIndex(0);
    trackRef.current?.scrollTo({ left: 0, behavior: "auto" });
  }, [replies]);

  function scrollTo(i: number) {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(replies.length - 1, i));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  }

  function onScroll() {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== activeIndex) setActiveIndex(i);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-semibold tracking-[0.2em] text-fg-dim">
            PICK A REPLY
          </span>
          <span className="text-fg-dim">·</span>
          <span className="tabular-nums text-fg-muted">
            <span className="text-fg">{activeIndex + 1}</span>
            <span className="text-fg-dim"> / {replies.length}</span>
          </span>
        </div>
        <button
          onClick={onRoll}
          disabled={rolling}
          className="rounded-sm border border-line bg-panel px-3 py-1.5 text-[11px] font-semibold tracking-widest text-fg transition-colors hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {rolling ? "ROLLING..." : "↻ ROLL AGAIN"}
        </button>
      </div>

      {/* Track */}
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="hide-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
        >
          {replies.map((reply, i) => (
            <div
              key={`${reply.angle}-${i}`}
              className="w-full flex-shrink-0 snap-center"
            >
              <ReplyCard
                reply={reply}
                tweetId={tweetId}
                tweetAuthor={tweetAuthor}
              />
            </div>
          ))}
        </div>

        {/* Prev/Next arrows — sit outside the card on md+ viewports */}
        <button
          aria-label="Previous reply"
          onClick={() => scrollTo(activeIndex - 1)}
          disabled={activeIndex === 0}
          className="absolute -left-14 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-panel text-fg transition-colors hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 md:flex"
        >
          ←
        </button>
        <button
          aria-label="Next reply"
          onClick={() => scrollTo(activeIndex + 1)}
          disabled={activeIndex === replies.length - 1}
          className="absolute -right-14 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-panel text-fg transition-colors hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 md:flex"
        >
          →
        </button>
      </div>

      {/* Pagination dots */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {replies.map((_, i) => (
          <button
            key={i}
            aria-label={`Reply ${i + 1}`}
            onClick={() => scrollTo(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === activeIndex
                ? "w-6 bg-accent"
                : "w-1.5 bg-fg-dim hover:bg-fg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- Reply card (X-styled, draft preview) ---------- */

function ReplyCard({
  reply,
  tweetId,
  tweetAuthor,
}: {
  reply: Reply;
  tweetId: string;
  tweetAuthor: string;
}) {
  const intent = `https://x.com/intent/post?text=${encodeURIComponent(reply.text)}&in_reply_to=${tweetId}`;
  const charCount = reply.text.length;
  const overLimit = charCount > 280;

  function onReply() {
    window.open(intent, "_blank", "noopener,noreferrer");
  }

  function onCopy() {
    navigator.clipboard?.writeText(reply.text);
  }

  return (
    <article
      className="rounded-2xl border border-[#2f3336] bg-black p-4 sm:p-5"
      style={{
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Author row */}
      <header className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/favicon.png"
          alt=""
          className="h-10 w-10 shrink-0 rounded-full bg-[#1d1f23] object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5">
            <span className="text-[15px] font-bold text-[#e7e9ea]">You</span>
            <span className="text-[15px] text-[#71767b]">@you</span>
            <span className="text-[15px] text-[#71767b]">·</span>
            <span className="text-[15px] text-[#71767b]">draft</span>
            <span
              className={`ml-auto rounded-sm border px-2 py-0.5 text-[10px] font-semibold tracking-widest ${ANGLE_COLORS[reply.angle]}`}
            >
              {ANGLE_LABELS[reply.angle]}
            </span>
          </div>
          <div className="mt-0.5 text-[13px] text-[#71767b]">
            Replying to{" "}
            <span className="text-[#1d9bf0]">@{tweetAuthor}</span>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-snug text-[#e7e9ea]">
        {reply.text}
      </div>

      {/* Footer: char count + actions */}
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#2f3336] pt-3">
        <span
          className={`text-xs tabular-nums ${
            overLimit ? "text-warn" : "text-[#71767b]"
          }`}
        >
          {charCount}/280
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onCopy}
            className="rounded-full border border-[#2f3336] bg-transparent px-3 py-1.5 text-xs font-semibold tracking-widest text-[#e7e9ea] transition-colors hover:bg-[#16181c]"
            title="Copy reply text"
          >
            COPY
          </button>
          <button
            onClick={onReply}
            className="rounded-full bg-[#1d9bf0] px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#1a8cd8]"
          >
            Reply on X
          </button>
        </div>
      </div>
    </article>
  );
}

/* ---------- Helpers ---------- */

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  if (n < 1_000_000) return Math.floor(n / 1000) + "K";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const sameYear = d.getFullYear() === now.getFullYear();
  const opts: Intl.DateTimeFormatOptions = sameYear
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" };
  return d.toLocaleDateString("en-US", opts);
}
