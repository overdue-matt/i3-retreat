"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { roastImageAction } from "./actions";

type Loaded = {
  dataUrl: string;
  base64: string;
  mimeType: string;
  name: string;
  sizeBytes: number;
};

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const SAMPLES: { src: string; label: string }[] = [
  { src: "/raul.jpg", label: "RAUL" },
  { src: "/nikita.png", label: "NIKITA" },
  { src: "/rare_matt.png", label: "RARE MATT" },
  { src: "/donald.png", label: "DONALD" },
  { src: "/brian.webp", label: "BRIAN" },
];

export default function RoastPage() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [roasted, setRoasted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [brokenSamples, setBrokenSamples] = useState<Set<string>>(new Set());
  const [roasting, startRoast] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const markSampleBroken = useCallback((src: string) => {
    setBrokenSamples((prev) => {
      if (prev.has(src)) return prev;
      const next = new Set(prev);
      next.add(src);
      return next;
    });
  }, []);

  async function onPickSample(src: string) {
    setError(null);
    try {
      const res = await fetch(src);
      if (!res.ok) {
        markSampleBroken(src);
        throw new Error(`Sample not found: ${src} (drop a jpg at public${src})`);
      }
      const blob = await res.blob();
      const filename = src.split("/").pop() || "sample.jpg";
      const file = new File([blob], filename, {
        type: blob.type || "image/jpeg",
      });
      await ingest(file);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't load that sample.",
      );
    }
  }

  const ingest = useCallback(async (file: File) => {
    setError(null);
    setRoasted(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(
        `Unsupported format (${file.type || "unknown"}). Use PNG, JPEG, WebP, or GIF.`,
      );
      return;
    }

    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const base64 = btoa(binary);
    const dataUrl = `data:${file.type};base64,${base64}`;
    setLoaded({
      dataUrl,
      base64,
      mimeType: file.type,
      name: file.name || "pasted-image",
      sizeBytes: file.size,
    });
  }, []);

  // Global paste listener — pasting a screenshot anywhere on the page works.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void ingest(file);
            return;
          }
        }
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [ingest]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void ingest(file);
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void ingest(file);
    e.target.value = "";
  }

  function onRoast() {
    if (!loaded) return;
    setError(null);
    setRoasted(null);
    startRoast(async () => {
      const out = await roastImageAction(loaded.base64, loaded.mimeType);
      if (!out.ok) {
        setError(out.error);
        return;
      }
      setRoasted(out.dataUrl);
    });
  }

  function onReset() {
    setLoaded(null);
    setRoasted(null);
    setError(null);
  }

  function onDownload() {
    if (!roasted) return;
    const a = document.createElement("a");
    a.href = roasted;
    a.download = `roasted-${Date.now()}.png`;
    a.click();
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
              build / <span className="text-pink">roast</span>
            </span>
          </div>
          <div className="hidden items-center gap-4 text-fg-muted md:flex">
            <span>localhost:3000/roast</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 pt-12 pb-10">
          <div className="text-xs font-semibold tracking-[0.2em] text-pink">
            ROAST GENERATOR · NANO BANANA
          </div>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Drop an image.{" "}
            <span className="text-fg-dim">Get destroyed.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-base">
            Paste, drop, or upload any image. Gemini 2.5 Flash Image (a.k.a.
            Nano Banana) will roast it. Works on screenshots, profile pics, photos of
            your face, anything.
          </p>
        </div>
      </section>

      {/* Drop zone OR original preview */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-10">
          {!loaded ? (
            <div className="flex flex-col gap-6">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`group relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-3 rounded-sm border-2 border-dashed bg-panel p-10 text-center transition-colors ${
                  dragOver
                    ? "border-pink bg-pink/5"
                    : "border-line hover:border-pink/40 hover:bg-bg-soft"
                }`}
              >
                <div className="text-5xl text-fg-dim transition-transform group-hover:scale-110">
                  ⌘V
                </div>
                <div className="text-base font-semibold text-fg">
                  Paste an image, drop one here, or click to upload
                </div>
                <div className="text-xs text-fg-muted">
                  PNG · JPEG · WebP · GIF · max 8 MB
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES.join(",")}
                  onChange={onPickFile}
                  className="hidden"
                />
              </div>

              {/* Samples — quick-pick a roast subject */}
              <div>
                <div className="mb-3 flex items-center gap-3 text-[10px] font-semibold tracking-[0.2em]">
                  <span className="text-fg-dim">OR ROAST ONE OF THESE</span>
                  <span className="h-px flex-1 bg-line" />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
                  {SAMPLES.map((s) => {
                    const broken = brokenSamples.has(s.src);
                    const filename = s.src.replace(/^\//, "");
                    return (
                      <button
                        key={s.src}
                        type="button"
                        onClick={() => onPickSample(s.src)}
                        disabled={broken}
                        title={broken ? `Missing: public/${filename}` : s.label}
                        className={`group relative aspect-square overflow-hidden rounded-sm border bg-panel transition-all ${
                          broken
                            ? "cursor-not-allowed border-line opacity-50"
                            : "cursor-pointer border-line hover:border-pink hover:shadow-[0_0_25px_-8px_var(--pink)]"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.src}
                          alt={s.label}
                          onError={() => markSampleBroken(s.src)}
                          className={`h-full w-full object-cover transition-transform group-hover:scale-105 ${broken ? "hidden" : ""}`}
                        />
                        {broken ? (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center">
                            <div className="text-[9px] font-semibold tracking-widest text-fg-dim">
                              MISSING
                            </div>
                            <div className="break-all text-[9px] leading-tight text-fg-muted">
                              public/
                              <br />
                              {filename}
                            </div>
                          </div>
                        ) : (
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t from-black/90 via-black/30 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <span className="text-[10px] font-semibold tracking-widest text-white">
                              ROAST {s.label}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-semibold tracking-[0.2em] text-fg-dim">
                    LOADED
                  </span>
                  <span className="text-fg-dim">·</span>
                  <span className="truncate text-fg-muted">{loaded.name}</span>
                  <span className="text-fg-dim">
                    ({(loaded.sizeBytes / 1024).toFixed(0)} KB)
                  </span>
                </div>
                <button
                  onClick={onReset}
                  disabled={roasting}
                  className="rounded-sm border border-line bg-panel px-3 py-1.5 text-[11px] font-semibold tracking-widest text-fg transition-colors hover:border-pink/40 hover:text-pink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ↻ START OVER
                </button>
              </div>

              {/* Side-by-side: original | roasted */}
              <div className="grid gap-4 md:grid-cols-2">
                <ImagePanel label="ORIGINAL" tone="muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={loaded.dataUrl}
                    alt="original"
                    className="block h-auto w-full"
                  />
                </ImagePanel>

                <ImagePanel
                  label={roasted ? "ROASTED" : roasting ? "COOKING..." : "ROASTED"}
                  tone="pink"
                >
                  {roasted ? (
                    <button
                      type="button"
                      onClick={() => setFullscreen(true)}
                      className="group relative block w-full cursor-zoom-in overflow-hidden"
                      title="Click to view fullscreen"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={roasted}
                        alt="roasted"
                        className="block h-auto w-full transition-transform group-hover:scale-[1.02]"
                      />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                        <span className="rounded-sm border border-white/40 bg-black/60 px-3 py-1.5 text-[10px] font-semibold tracking-widest text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                          ⤢ VIEW FULLSCREEN
                        </span>
                      </div>
                    </button>
                  ) : roasting ? (
                    <RoastingSkeleton />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-bg-soft p-8 text-center text-sm text-fg-dim">
                      Hit{" "}
                      <span className="mx-1.5 text-pink">ROAST IT</span> to send
                      this to Nano Banana.
                    </div>
                  )}
                </ImagePanel>
              </div>

              {/* Next level hint, shown once a roast lands */}
              {roasted ? (
                <div className="rounded-sm border border-line bg-panel p-5">
                  <div className="text-[10px] font-semibold tracking-[0.2em] text-pink">
                    ↑ NEXT LEVEL
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                    Like this? Remix the idea. Ask Claude:{" "}
                    <span className="text-fg">
                      &ldquo;Rebuild the /roast tool so we can drop in a 
                      headshot and get one back. But instead
                      of overlaying red-ink roasts, Nano Banana re-renders the
                      person AS a chosen persona: Andrew Tate, British grandma,
                      Reddit mod, NPC, Renaissance noble. Keep their face,
                      change everything else.&rdquo;
                    </span>
                  </p>
                </div>
              ) : null}

              {/* Action row */}
              <div className="flex flex-wrap items-center justify-end gap-3">
                {roasted ? (
                  <button
                    onClick={onDownload}
                    className="rounded-sm border border-line bg-panel px-5 py-3 text-sm font-semibold tracking-widest text-fg transition-colors hover:border-accent/40 hover:text-accent"
                  >
                    ↓ DOWNLOAD
                  </button>
                ) : null}
                <button
                  onClick={onRoast}
                  disabled={roasting}
                  className="rounded-sm border border-pink/60 bg-pink/10 px-6 py-3 text-sm font-semibold tracking-widest text-pink transition-colors hover:bg-pink/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {roasting
                    ? "ROASTING..."
                    : roasted
                      ? "↻ ROAST AGAIN"
                      : "🔥 ROAST IT"}
                </button>
              </div>
            </div>
          )}

          {error ? (
            <div className="mt-4 rounded-sm border border-warn/40 bg-warn/5 px-4 py-3 text-sm text-warn">
              {error}
            </div>
          ) : null}
        </div>
      </section>

      <footer className="border-b border-line bg-bg-soft/40">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-6 text-xs text-fg-dim sm:flex-row sm:items-center sm:justify-between">
          <div>impact3 retreat · build · roast</div>
          <Link href="/" className="hover:text-pink">
            ← back to sandbox
          </Link>
        </div>
      </footer>

      {fullscreen && roasted ? (
        <Lightbox src={roasted} onClose={() => setFullscreen(false)} />
      ) : null}
    </div>
  );
}

function ImagePanel({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "muted" | "pink";
  children: React.ReactNode;
}) {
  const labelColor = tone === "pink" ? "text-pink" : "text-fg-dim";
  return (
    <div className="overflow-hidden rounded-sm border border-line bg-panel">
      <div className={`border-b border-line px-3 py-2 text-[10px] font-semibold tracking-[0.2em] ${labelColor}`}>
        {label}
      </div>
      <div className="bg-bg">{children}</div>
    </div>
  );
}

function RoastingSkeleton() {
  return (
    <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-bg-soft">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-pink/10 via-transparent to-pink/10" />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <div className="text-3xl">🔥</div>
        <div className="text-sm font-semibold tracking-widest text-pink">
          COOKING...
        </div>
        <div className="text-xs text-fg-muted">
          Nano Banana is uncapping the red marker.
        </div>
        <div className="text-[10px] text-fg-dim">
          (this takes ~10-20s)
        </div>
      </div>
    </div>
  );
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const [copyState, setCopyState] = useState<"idle" | "copying" | "ok" | "err">(
    "idle",
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  async function onCopy() {
    setCopyState("copying");
    try {
      const img = new Image();
      img.src = src;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image."));
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available.");
      ctx.drawImage(img, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("Failed to encode PNG.");
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopyState("ok");
      setTimeout(() => setCopyState("idle"), 1800);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      setCopyState("err");
      setTimeout(() => setCopyState("idle"), 2400);
    }
  }

  function onDownload() {
    const a = document.createElement("a");
    a.href = src;
    a.download = `roasted-${Date.now()}.png`;
    a.click();
  }

  const copyLabel =
    copyState === "copying"
      ? "COPYING..."
      : copyState === "ok"
        ? "✓ COPIED"
        : copyState === "err"
          ? "✗ FAILED, TRY DOWNLOAD"
          : "⧉ COPY TO CLIPBOARD";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Roasted image preview"
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-3 text-xs">
        <span className="font-semibold tracking-[0.2em] text-pink">
          ROASTED · FULLSCREEN
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="rounded-sm border border-white/20 bg-white/5 px-3 py-1.5 font-semibold tracking-widest text-white transition-colors hover:bg-white/10"
          aria-label="Close fullscreen view"
        >
          ✕ CLOSE [ESC]
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-6 sm:p-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="roasted fullscreen"
          onClick={(e) => e.stopPropagation()}
          className="block h-full max-h-full w-auto max-w-full object-contain shadow-[0_0_60px_-10px_rgba(0,0,0,0.8)]"
        />
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 px-6 py-4"
      >
        <button
          onClick={onCopy}
          disabled={copyState === "copying"}
          className={`rounded-sm border px-5 py-3 text-sm font-semibold tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            copyState === "ok"
              ? "border-accent/60 bg-accent/10 text-accent"
              : copyState === "err"
                ? "border-warn/60 bg-warn/10 text-warn"
                : "border-pink/60 bg-pink/10 text-pink hover:bg-pink/20"
          }`}
        >
          {copyLabel}
        </button>
        <button
          onClick={onDownload}
          className="rounded-sm border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold tracking-widest text-white transition-colors hover:bg-white/10"
        >
          ↓ DOWNLOAD
        </button>
      </div>
    </div>
  );
}
