// Thin wrapper around the Slack Web API for retreat builds.
// Uses a single bot token (xoxb-...) from SLACK_BOT_TOKEN. The bot must be
// invited into any channel you want to read.

const BASE = "https://slack.com/api";
const PAGE_LIMIT = 200;
const THREAD_CONCURRENCY = 5;

export type SlackChannel = {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
  num_members?: number;
  topic?: string;
  purpose?: string;
};

export type SlackUser = {
  id: string;
  display_name: string;
  real_name: string;
  avatar_color: string;
};

export type SlackMessage = {
  ts: string;
  user: string | null;
  text: string;
  thread_ts?: string;
  reply_count?: number;
  replies: SlackMessage[];
};

export type LoadedChannel = {
  channel: SlackChannel;
  messages: SlackMessage[];
  // total includes top-level + thread replies
  totalMessages: number;
  threadCount: number;
  skipped?: string; // e.g. "not_in_channel"
};

export type LoadedConversation = {
  channels: LoadedChannel[];
  users: Record<string, SlackUser>;
  windowDays: number;
  oldestUnix: number;
  loadedAt: number;
};

function token(): string {
  const t = process.env.SLACK_BOT_TOKEN;
  if (!t) {
    throw new Error("SLACK_BOT_TOKEN is missing from .env.");
  }
  return t;
}

type SlackResponse<T> = T & {
  ok: boolean;
  error?: string;
  response_metadata?: { next_cursor?: string };
};

