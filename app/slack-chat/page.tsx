"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  listChannelsAction,
  loadConversationsAction,
} from "./actions";
import {
  formatSlackTime,
  userColor,
  userInitials,
  userLabel,
  type LoadedChannel,
  type LoadedConversation,
  type SlackChannel,
  type SlackMessage,
} from "@/lib/slack";

type WindowDays = 1 | 7 | 14 | 30;
type ChatTurn = { role: "user" | "assistant"; content: string };

const WINDOW_OPTIONS: Array<{ value: WindowDays; label: string }> = [
  { value: 1, label: "24H" },
  { value: 7, label: "7D" },
  { value: 14, label: "14D" },
  { value: 30, label: "30D" },
];

const SUGGESTED_PROMPTS = [
  "What was decided this week?",
  "Who's blocked or needs help?",
  "Summarize each channel in one line.",
  "Action items for Raul?",
];

export default function SlackChatPage() {
  // ----- channel listing -----
  const [channels, setChannels] = useState<SlackChannel[] | null>(null);
  const [channelsErr, setChannelsErr] = useState<string | null>(null);
  const [listingChannels, startListing] = useTransition();

  // ----- selection -----
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [windowDays, setWindowDays] = useState<WindowDays>(7);

  // ----- load -----
  const [loaded, setLoaded] = useState<LoadedConversation | null>(null);
  const [loadingErr, setLoadingErr] = useState<string | null>(null);
  const [loadingConv, startLoading] = useTransition();

  // ----- preview tabs -----
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

  // ----- chat -----
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [chatErr, setChatErr] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Initial channel fetch.
  useEffect(() => {
    startListing(async () => {
      const res = await listChannelsAction();
      if (!res.ok) {
        setChannelsErr(res.error);
        setChannels([]);
        return;
      }
      setChannels(res.channels);
    });
  }, []);

  // Auto-scroll chat on new content.
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chat, streamingText]);

  const filteredChannels = useMemo(() => {
    if (!channels) return [];
    const q = query.trim().toLowerCase();
    if (!q) return channels;
    return channels.filter((c) => c.name.toLowerCase().includes(q));
  }, [channels, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const c of filteredChannels) next.add(c.id);
      return next;
    });
  }

  function clearAll() {
    setSelected(new Set());
  }

  function startOver() {
    setLoaded(null);
    setLoadingErr(null);
    setChat([]);
    setStreamingText("");
    setChatErr(null);
    setActiveChannelId(null);
  }

  function clearChat() {
    setChat([]);
    setStreamingText("");
    setChatErr(null);
    setInput("");
  }

  function onLoad() {
    if (selected.size === 0) return;
    setLoadingErr(null);
    setLoaded(null);
    setChat([]);
    setStreamingText("");
    setChatErr(null);

    const ids = [...selected];

    startLoading(async () => {
      const res = await loadConversationsAction(ids, windowDays);
      if (!res.ok) {
        setLoadingErr(res.error);
        return;
      }
      setLoaded(res.loaded);
      const firstWithMessages =
        res.loaded.channels.find((c) => c.messages.length > 0) || res.loaded.channels[0];
      setActiveChannelId(firstWithMessages?.channel.id || null);
    });
  }

  async function sendMessage(text: string) {
    if (!loaded || streaming) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    setChatErr(null);
    setInput("");
    const newHistory: ChatTurn[] = [...chat, { role: "user", content: trimmed }];
    setChat(newHistory);
    setStreaming(true);
    setStreamingText("");

    try {
      const res = await fetch("/api/slack-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loaded, history: newHistory }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || `Chat failed (${res.status}).`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setStreamingText(acc);
      }
      setChat([...newHistory, { role: "assistant", content: acc }]);
      setStreamingText("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Chat request failed.";
      setChatErr(msg);
      setStreamingText("");
    } finally {
      setStreaming(false);
    }
  }

  function onSubmitChat(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  const activeChannel =
    loaded?.channels.find((c) => c.channel.id === activeChannelId) ||
    loaded?.channels[0] ||
    null;

  const totalMessages = loaded
    ? loaded.channels.reduce((sum, c) => sum + c.totalMessages, 0)
    : 0;

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
              build / <span className="text-accent">slack-chat</span>
            </span>
          </div>
          <div className="hidden items-center gap-4 text-fg-muted md:flex">
            <span>localhost:3000/slack-chat</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 pt-12 pb-10">
          <div className="text-xs font-semibold tracking-[0.2em] text-pink">
            SLACK · LOADED INTO CLAUDE
          </div>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Pick channels.{" "}
            <span className="text-fg-dim">Ask anything.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-base">
            Select channels, choose a window, hit load. Threads come too. We
            generate a digest up top, then you can chat across everything.
          </p>
        </div>
      </section>

      {/* Stage 1 — channel picker (only if we don't have a loaded result yet) */}
      {!loaded ? (
        <section className="border-b border-line">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
              {/* Left: channel list */}
              <div>
                <div className="mb-4 flex items-baseline justify-between">
                  <div>
                    <div className="text-xs font-semibold tracking-[0.2em] text-accent">
                      01 / PICK CHANNELS
                    </div>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight text-fg">
                      Search and select.{" "}
                      <span className="text-fg-dim">
                        ({selected.size} selected)
                      </span>
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAllVisible}
                      disabled={filteredChannels.length === 0}
                      className="rounded-sm border border-line bg-panel px-2 py-1 text-[10px] font-semibold tracking-widest text-fg-muted transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-40"
                    >
                      SELECT VISIBLE
                    </button>
                    <button
                      onClick={clearAll}
                      disabled={selected.size === 0}
                      className="rounded-sm border border-line bg-panel px-2 py-1 text-[10px] font-semibold tracking-widest text-fg-muted transition-colors hover:border-warn/40 hover:text-warn disabled:opacity-40"
                    >
                      CLEAR
                    </button>
                  </div>
                </div>

                <div className="mb-3 flex items-center gap-3 rounded-sm border border-line bg-panel px-4 py-2.5 focus-within:border-accent">
                  <span className="text-xs text-fg-dim">FILTER</span>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search channels..."
                    className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-dim focus:outline-none"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                {channelsErr ? (
                  <div className="rounded-sm border border-warn/40 bg-warn/5 p-4 text-sm text-warn">
                    {channelsErr}
                    <div className="mt-2 text-xs text-fg-muted">
                      Make sure SLACK_BOT_TOKEN is set in .env and the bot has
                      channels:read scope.
                    </div>
                  </div>
                ) : listingChannels && !channels ? (
                  <div className="rounded-sm border border-line bg-panel p-6 text-sm text-fg-muted">
                    Loading channels<span className="cursor" />
                  </div>
                ) : (
                  <ChannelList
                    channels={filteredChannels}
                    selected={selected}
                    onToggle={toggle}
                  />
                )}
              </div>

              {/* Right: window + load */}
              <aside className="flex flex-col gap-6">
                <div>
                  <div className="text-xs font-semibold tracking-[0.2em] text-accent">
                    02 / TIME WINDOW
                  </div>
                  <h3 className="mt-1 text-base font-semibold tracking-tight text-fg">
                    How far back?
                  </h3>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {WINDOW_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        onClick={() => setWindowDays(o.value)}
                        className={
                          windowDays === o.value
                            ? "rounded-sm border border-accent/60 bg-accent/10 px-3 py-2.5 text-xs font-semibold tracking-widest text-accent"
                            : "rounded-sm border border-line bg-panel px-3 py-2.5 text-xs font-semibold tracking-widest text-fg-muted transition-colors hover:border-accent/40 hover:text-accent"
                        }
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-fg-dim">
                    Longer windows pull more data and take a beat longer to
                    load.
                  </p>
                </div>

                <div>
                  <div className="text-xs font-semibold tracking-[0.2em] text-accent">
                    03 / LOAD
                  </div>
                  <button
                    onClick={onLoad}
                    disabled={selected.size === 0 || loadingConv}
                    className="mt-3 w-full rounded-sm border border-accent/60 bg-accent/10 px-6 py-3 text-sm font-semibold tracking-widest text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {loadingConv
                      ? "LOADING..."
                      : selected.size === 0
                        ? "PICK A CHANNEL"
                        : `LOAD ${selected.size} CHANNEL${selected.size === 1 ? "" : "S"} →`}
                  </button>
                  {loadingErr ? (
                    <div className="mt-3 rounded-sm border border-warn/40 bg-warn/5 px-4 py-3 text-sm text-warn">
                      {loadingErr}
                    </div>
                  ) : null}
                  {loadingConv ? (
                    <p className="mt-3 text-xs leading-relaxed text-fg-muted">
                      Pulling history, threads, and user names.
                    </p>
                  ) : null}
                </div>
              </aside>
            </div>
          </div>
        </section>
      ) : null}

      {/* Result view */}
      {loaded ? (
        <section className="border-b border-line">
          <div className="mx-auto max-w-6xl px-6 py-8">
            {/* Compact meta bar */}
            <div className="mb-6 flex flex-wrap items-center gap-3 text-xs">
              <span className="font-semibold tracking-[0.2em] text-pink">
                LOADED · LAST {windowDays}D
              </span>
              <span className="text-fg-dim">·</span>
              <span className="text-fg-muted">
                {loaded.channels.length} channel
                {loaded.channels.length === 1 ? "" : "s"}
              </span>
              <span className="text-fg-dim">·</span>
              <span className="text-fg-muted">
                {totalMessages.toLocaleString()} messages
              </span>
              <button
                onClick={startOver}
                className="ml-auto rounded-sm border border-line bg-panel px-3 py-1 font-semibold tracking-widest text-fg-muted transition-colors hover:border-accent/40 hover:text-accent"
              >
                ↺ NEW LOAD
              </button>
            </div>

            {/* Channel tabs row — spans both columns so the boxes below line up */}
            <div className="mb-4 flex flex-wrap gap-2">
              {loaded.channels.map((c) => (
                <button
                  key={c.channel.id}
                  onClick={() => setActiveChannelId(c.channel.id)}
                  className={
                    activeChannelId === c.channel.id
                      ? "flex items-center gap-2 rounded-sm border border-accent/60 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent"
                      : "flex items-center gap-2 rounded-sm border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-fg-muted transition-colors hover:border-accent/40 hover:text-accent"
                  }
                >
                  <span>#{c.channel.name}</span>
                  <span className="text-fg-dim">{c.totalMessages}</span>
                </button>
              ))}
            </div>

            {/* Two columns, vertically aligned at equal height */}
            <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
              {/* Left: Slack preview */}
              <div className="flex h-[640px] flex-col">
                <div className="text-xs font-semibold tracking-[0.2em] text-accent">
                  LOADED INTO CONTEXT
                </div>

                {/* Preview pane */}
                <div className="mt-3 flex min-h-0 flex-1 overflow-hidden rounded-sm border border-line bg-[#1a1d21]">
                  {activeChannel ? (
                    <SlackPreview channel={activeChannel} loaded={loaded} />
                  ) : null}
                </div>
              </div>

              {/* Right: chat */}
              <div className="flex h-[640px] flex-col">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold tracking-[0.2em] text-accent">
                    ASK CLAUDE
                  </div>
                  {chat.length > 0 || streamingText ? (
                    <button
                      onClick={clearChat}
                      disabled={streaming}
                      className="rounded-sm border border-line bg-panel px-2 py-1 text-[10px] font-semibold tracking-widest text-fg-muted transition-colors hover:border-warn/40 hover:text-warn disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↺ CLEAR CHAT
                    </button>
                  ) : null}
                </div>

                {/* Chat scroll area */}
                <div
                  ref={chatScrollRef}
                  className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-sm border border-line bg-panel p-4"
                >
                  {chat.length === 0 && !streaming ? (
                    <div>
                      <p className="text-sm leading-relaxed text-fg-dim">
                        Pick a starter or write your own.
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {SUGGESTED_PROMPTS.map((p) => (
                          <button
                            key={p}
                            onClick={() => sendMessage(p)}
                            className="rounded-sm border border-line bg-bg-soft p-3 text-left text-xs leading-relaxed text-fg-muted transition-colors hover:border-accent/40 hover:text-accent"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chat.map((turn, i) => (
                        <ChatBubble key={i} role={turn.role} text={turn.content} />
                      ))}
                      {streaming ? (
                        <ChatBubble role="assistant" text={streamingText} streaming />
                      ) : null}
                    </div>
                  )}
                </div>

                {chatErr ? (
                  <div className="mt-2 rounded-sm border border-warn/40 bg-warn/5 px-3 py-2 text-xs text-warn">
                    {chatErr}
                  </div>
                ) : null}

                {/* Input */}
                <form onSubmit={onSubmitChat} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask anything about the loaded channels..."
                    disabled={streaming}
                    className="flex-1 rounded-sm border border-line bg-panel px-4 py-3 text-sm text-fg placeholder:text-fg-dim focus:border-accent focus:outline-none disabled:opacity-50"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="submit"
                    disabled={streaming || !input.trim()}
                    className="rounded-sm border border-accent/60 bg-accent/10 px-5 py-3 text-xs font-semibold tracking-widest text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {streaming ? "..." : "SEND"}
                  </button>
                </form>
              </div>
            </div>

            {/* Next-level hint */}
            <div className="mt-8 rounded-sm border border-line bg-panel p-5">
              <div className="text-[10px] font-semibold tracking-[0.2em] text-accent">
                ↑ NEXT LEVEL
              </div>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                Chat&apos;s just the start. Ask Claude:{" "}
                <span className="text-fg">
                  &quot;On the slack-chat page, build a Notion-style action board.
                  After channels load, pull every action item out of the messages,
                  group them by who owns them, and tag each with Not started /
                  Underway / Done. Let me click and drag a card to move it between the
                  three columns.&quot;
                </span>
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <footer className="border-b border-line bg-bg-soft/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 text-xs text-fg-dim sm:flex-row sm:items-center sm:justify-between">
          <div>impact3 retreat · build · slack-chat</div>
          <Link href="/" className="hover:text-accent">
            ← back to sandbox
          </Link>
        </div>
      </footer>
    </div>
  );
}

/* ---------- Channel list ---------- */

function ChannelList({
  channels,
  selected,
  onToggle,
}: {
  channels: SlackChannel[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (channels.length === 0) {
    return (
      <div className="rounded-sm border border-line bg-panel p-6 text-sm text-fg-muted">
        No channels match. The bot may not be in any channels yet — invite it
        with <code className="code">/invite @YourBot</code> in Slack.
      </div>
    );
  }
  return (
    <div className="max-h-[420px] overflow-y-auto rounded-sm border border-line bg-panel">
      <ul className="divide-y divide-line">
        {channels.map((c) => {
          const isSelected = selected.has(c.id);
          return (
            <li key={c.id}>
              <button
                onClick={() => onToggle(c.id)}
                className={
                  isSelected
                    ? "flex w-full items-center gap-3 bg-accent/[0.06] px-4 py-2.5 text-left text-sm transition-colors"
                    : "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-bg-soft"
                }
              >
                <span
                  className={
                    isSelected
                      ? "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-accent bg-accent text-[10px] font-bold text-bg"
                      : "h-4 w-4 shrink-0 rounded-sm border border-line"
                  }
                >
                  {isSelected ? "✓" : null}
                </span>
                <span
                  className={
                    isSelected ? "text-accent" : "text-fg-dim"
                  }
                >
                  {c.is_private ? "🔒" : "#"}
                </span>
                <span
                  className={isSelected ? "font-semibold text-fg" : "text-fg"}
                >
                  {c.name}
                </span>
                {c.is_member ? (
                  <span className="text-[10px] font-semibold tracking-widest text-accent">
                    ● MEMBER
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold tracking-widest text-fg-dim">
                    ○ NOT JOINED
                  </span>
                )}
                {c.num_members !== undefined ? (
                  <span className="ml-auto text-xs text-fg-dim">
                    {c.num_members}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- Slack-style preview ---------- */

const PREVIEW_TOP_LEVEL_LIMIT = 12;

function SlackPreview({
  channel,
  loaded,
}: {
  channel: LoadedChannel;
  loaded: LoadedConversation;
}) {
  if (channel.skipped) {
    return (
      <div className="p-6 text-sm text-fg-muted">
        <div className="font-semibold text-warn">Skipped: #{channel.channel.name}</div>
        <div className="mt-2">{channel.skipped}</div>
      </div>
    );
  }
  if (channel.messages.length === 0) {
    return (
      <div className="p-6 text-sm text-fg-muted">
        No messages in the time window.
      </div>
    );
  }

  const visible = channel.messages.slice(0, PREVIEW_TOP_LEVEL_LIMIT);
  const hidden = channel.messages.length - visible.length;
  const hiddenReplies = channel.messages
    .slice(PREVIEW_TOP_LEVEL_LIMIT)
    .reduce((sum, m) => sum + m.replies.length, 0);

  return (
    <div className="flex h-full w-full flex-col" style={{ fontFamily: "Lato, ui-sans-serif, system-ui, sans-serif" }}>
      {/* Slack channel header — aubergine purple */}
      <div className="border-b border-black/30 bg-[#4A154B] px-5 py-3">
        <div className="flex items-center gap-2 text-white">
          <span className="text-[#d4b8d5]">#</span>
          <span className="text-[15px] font-bold">{channel.channel.name}</span>
          {channel.channel.is_private ? (
            <span className="text-[11px] text-[#d4b8d5]">🔒 private</span>
          ) : null}
        </div>
        {channel.channel.purpose ? (
          <div className="mt-0.5 truncate text-[12px] text-[#d4b8d5]">
            {channel.channel.purpose}
          </div>
        ) : null}
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {visible.map((m) => (
          <SlackMessageRow key={m.ts} message={m} loaded={loaded} />
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-[#383838] bg-[#1a1d21] px-5 py-2.5 text-[11px] text-[#9b9b9b]">
        Showing {visible.length} of {channel.messages.length} top-level messages
        {hidden > 0
          ? ` · +${hidden} more${hiddenReplies > 0 ? ` and ${hiddenReplies} thread replies` : ""} in Claude's context`
          : channel.messages.some((m) => m.replies.length > 0)
            ? ` · all threads loaded into Claude's context`
            : ""}
      </div>
    </div>
  );
}

function SlackMessageRow({
  message,
  loaded,
}: {
  message: SlackMessage;
  loaded: LoadedConversation;
}) {
  const name = userLabel(loaded.users, message.user);
  const color = userColor(loaded.users, message.user);
  const initials = userInitials(name);
  const time = formatSlackTime(message.ts);
  const repliesShown = message.replies.slice(0, 4);
  const repliesHidden = message.replies.length - repliesShown.length;

  return (
    <div className="px-3 py-2 hover:bg-[#222529]">
      <div className="flex items-start gap-3">
        <Avatar color={color} initials={initials} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-bold text-[#d1d2d3]">{name}</span>
            <span className="text-[11px] text-[#9b9b9b]">{time}</span>
          </div>
          <div className="whitespace-pre-wrap break-words text-[14px] leading-snug text-[#d1d2d3]">
            <SlackText text={message.text} />
          </div>
        </div>
      </div>

      {/* Threaded replies */}
      {message.replies.length > 0 ? (
        <div className="mt-1.5 ml-12 border-l-2 border-[#383838] pl-3">
          {repliesShown.map((r) => (
            <div key={r.ts} className="mt-1.5 flex items-start gap-2">
              <Avatar
                color={userColor(loaded.users, r.user)}
                initials={userInitials(userLabel(loaded.users, r.user))}
                small
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-bold text-[#d1d2d3]">
                    {userLabel(loaded.users, r.user)}
                  </span>
                  <span className="text-[11px] text-[#9b9b9b]">
                    {formatSlackTime(r.ts)}
                  </span>
                </div>
                <div className="whitespace-pre-wrap break-words text-[13px] leading-snug text-[#d1d2d3]">
                  <SlackText text={r.text} />
                </div>
              </div>
            </div>
          ))}
          {repliesHidden > 0 ? (
            <div className="mt-1.5 text-[11px] text-[#9b9b9b]">
              + {repliesHidden} more repl{repliesHidden === 1 ? "y" : "ies"}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Avatar({
  color,
  initials,
  small = false,
}: {
  color: string;
  initials: string;
  small?: boolean;
}) {
  const size = small ? "h-6 w-6 text-[9px]" : "h-9 w-9 text-[11px]";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded font-bold text-bg ${size}`}
      style={{ background: color }}
    >
      {initials}
    </div>
  );
}

/**
 * Render Slack's mrkdwn lightly: <@U123>, <#C123|name>, <http|label>, *bold*, _italic_, `code`.
 * Just enough to make the preview not look like raw API output.
 */
function SlackText({ text }: { text: string }) {
  const rendered = renderSlackMarkup(text);
  return <>{rendered}</>;
}

function renderSlackMarkup(text: string): React.ReactNode[] {
  // Replace user/channel mentions and links first.
  const cleaned = text
    .replace(/<@([A-Z0-9]+)>/g, "@user")
    .replace(/<#([A-Z0-9]+)\|([^>]+)>/g, "#$2")
    .replace(/<#([A-Z0-9]+)>/g, "#channel")
    .replace(/<(https?:[^|>]+)\|([^>]+)>/g, "$2")
    .replace(/<(https?:[^>]+)>/g, "$1");

  const out: React.ReactNode[] = [];
  // very simple inline tokenizer for *bold*, _italic_, `code`
  const re = /(\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(cleaned)) !== null) {
    if (m.index > last) out.push(cleaned.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("*")) {
      out.push(<b key={key++}>{tok.slice(1, -1)}</b>);
    } else if (tok.startsWith("_")) {
      out.push(<i key={key++}>{tok.slice(1, -1)}</i>);
    } else if (tok.startsWith("`")) {
      out.push(
        <code
          key={key++}
          className="rounded-sm bg-[#222529] px-1 py-px text-[#e8912d]"
          style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.92em" }}
        >
          {tok.slice(1, -1)}
        </code>,
      );
    }
    last = re.lastIndex;
  }
  if (last < cleaned.length) out.push(cleaned.slice(last));
  return out;
}

/* ---------- Chat bubble ---------- */

function ChatBubble({
  role,
  text,
  streaming = false,
}: {
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-[10px] font-semibold tracking-widest">
        <span
          className={
            isUser ? "text-info" : "text-accent"
          }
        >
          {isUser ? "● YOU" : "○ CLAUDE"}
        </span>
        {streaming ? (
          <span className="text-fg-dim">streaming<span className="cursor" /></span>
        ) : null}
      </div>
      <div
        className={
          isUser
            ? "rounded-sm border border-info/30 bg-info/5 p-3 text-sm leading-relaxed text-fg"
            : "rounded-sm border border-line bg-bg-soft p-3 text-sm leading-relaxed text-fg"
        }
      >
        {role === "assistant" ? (
          <Markdownish text={text || (streaming ? "..." : "")} />
        ) : (
          <span className="whitespace-pre-wrap break-words">{text}</span>
        )}
      </div>
    </div>
  );
}

/* ---------- Lightweight markdown renderer (headings + bullets + bold) ---------- */

function Markdownish({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => {
        if (b.kind === "heading") {
          return (
            <h4
              key={i}
              className="text-xs font-semibold uppercase tracking-[0.18em] text-accent"
            >
              {b.text}
            </h4>
          );
        }
        if (b.kind === "list") {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-fg">
              {b.items.map((it, j) => (
                <li key={j}>
                  <Inline text={it} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-sm leading-relaxed text-fg">
            <Inline text={b.text} />
          </p>
        );
      })}
    </div>
  );
}

type Block =
  | { kind: "heading"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "para"; text: string };

function parseBlocks(text: string): Block[] {
  const lines = text.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      blocks.push({ kind: "heading", text: heading[1].trim() });
      i++;
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, "").trim());
        i++;
      }
      blocks.push({ kind: "list", items });
      continue;
    }
    // paragraph: gather until blank line / heading / bullet
    const start = i;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i])
    ) {
      i++;
    }
    blocks.push({ kind: "para", text: lines.slice(start, i).join(" ") });
  }
  return blocks;
}

function Inline({ text }: { text: string }) {
  // Render **bold**, *italic*, `code`. Keep simple — no links, escapes, etc.
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      out.push(<b key={key++}>{tok.slice(2, -2)}</b>);
    } else if (tok.startsWith("*")) {
      out.push(<i key={key++}>{tok.slice(1, -1)}</i>);
    } else if (tok.startsWith("`")) {
      out.push(
        <code key={key++} className="code">
          {tok.slice(1, -1)}
        </code>,
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
