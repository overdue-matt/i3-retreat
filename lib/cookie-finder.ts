// Composes Cookie3 calls + Claude into the Smart Account Finder pipeline:
//   1. searchSmartAccounts(topic) — top 5 smart accounts for the topic
//   2. parallel fetchAccountFeed(account) — last 20 tweets per account
//   3. per-account Claude rank — pick top 5 most relevant tweets (substring filter then Claude)
//   4. one Claude narrative summary across all 25 picks

import type Anthropic from "@anthropic-ai/sdk";
import { claude, SONNET } from "./anthropic";
import {
  fetchAccountFeed,
  searchSmartAccounts,
  type CookieAccount,
  type CookieTweet,
} from "./cookie3";

export type AccountBundle = {
  account: CookieAccount;
  tweets: CookieTweet[];
};

export type FinderResult = {
  topic: string;
  bundles: AccountBundle[];
  narrative: string;
};

const RANK_TOOL: Anthropic.Tool = {
  name: "submit_top_tweets",
  description:
    "Pick exactly five tweet IDs from the candidates that are most relevant to the topic.",
  input_schema: {
    type: "object",
    properties: {
      pick_1: { type: "string", description: "Tweet ID #1 (most relevant). Copy verbatim from the candidates." },
      pick_2: { type: "string", description: "Tweet ID #2." },
      pick_3: { type: "string", description: "Tweet ID #3." },
      pick_4: { type: "string", description: "Tweet ID #4." },
      pick_5: { type: "string", description: "Tweet ID #5." },
    },
    required: ["pick_1", "pick_2", "pick_3", "pick_4", "pick_5"],
  },
};

const RANK_SYSTEM = `You rank tweets by relevance to a topic. Given a topic and a list of candidate tweets from one Twitter account, you call submit_top_tweets with the five tweet IDs that are most relevant to the topic.

Rules:
- Prefer tweets that engage with the topic substantively over passing mentions.
- Prefer original takes over generic retweet-style content.
- Copy tweet IDs verbatim from the candidate list. Do not invent IDs.
- Always return five picks. If fewer than five candidates clearly fit the topic, fill remaining slots with the highest-impressions candidates.
- Never use em-dashes or en-dashes anywhere.`;

const NARRATIVE_SYSTEM = `You write a 3-sentence narrative summary that distills what a small group of influential Twitter accounts is saying about a specific topic. The reader is a researcher who needs the gist in 30 seconds.

Rules:
- Exactly 3 sentences. Tight, declarative prose.
- Identify the dominant narrative, the contrarian view if there is one, and one notable nuance or fault line.
- Refer to accounts by handle when useful (@handle).
- Never use em-dashes or en-dashes. Use commas, periods, parentheses, or rewrite.
- No sycophantic openers. No "These accounts all agree...". Lead with the substance.
- Output the summary as plain text. No headers, labels, or markdown.`;

function buildRankPrompt(topic: string, candidates: CookieTweet[]): string {
  const lines: string[] = [];
  lines.push(`Topic: ${topic}`);
  lines.push("");
  lines.push("Candidates from this account (most-impressed first):");
  for (const t of candidates) {
    lines.push("");
    lines.push(`--- id: ${t.id} ---`);
    lines.push(
      `impressions: ${t.impressions} | likes: ${t.likes} | replies: ${t.replies} | retweets: ${t.retweets}`,
    );
    lines.push(`text: ${t.text.replace(/\s+/g, " ").slice(0, 600)}`);
  }
  lines.push("");
  lines.push("Call submit_top_tweets with the five most relevant tweet IDs.");
  return lines.join("\n");
}

function topicMatches(text: string, topic: string): boolean {
  const lower = text.toLowerCase();
  const t = topic.toLowerCase().trim();
  if (!t) return false;
  // Match either the whole topic or any meaningful word from it (3+ chars).
  if (lower.includes(t)) return true;
  const words = t.split(/\s+/).filter((w) => w.length >= 3);
  return words.some((w) => lower.includes(w));
}

function pickCandidates(tweets: CookieTweet[]): CookieTweet[] {
  // Already sorted by impressions on the way in. Return up to 12 candidates.
  return tweets.slice(0, 12);
}

