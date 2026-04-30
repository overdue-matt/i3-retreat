"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { generateNewsPostsAction, type PostVariation } from "./actions";
import type { NewsStory } from "@/lib/xai";

const ANGLE_COLORS = {
  hot_take: "border-warn/40 bg-warn/5 text-warn",
  explainer: "border-info/40 bg-info/5 text-info",
  contrarian: "border-pink/40 bg-pink/5 text-pink",
};

export default function NewsToPostPage() {
  const [topic, setTopic] = useState("");
  const [targetHandle, setTargetHandle] = useState("");
  const [news, setNews] = useState<NewsStory[] | null>(null);
  const [voiceSamples, setVoiceSamples] = useState<string[] | null>(null);
  const [posts, setPosts] = useState<PostVariation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, startGenerate] = useTransition();

  function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || !targetHandle.trim()) return;

    setError(null);
    setNews(null);
    setVoiceSamples(null);
    setPosts(null);

    startGenerate(async () => {
      const cleanHandle = targetHandle.trim().replace(/^@/, "");
      const result = await generateNewsPostsAction(topic.trim(), cleanHandle);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setNews(result.news);
      setVoiceSamples(result.voiceSamples);
      setPosts(result.posts);
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
              build / <span className="text-accent">news-to-post</span>
            </span>
          </div>
          <div className="hidden items-center gap-4 text-fg-muted md:flex">
            <span>localhost:3000/news-to-post</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 pt-12 pb-10">
          <div className="text-xs font-semibold tracking-[0.2em] text-accent">
            NEWS TO POST · ASSEMBLED
          </div>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Topic in. <span className="text-fg-dim">Post out.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-base">
            Research any topic, clone any voice, generate 3 post variations
            with images. Powered by Grok research + X voice analysis + Nano
            Banana visuals.
          </p>
        </div>
      </section>

      {/* Input form */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <form onSubmit={onGenerate} className="space-y-3">
            <div className="flex flex-1 items-center gap-3 rounded-sm border border-line bg-panel px-4 py-3 focus-within:border-accent">
              <span className="text-xs text-fg-dim">TOPIC</span>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="AI regulation, crypto ETFs, climate tech..."
                className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-dim focus:outline-none"
                disabled={generating}
                autoComplete="off"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex flex-1 items-center gap-3 rounded-sm border border-line bg-panel px-4 py-3 focus-within:border-accent">
                <span className="text-xs text-fg-dim">VOICE</span>
                <input
                  type="text"
                  value={targetHandle}
                  onChange={(e) => setTargetHandle(e.target.value)}
                  placeholder="@handle to mimic"
                  className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-dim focus:outline-none"
                  disabled={generating}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <button
                type="submit"
                disabled={generating || !topic.trim() || !targetHandle.trim()}
                className="rounded-sm border border-accent/60 bg-accent/10 px-6 py-3 text-sm font-semibold tracking-widest text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {generating ? "GENERATING..." : "GENERATE"}
              </button>
            </div>
          </form>

          {error ? (
            <div className="mt-4 rounded-sm border border-warn/40 bg-warn/5 px-4 py-3 text-sm text-warn">
              {error}
            </div>
          ) : null}
        </div>
      </section>

      {/* Results */}
      {news && voiceSamples ? (
        <>
          {/* Research section */}
          <section className="border-b border-line">
            <div className="mx-auto max-w-5xl px-6 py-10">
              <div className="text-xs font-semibold tracking-[0.2em] text-accent">
                01 / RESEARCH
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-fg">
                Recent news
              </h2>
              <p className="mt-2 text-sm text-fg-muted">
                Found {news.length} stories from the last 24h
              </p>

              <div className="mt-6 space-y-3">
                {news.map((story, i) => (
                  <a
                    key={i}
                    href={story.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-sm border border-line bg-panel p-4 transition-colors hover:border-accent/40 hover:bg-bg-soft"
                  >
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 text-xs text-accent">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed text-fg">
                          {story.summary}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-fg-dim">
                          <span className="font-semibold">{story.source}</span>
                          <span>·</span>
                          <span className="transition-colors group-hover:text-accent">
                            View source →
                          </span>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>

          {/* Voice section */}
          <section className="border-b border-line">
            <div className="mx-auto max-w-5xl px-6 py-10">
              <div className="text-xs font-semibold tracking-[0.2em] text-accent">
                02 / VOICE ANALYSIS
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-fg">
                @{targetHandle.replace(/^@/, "")} recent posts
              </h2>
              <p className="mt-2 text-sm text-fg-muted">
                Analyzed {voiceSamples.length} posts to learn their style
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {voiceSamples.slice(0, 6).map((sample, i) => (
                  <div
                    key={i}
                    className="rounded-sm border border-line bg-panel p-4"
                  >
                    <p className="text-sm leading-relaxed text-fg-muted">
                      {sample}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : null}

      {/* Posts section */}
      {posts ? (
        <section className="border-b border-line">
          <div className="mx-auto max-w-5xl px-6 py-10">
            <div className="text-xs font-semibold tracking-[0.2em] text-accent">
              03 / GENERATED POSTS
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-fg">
              Pick one and ship it
            </h2>
            <p className="mt-2 text-sm text-fg-muted">
              3 angles, ready to post with images
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, i) => (
                <PostCard key={i} post={post} />
              ))}
            </div>

            {/* Remix hint */}
            <div className="mt-8 rounded-sm border border-accent/20 bg-accent/5 p-6">
              <div className="text-[10px] font-semibold tracking-[0.2em] text-accent">
                ↑ MIX &amp; MATCH
              </div>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                This is a basic combination of Grok search, Gemini for images, and
                the X API. Combine them in any way you want - just ask Claude to build it! :)
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <footer className="border-b border-line bg-bg-soft/40">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-6 text-xs text-fg-dim sm:flex-row sm:items-center sm:justify-between">
          <div>impact3 retreat · build · news-to-post</div>
          <Link href="/" className="hover:text-accent">
            ← back to sandbox
          </Link>
        </div>
      </footer>
    </div>
  );
}

function PostCard({ post }: { post: PostVariation }) {
  const charCount = post.text.length;
  const overLimit = charCount > 280;
  const [copied, setCopied] = useState(false);

  function onCopy() {
    navigator.clipboard?.writeText(post.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function onPost() {
    const intent = `https://x.com/intent/post?text=${encodeURIComponent(post.text)}`;
    window.open(intent, "_blank", "noopener,noreferrer");
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-line bg-panel shadow-sm transition-shadow hover:shadow-[0_0_20px_-8px_var(--accent)]">
      {/* Angle badge */}
      <div className="border-b border-line px-4 py-2">
        <div
          className={`inline-flex rounded-sm border px-2 py-0.5 text-[10px] font-semibold tracking-widest ${ANGLE_COLORS[post.angle]}`}
        >
          {post.label}
        </div>
      </div>

      {/* X-style post layout */}
      <div className="p-4">
        {/* Header: avatar + username */}
        <div className="mb-3 flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/favicon.png"
            alt=""
            className="h-10 w-10 shrink-0 rounded-full border border-line bg-bg"
          />
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-fg">i3 Impact</span>
              <span className="text-fg-dim">·</span>
              <span className="text-sm text-fg-muted">@impact3</span>
            </div>
            <div className="text-xs text-fg-dim">Just now</div>
          </div>
        </div>

        {/* Post text */}
        <p className="mb-3 whitespace-pre-wrap text-[15px] leading-relaxed text-fg">
          {post.text}
        </p>

        {/* Image */}
        {post.image ? (
          <div className="mb-3 overflow-hidden rounded-lg border border-line bg-bg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:${post.image.mimeType};base64,${post.image.base64}`}
              alt=""
              className="w-full object-cover"
            />
          </div>
        ) : (
          <div className="mb-3 flex aspect-video items-center justify-center rounded-lg border border-dashed border-line bg-bg-soft">
            <div className="text-center">
              <div className="text-2xl text-fg-dim">🖼️</div>
              <div className="mt-1 text-xs text-fg-dim">Image unavailable</div>
            </div>
          </div>
        )}

        {/* Character count */}
        <div className="mb-3 flex items-center gap-2 text-xs">
          <span
            className={`tabular-nums ${
              overLimit ? "font-semibold text-warn" : "text-fg-dim"
            }`}
          >
            {charCount}/280
          </span>
          {overLimit ? (
            <span className="text-warn">• Over limit</span>
          ) : null}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onCopy}
            className={`flex-1 rounded-md border px-4 py-2 text-xs font-semibold tracking-wide transition-all ${
              copied
                ? "border-accent bg-accent/10 text-accent"
                : "border-line bg-bg text-fg hover:border-accent/40 hover:bg-bg-soft hover:text-accent"
            }`}
          >
            {copied ? "✓ COPIED" : "COPY TEXT"}
          </button>
          <button
            onClick={onPost}
            className="flex-1 rounded-md border border-accent/60 bg-accent/10 px-4 py-2 text-xs font-semibold tracking-wide text-accent transition-all hover:bg-accent/20"
          >
            POST TO X →
          </button>
        </div>
      </div>
    </article>
  );
}