async function call<T>(method: string, params: Record<string, string>): Promise<SlackResponse<T>> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/${method}?${qs}`, {
    headers: { Authorization: `Bearer ${token()}` },
    cache: "no-store",
  });
  // Slack always returns 200 with `ok: false` on logical errors. Don't throw on !res.ok unless network-level.
  return (await res.json()) as SlackResponse<T>;
}

/* -------------------------- Channels -------------------------- */

type RawChannel = {
  id: string;
  name: string;
  is_private?: boolean;
  is_member?: boolean;
  num_members?: number;
  topic?: { value?: string };
  purpose?: { value?: string };
  is_archived?: boolean;
};

export async function listChannels(): Promise<SlackChannel[]> {
  const types = ["public_channel,private_channel", "public_channel"];
  let lastError: string | undefined;

  for (const t of types) {
    const out: SlackChannel[] = [];
    let cursor: string | undefined;
    let failed = false;

    do {
      const params: Record<string, string> = {
        limit: String(PAGE_LIMIT),
        types: t,
        exclude_archived: "true",
      };
      if (cursor) params.cursor = cursor;

      const data = await call<{ channels?: RawChannel[] }>("conversations.list", params);
      if (!data.ok) {
        lastError = data.error;
        failed = true;
        break;
      }
      for (const c of data.channels || []) {
        if (c.is_archived) continue;
        out.push({
          id: c.id,
          name: c.name,
          is_private: Boolean(c.is_private),
          is_member: Boolean(c.is_member),
          num_members: c.num_members,
          topic: c.topic?.value,
          purpose: c.purpose?.value,
        });
      }
      cursor = data.response_metadata?.next_cursor || undefined;
    } while (cursor);

    if (!failed) {
      // Sort: member channels first, then alphabetical.
      out.sort((a, b) => {
        if (a.is_member !== b.is_member) return a.is_member ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      return out;
    }
    // If missing_scope, fall back to public-only.
    if (lastError !== "missing_scope") break;
  }

  throw new Error(`Slack listChannels failed: ${lastError || "unknown error"}`);
}

/* -------------------------- Users -------------------------- */

type RawUser = {
  id: string;
  name?: string;
  real_name?: string;
  profile?: { display_name?: string; real_name?: string };
  is_bot?: boolean;
  deleted?: boolean;
};

const AVATAR_PALETTE = [
  "#a3ff12",
  "#5ad1ff",
  "#ff4d8d",
  "#ffb627",
  "#c084fc",
  "#34d399",
  "#fb7185",
  "#60a5fa",
];

function colorForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

export async function loadUsers(): Promise<Record<string, SlackUser>> {
  const out: Record<string, SlackUser> = {};
  let cursor: string | undefined;

  do {
    const params: Record<string, string> = { limit: String(PAGE_LIMIT) };
    if (cursor) params.cursor = cursor;

    const data = await call<{ members?: RawUser[] }>("users.list", params);
    if (!data.ok) {
      // Non-fatal: we still render something even if user resolution fails.
      console.warn(`[slack] users.list failed: ${data.error}`);
      break;
    }
    for (const u of data.members || []) {
      if (u.deleted) continue;
      const display =
        u.profile?.display_name?.trim() ||
        u.profile?.real_name?.trim() ||
        u.real_name?.trim() ||
        u.name ||
        u.id;
      out[u.id] = {
        id: u.id,
        display_name: display,
        real_name: u.profile?.real_name || u.real_name || display,
        avatar_color: colorForId(u.id),
      };
    }
    cursor = data.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return out;
}

/* -------------------------- Conversations -------------------------- */

type RawMessage = {
  ts: string;
  user?: string;
  bot_id?: string;
  text?: string;
  subtype?: string;
  thread_ts?: string;
  reply_count?: number;
};

function shapeMessage(m: RawMessage): SlackMessage {
  return {
    ts: m.ts,
    user: m.user || (m.bot_id ? `bot:${m.bot_id}` : null),
    text: m.text || "",
    thread_ts: m.thread_ts,
    reply_count: m.reply_count,
    replies: [],
  };
}

async function fetchHistory(channelId: string, oldestUnix: number): Promise<RawMessage[]> {
  const out: RawMessage[] = [];
  let cursor: string | undefined;

  do {
    const params: Record<string, string> = {
      channel: channelId,
      oldest: String(oldestUnix),
      limit: String(PAGE_LIMIT),
    };
    if (cursor) params.cursor = cursor;

    const data = await call<{ messages?: RawMessage[]; has_more?: boolean }>(
      "conversations.history",
      params,
    );
    if (!data.ok) {
      console.warn(
        `[slack] conversations.history failed for channel=${channelId}: ${data.error}`,
      );
      const err = new Error(data.error || "history_failed") as Error & { code?: string };
      err.code = data.error;
      throw err;
    }
    out.push(...(data.messages || []));
    cursor = data.has_more ? data.response_metadata?.next_cursor || undefined : undefined;
  } while (cursor);

  return out;
}

async function fetchThread(channelId: string, threadTs: string): Promise<RawMessage[]> {
  const out: RawMessage[] = [];
  let cursor: string | undefined;

  do {
    const params: Record<string, string> = {
      channel: channelId,
      ts: threadTs,
      limit: String(PAGE_LIMIT),
    };
    if (cursor) params.cursor = cursor;

    const data = await call<{ messages?: RawMessage[]; has_more?: boolean }>(
      "conversations.replies",
      params,
    );
    if (!data.ok) {
      console.warn(`[slack] thread fetch failed (${threadTs}): ${data.error}`);
      break;
    }
    out.push(...(data.messages || []));
    cursor = data.has_more ? data.response_metadata?.next_cursor || undefined : undefined;
  } while (cursor);

  // First entry is the parent — drop it.
  return out.slice(1);
}

async function joinIfPublic(channel: SlackChannel): Promise<void> {
  if (channel.is_private || channel.is_member) return;
  const data = await call<{ channel?: { id: string } }>("conversations.join", {
    channel: channel.id,
  });
  if (!data.ok) {
    console.warn(`[slack] conversations.join failed for #${channel.name}: ${data.error}`);
  }
}

async function loadOneChannel(channel: SlackChannel, oldestUnix: number): Promise<LoadedChannel> {
  await joinIfPublic(channel);

  let raw: RawMessage[];
  try {
    raw = await fetchHistory(channel.id, oldestUnix);
  } catch (err) {
    const code = (err as Error & { code?: string }).code;
    console.warn(`[slack] skipping #${channel.name} (${channel.id}): ${code || (err as Error).message}`);
    if (code === "not_in_channel") {
      return {
        channel,
        messages: [],
        totalMessages: 0,
        threadCount: 0,
        skipped: "Bot not invited to this channel. In Slack, open the channel and run /invite @YourBot.",
      };
    }
    if (code === "channel_not_found") {
      return {
        channel,
        messages: [],
        totalMessages: 0,
        threadCount: 0,
        skipped: "Channel not found. The bot can't see this channel — for private channels, the bot needs groups:history scope.",
      };
    }
    return {
      channel,
      messages: [],
      totalMessages: 0,
      threadCount: 0,
      skipped: `Slack error: ${code || (err as Error).message}`,
    };
  }

  // Drop subtypes (joins, file shares, channel ops, bot pings) and empty text.
  const topLevel = raw
    .filter((m) => !m.subtype && (m.text || "").trim().length > 0)
    .map(shapeMessage);

  // For messages with thread replies, fetch them in parallel (capped concurrency).
  const threaded = topLevel.filter((m) => (m.reply_count || 0) > 0);
  let inFlight: Promise<void>[] = [];
  let totalReplies = 0;

  for (const parent of threaded) {
    const p = fetchThread(channel.id, parent.ts).then((rawReplies) => {
      const shaped = rawReplies
        .filter((r) => !r.subtype && (r.text || "").trim().length > 0)
        .map(shapeMessage);
      parent.replies = shaped;
      totalReplies += shaped.length;
    });
    inFlight.push(p);
    if (inFlight.length >= THREAD_CONCURRENCY) {
      await Promise.all(inFlight);
      inFlight = [];
    }
  }
  if (inFlight.length > 0) await Promise.all(inFlight);

  // Slack returns history newest-first. Reverse to chronological.
  const chronological = [...topLevel].reverse();

  return {
    channel,
    messages: chronological,
    totalMessages: chronological.length + totalReplies,
    threadCount: threaded.length,
  };
}