async function rankTweetsForAccount(
  topic: string,
  tweets: CookieTweet[],
): Promise<CookieTweet[]> {
  if (tweets.length === 0) return [];
  if (tweets.length <= 5) return tweets;

  // Substring-filter first, fall back to all tweets if the filter is too aggressive.
  const matches = tweets.filter((t) => topicMatches(t.text, topic));
  const pool = matches.length >= 5 ? matches : tweets;
  const candidates = pickCandidates(pool);
  if (candidates.length <= 5) return candidates;

  try {
    const response = await claude().messages.create({
      model: SONNET,
      max_tokens: 1024,
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      tools: [RANK_TOOL],
      tool_choice: { type: "tool", name: "submit_top_tweets" },
      system: [
        {
          type: "text",
          text: RANK_SYSTEM,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: buildRankPrompt(topic, candidates) }],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return candidates.slice(0, 5);
    }
    const input = toolUse.input as Record<string, unknown>;
    const ids = ["pick_1", "pick_2", "pick_3", "pick_4", "pick_5"]
      .map((k) => input[k])
      .filter((v): v is string => typeof v === "string");

    const byId = new Map(candidates.map((t) => [t.id, t]));
    const picked: CookieTweet[] = [];
    for (const id of ids) {
      const t = byId.get(id);
      if (t && !picked.find((p) => p.id === t.id)) picked.push(t);
    }
    // Top up if Claude returned fewer than 5 valid ids.
    if (picked.length < 5) {
      for (const t of candidates) {
        if (picked.length >= 5) break;
        if (!picked.find((p) => p.id === t.id)) picked.push(t);
      }
    }
    return picked.slice(0, 5);
  } catch {
    return candidates.slice(0, 5);
  }
}

function buildNarrativePrompt(
  topic: string,
  bundles: AccountBundle[],
): string {
  const lines: string[] = [];
  lines.push(`Topic: ${topic}`);
  lines.push("");
  for (const b of bundles) {
    const a = b.account;
    lines.push(
      `=== @${a.username} (${a.display_name || "?"}) — ${a.followers_count.toLocaleString()} followers, mindshare ${a.mindshare} ===`,
    );
    for (const t of b.tweets) {
      lines.push(
        `[${t.impressions.toLocaleString()} impressions] ${t.text.replace(/\s+/g, " ").slice(0, 500)}`,
      );
    }
    lines.push("");
  }
  lines.push(
    `Write a 3-sentence narrative summary of what these ${bundles.length} accounts are saying about "${topic}". Plain text.`,
  );
  return lines.join("\n");
}

async function generateNarrative(
  topic: string,
  bundles: AccountBundle[],
): Promise<string> {
  if (bundles.length === 0) return "";
  try {
    const response = await claude().messages.create({
      model: SONNET,
      max_tokens: 600,
      thinking: { type: "disabled" },
      output_config: { effort: "medium" },
      system: [
        {
          type: "text",
          text: NARRATIVE_SYSTEM,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        { role: "user", content: buildNarrativePrompt(topic, bundles) },
      ],
    });
    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return "";
    return block.text
      .trim()
      .replace(/[—–]/g, ",")
      .replace(/^["']+|["']+$/g, "");
  } catch {
    return "";
  }
}

export type FindError = { error: string };

export async function findSmartAccounts(
  topic: string,
): Promise<FinderResult | FindError> {
  const accountResult = await searchSmartAccounts(topic, 5);
  if (!accountResult.ok) return { error: accountResult.error };

  // Fetch each account's feed in parallel.
  const feedResults = await Promise.all(
    accountResult.accounts.map((account) => fetchAccountFeed(account, 20)),
  );

  // Rank tweets per account in parallel.
  const ranked = await Promise.all(
    accountResult.accounts.map(async (account, i) => {
      const feed = feedResults[i];
      const tweets = feed.ok ? feed.tweets : [];
      const top = await rankTweetsForAccount(topic, tweets);
      return { account, tweets: top };
    }),
  );

  // Drop accounts with zero usable tweets.
  const bundles = ranked.filter((b) => b.tweets.length > 0);
  if (bundles.length === 0) {
    return {
      error: `Found smart accounts for "${topic}" but none of their recent tweets were retrievable.`,
    };
  }

  const narrative = await generateNarrative(topic, bundles);

  return { topic, bundles, narrative };
}
