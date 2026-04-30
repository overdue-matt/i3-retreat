"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { generateNewsPostsAction, type PostVariation } from "./actions";

const ANGLE_COLORS = {
  hot_take: "border-warn/40 bg-warn/5 text-warn",
  explainer: "border-info/40 bg-info/5 text-info",
  contrarian: "border-pink/40 bg-pink/5 text-pink",
};

export default function NewsToPostPage() {
  const [topic, setTopic] = useState("");
  const [targetHandle, setTargetHandle] = useState("");
  const [news, setNews] = useState<string[] | null>(null);
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
                  <div
                    key={i}
                    className="rounded-sm border border-line bg-panel p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 text-xs text-accent">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="text-sm leading-relaxed text-fg">
                        {story}
                      </p>
                    </div>
                  </div>
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

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              {posts.map((post, i) => (
                <PostCard key={i} post={post} />
              ))}
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

  function onCopy() {
    navigator.clipboard?.writeText(post.text);
  }

  function onPost() {
    const intent = `https://x.com/intent/post?text=${encodeURIComponent(post.text)}`;
    window.open(intent, "_blank", "noopener,noreferrer");
  }

  return (
    <article className="flex flex-col rounded-sm border border-line bg-panel">
      {/* Image */}
      {post.image ? (
        <div className="aspect-video w-full overflow-hidden rounded-t-sm border-b border-line bg-bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:${post.image.mimeType};base64,${post.image.base64}`}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-video w-full rounded-t-sm border-b border-line bg-bg flex items-center justify-center">
          <span className="text-xs text-fg-dim">Image generation failed</span>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col p-6">
        <div
          className={`mb-3 inline-flex self-start rounded-sm border px-2 py-0.5 text-[10px] font-semibold tracking-widest ${ANGLE_COLORS[post.angle]}`}
        >
          {post.label}
        </div>

        <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-fg">
          {post.text}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-4">
          <span
            className={`text-xs tabular-nums ${
              overLimit ? "text-warn" : "text-fg-dim"
            }`}
          >
            {charCount}/280
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onCopy}
              className="rounded-sm border border-line bg-bg px-3 py-1.5 text-xs font-semibold tracking-widest text-fg transition-colors hover:border-accent/40 hover:text-accent"
            >
              COPY
            </button>
            <button
              onClick={onPost}
              className="rounded-sm border border-accent/60 bg-accent/10 px-3 py-1.5 text-xs font-semibold tracking-widest text-accent transition-colors hover:bg-accent/20"
            >
              POST
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