export async function loadConversations(
  channels: SlackChannel[],
  windowDays: number,
): Promise<LoadedConversation> {
  const oldestUnix = Math.floor((Date.now() - windowDays * 24 * 60 * 60 * 1000) / 1000);

  // Sequential per channel to stay under tier-3 (~50 req/min for history).
  // Threads inside each channel are parallel up to THREAD_CONCURRENCY.
  const channelsLoaded: LoadedChannel[] = [];
  for (const ch of channels) {
    channelsLoaded.push(await loadOneChannel(ch, oldestUnix));
  }

  const users = await loadUsers();

  return {
    channels: channelsLoaded,
    users,
    windowDays,
    oldestUnix,
    loadedAt: Date.now(),
  };
}

/* -------------------------- Helpers for prompts/UI -------------------------- */

export function userLabel(users: Record<string, SlackUser>, userId: string | null): string {
  if (!userId) return "unknown";
  if (userId.startsWith("bot:")) return "bot";
  return users[userId]?.display_name || userId;
}

export function userInitials(name: string): string {
  const parts = name.replace(/[^a-zA-Z0-9 ]/g, "").trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function userColor(users: Record<string, SlackUser>, userId: string | null): string {
  if (!userId) return "#7d8590";
  if (userId.startsWith("bot:")) return "#7d8590";
  return users[userId]?.avatar_color || colorForId(userId);
}

export function formatSlackTime(ts: string): string {
  const ms = Math.floor(Number(ts) * 1000);
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const sameYear = d.getFullYear() === now.getFullYear();
  const opts: Intl.DateTimeFormatOptions = sameYear
    ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
    : { year: "numeric", month: "short", day: "numeric" };
  return d.toLocaleString([], opts);
}

/**
 * Serialize loaded channels into a compact, model-readable transcript.
 * Used as the cached system-prompt context for both the summary and chat.
 */
export function serializeForLLM(loaded: LoadedConversation): string {
  const lines: string[] = [];
  lines.push(`# Slack export`);
  lines.push(
    `Window: last ${loaded.windowDays} day${loaded.windowDays === 1 ? "" : "s"} (since ${new Date(loaded.oldestUnix * 1000).toISOString()})`,
  );
  lines.push(`Loaded at: ${new Date(loaded.loadedAt).toISOString()}`);
  lines.push("");

  for (const lc of loaded.channels) {
    lines.push(`---`);
    lines.push(`## #${lc.channel.name}${lc.channel.is_private ? " (private)" : ""}`);
    if (lc.channel.purpose) lines.push(`Purpose: ${lc.channel.purpose}`);
    if (lc.channel.topic) lines.push(`Topic: ${lc.channel.topic}`);
    if (lc.skipped) {
      lines.push(`(${lc.skipped})`);
      lines.push("");
      continue;
    }
    lines.push(`(${lc.totalMessages} messages, ${lc.threadCount} threads)`);
    lines.push("");

    if (lc.messages.length === 0) {
      lines.push("(no messages in window)");
      lines.push("");
      continue;
    }

    for (const m of lc.messages) {
      const who = userLabel(loaded.users, m.user);
      const when = formatSlackTime(m.ts);
      lines.push(`[${when}] ${who}: ${m.text}`);
      for (const r of m.replies) {
        const rWho = userLabel(loaded.users, r.user);
        const rWhen = formatSlackTime(r.ts);
        lines.push(`    └─ [${rWhen}] ${rWho}: ${r.text}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}
