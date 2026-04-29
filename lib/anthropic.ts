// Thin wrapper around the Anthropic SDK for retreat builds.
// Exports a singleton client and the reply generator used by /x-reply.

import Anthropic from "@anthropic-ai/sdk";
import type { Tweet } from "./x";

let _client: Anthropic | null = null;
export function claude(): Anthropic {
  if (_client) return _client;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is missing from .env.");
  }
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export const SONNET = "claude-sonnet-4-6";

export type ReplyAngle =
  | "INSIGHT"
  | "AGREE_EXTEND"
  | "CONTRARIAN"
  | "QUESTION"
  | "HUMOR";

export type Reply = {
  angle: ReplyAngle;
  text: string;
};

const ANGLES_DESCRIPTION = `- INSIGHT: adds a sharp, non-obvious angle. "Yes, and here's the deeper read."
- AGREE_EXTEND: agrees with the OP and adds a specific data point, example, stat, or concrete extension.
- CONTRARIAN: respectfully pushes back. Names the counterpoint clearly. Doesn't insult the OP.
- QUESTION: asks one sharp follow-up that invites the OP to reply with substance. Not a softball.
- HUMOR: short, punchy, witty. Meme-aware. Pure entertainment, no value-add.`;

const SYSTEM_PROMPT = `You are an expert at writing engaging X (Twitter) replies. Given a post, you call the submit_replies tool with five replies, one per angle.

The five angles:
${ANGLES_DESCRIPTION}

Hard rules for every reply:
- Maximum 280 characters, including spaces.
- No hashtags.
- No emojis unless the original post used them, and even then use sparingly.
- NEVER use em-dashes (—). Don't use en-dashes (–) either. Use commas, periods, parentheses, or rewrite the sentence. Em-dashes are an AI tell and people will clock the reply as bot-written.
- Don't start with sycophantic preamble like "Great post!", "Love this!", "100%".
- Don't reference yourself as an AI. You're a normal X user.
- Match the original post's register: formal stays formal, casual stays casual, terminally-online stays terminally-online.
- Be specific. Vague replies don't get engagement.
- Each reply must be able to stand on its own and earn likes.

Always call submit_replies. Never respond with plain text.`;

const ANGLE_ORDER: ReplyAngle[] = [
  "INSIGHT",
  "AGREE_EXTEND",
  "CONTRARIAN",
  "QUESTION",
  "HUMOR",
];

const REPLY_TOOL: Anthropic.Tool = {
  name: "submit_replies",
  description:
    "Submit the five reply options for the post. The replies array must contain exactly five entries — one per angle, in the order INSIGHT, AGREE_EXTEND, CONTRARIAN, QUESTION, HUMOR.",
  input_schema: {
    type: "object",
    properties: {
      insight: {
        type: "string",
        description:
          "The INSIGHT reply — adds a sharp, non-obvious angle. <= 280 characters.",
      },
      agree_extend: {
        type: "string",
        description:
          "The AGREE_EXTEND reply — agrees with the OP and adds a specific data point or extension. <= 280 characters.",
      },
      contrarian: {
        type: "string",
        description:
          "The CONTRARIAN reply — respectfully pushes back with a counterpoint. <= 280 characters.",
      },
      question: {
        type: "string",
        description:
          "The QUESTION reply — asks a sharp follow-up that earns engagement. <= 280 characters.",
      },
      humor: {
        type: "string",
        description:
          "The HUMOR reply — short, punchy, witty. Meme-aware. <= 280 characters.",
      },
    },
    required: ["insight", "agree_extend", "contrarian", "question", "humor"],
  },
};

type ReplyToolInput = {
  insight: string;
  agree_extend: string;
  contrarian: string;
  question: string;
  humor: string;
};

function buildUserPrompt(tweet: Tweet): string {
  const lines: string[] = [];
  lines.push(`Original post by @${tweet.author.username} (${tweet.author.name}):`);
  lines.push("");
  lines.push(tweet.text);
  if (tweet.media.length > 0) {
    const types = tweet.media.map((m) => m.type).join(", ");
    lines.push("");
    lines.push(`[Post includes media: ${types}]`);
  }
  if (tweet.quoted) {
    lines.push("");
    lines.push(
      `Quoting @${tweet.quoted.author.username} (${tweet.quoted.author.name}):`,
    );
    lines.push(`> ${tweet.quoted.text.replace(/\n/g, "\n> ")}`);
  }
  lines.push("");
  lines.push("Call submit_replies with five replies, one per angle.");
  return lines.join("\n");
}

function trim280(text: string): string {
  return text.length > 280 ? text.slice(0, 277) + "..." : text;
}

export async function generateReplies(tweet: Tweet): Promise<Reply[]> {
  const response = await claude().messages.create({
    model: SONNET,
    max_tokens: 4096,
    thinking: { type: "disabled" },
    output_config: { effort: "medium" },
    tools: [REPLY_TOOL],
    tool_choice: { type: "tool", name: "submit_replies" },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildUserPrompt(tweet) }],
  });

  // Find the tool_use block.
  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    console.error(
      "[generateReplies] No tool_use block in response:",
      JSON.stringify(response.content).slice(0, 500),
    );
    throw new Error("Claude didn't call the submit_replies tool.");
  }

  const input = toolUse.input as Partial<ReplyToolInput>;

  // Map keyed inputs back into the canonical angle list.
  const replies: Reply[] = [];
  const mapping: Array<[ReplyAngle, keyof ReplyToolInput]> = [
    ["INSIGHT", "insight"],
    ["AGREE_EXTEND", "agree_extend"],
    ["CONTRARIAN", "contrarian"],
    ["QUESTION", "question"],
    ["HUMOR", "humor"],
  ];
  for (const [angle, key] of mapping) {
    const text = input[key];
    if (typeof text === "string" && text.trim().length > 0) {
      replies.push({ angle, text: trim280(text.trim()) });
    }
  }

  if (replies.length !== 5) {
    console.warn(
      `[generateReplies] Got ${replies.length}/5 replies. Tool input:`,
      JSON.stringify(input).slice(0, 500),
    );
  }

  // Preserve canonical angle order.
  return ANGLE_ORDER.map((angle) =>
    replies.find((r) => r.angle === angle),
  ).filter((r): r is Reply => r !== undefined);
}
