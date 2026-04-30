// Claude prompts for the LinkedIn engagement forecaster.
// Two entry points:
//   forecastEngagement(posts, draft) — predict engagement + suggest edits
//   generateDraftPost(posts, topic)  — draft a post in the company's voice

import type Anthropic from "@anthropic-ai/sdk";
import { claude, SONNET } from "./anthropic";
import type { LinkedInPost } from "./linkedin";

export type Forecast = {
  predicted_reactions: number;
  predicted_comments: number;
  predicted_reposts: number;
  predicted_total: number;
  /** rank percentile of the prediction vs corpus, 0-100 (higher = better) */
  percentile: number;
  rationale: string;
  edits: string[];
  /** activity_urns of 2-3 historical posts most similar to the draft */
  similar_post_urns: string[];
};

const FORECAST_TOOL: Anthropic.Tool = {
  name: "submit_forecast",
  description: "Submit your engagement forecast for the draft post.",
  input_schema: {
    type: "object",
    properties: {
      predicted_reactions: {
        type: "integer",
        description:
          "Expected total reaction count (likes + celebrate + support + love + insightful + funny, summed).",
      },
      predicted_comments: {
        type: "integer",
        description: "Expected number of comments.",
      },
      predicted_reposts: {
        type: "integer",
        description: "Expected number of reposts / shares.",
      },
      rationale: {
        type: "string",
        description:
          "One paragraph (3-5 sentences) explaining why the draft will land where you predict. Reference specific patterns from the company's past posts: format, length, hook, topic fit, media usage. When you reference a past post, refer to it by its TOPIC or HOOK in plain English (e.g. 'the x402 payments post', 'the 24/5 trading announcement'). NEVER paste activity_urn numbers, raw IDs, or in-line engagement numbers in this paragraph — those go in the similar_post_1/2/3 fields and are shown to the user separately.",
      },
      edit_1: {
        type: "string",
        description:
          "First specific line-level edit to push engagement up. Format: 'Replace X with Y, because [reason grounded in their corpus]'. Be concrete, not generic.",
      },
      edit_2: {
        type: "string",
        description: "Second specific line-level edit, same format as edit_1.",
      },
      edit_3: {
        type: "string",
        description: "Third specific line-level edit, same format as edit_1.",
      },
      similar_post_1: {
        type: "string",
        description:
          "activity_urn of the past post most similar to the draft (in topic, format, or tone). Copy the value verbatim from the corpus.",
      },
      similar_post_2: {
        type: "string",
        description: "activity_urn of the second most similar past post.",
      },
      similar_post_3: {
        type: "string",
        description: "activity_urn of the third most similar past post.",
      },
    },
    required: [
      "predicted_reactions",
      "predicted_comments",
      "predicted_reposts",
      "rationale",
      "edit_1",
      "edit_2",
      "edit_3",
      "similar_post_1",
      "similar_post_2",
      "similar_post_3",
    ],
  },
};

const FORECAST_SYSTEM = `You are an expert LinkedIn engagement analyst. Given a company's recent posts (with engagement numbers) and a new draft post, you predict how the draft will perform and recommend specific edits.

Anchor every prediction in the corpus you were given:
- Posts that mirror their high-performing format land high.
- Posts that look like their flops land low.
- Out-of-character drafts (wrong topic, wrong tone, wrong length) underperform their average.
- If their median post gets 80 reactions, do not predict 5,000.

Hard rules:
- Never use em-dashes or en-dashes anywhere in your output. Use commas, periods, parentheses, or rewrite.
- No sycophantic language. Never write "Great draft", "Love this", "Excellent post".
- Never describe yourself as an AI.
- Edits must be specific and actionable. "Add a hook" is bad. "Replace the opener 'We are excited to announce' with the stat 'We grew 4x in Q2' because their top 3 posts all opened with a number" is good.
- The similar_post_1/2/3 fields must contain real activity_urn values from the corpus, copied verbatim.
- The rationale field is plain English prose for a human. Never put activity_urn numbers, raw IDs, or parenthetical "(N total)" engagement counts inside it — refer to past posts by their topic ("the x402 post", "the 24/5 trading announcement"). The user sees the actual numbers and post previews in a separate panel.

Always call submit_forecast.`;

const GENERATE_SYSTEM = `You are a LinkedIn copywriter. Given a company's recent posts (their voice DNA) and a topic, write a single new post in their voice.

Match their patterns:
- Length: roughly the same character count as their median post.
- Hook style: their typical opener (question, stat, story, announcement).
- Formatting: line break density, list usage, emoji habits as they actually use them in the corpus.
- Vocabulary, register, and tone.

Hard rules:
- Never use em-dashes or en-dashes. Use commas, periods, parentheses, or rewrite.
- No "We are humbled to announce" or "Excited to share" or "I'm thrilled" openers unless the corpus actually uses them.
- No hashtags unless the corpus uses them.
- No quotation marks wrapping the whole post.
- Output ONLY the post body. No preamble, no labels, no commentary, no markdown headers.`;

function buildCorpusBrief(posts: LinkedInPost[]): string {
  if (posts.length === 0) return "Company: unknown\nNo posts available.";

  const sorted = [...posts].sort((a, b) => b.total_engagements - a.total_engagements);
  const totals = sorted.map((p) => p.total_engagements);
  const min = totals[totals.length - 1];
  const median = totals[Math.floor(totals.length / 2)];
  const top = totals[0];
  const avg = Math.round(totals.reduce((s, n) => s + n, 0) / totals.length);

  const lines: string[] = [];
  lines.push(`Company: ${posts[0].author.name || "(unknown)"}`);
  lines.push(`Sample size: ${posts.length} most recent original posts`);
  lines.push(
    `Engagement distribution (total = reactions + comments + reposts):`,
  );
  lines.push(`  min: ${min}, median: ${median}, avg: ${avg}, top: ${top}`);
  lines.push("");
  lines.push("Posts (top 5 by engagement, then a sample of 12 from the rest):");

  const topFive = sorted.slice(0, 5);
  const rest = sorted.slice(5);
  const sample: LinkedInPost[] = [];
  if (rest.length > 0) {
    const stride = Math.max(1, Math.floor(rest.length / 12));
    for (let i = 0; i < rest.length && sample.length < 12; i += stride) {
      sample.push(rest[i]);
    }
  }

  for (const p of [...topFive, ...sample]) {
    lines.push("");
    lines.push(`--- ${p.activity_urn} ---`);
    lines.push(
      `reactions: ${p.stats.total_reactions} | comments: ${p.stats.comments} | reposts: ${p.stats.reposts} | total: ${p.total_engagements}`,
    );
    if (p.media) lines.push(`media: ${p.media.type} (${p.media.items.length})`);
    if (p.document) lines.push(`document: "${p.document.title}" (${p.document.page_count}pg)`);
    const flat = p.text.replace(/\n+/g, " / ").slice(0, 700);
    lines.push(`text: ${flat}`);
  }
  return lines.join("\n");
}

function computePercentile(corpusTotals: number[], predictedTotal: number): number {
  if (corpusTotals.length === 0) return 50;
  const sorted = [...corpusTotals].sort((a, b) => a - b);
  const rank = sorted.filter((n) => n <= predictedTotal).length;
  return Math.round((rank / sorted.length) * 100);
}

export async function forecastEngagement(
  posts: LinkedInPost[],
  draft: string,
): Promise<Forecast> {
  const corpusBrief = buildCorpusBrief(posts);
  const userPrompt = `${corpusBrief}\n\n--- DRAFT TO FORECAST ---\n${draft.trim()}\n\nCall submit_forecast.`;

  const response = await claude().messages.create({
    model: SONNET,
    max_tokens: 4096,
    thinking: { type: "disabled" },
    output_config: { effort: "medium" },
    tools: [FORECAST_TOOL],
    tool_choice: { type: "tool", name: "submit_forecast" },
    system: [
      {
        type: "text",
        text: FORECAST_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude didn't call submit_forecast.");
  }

  const input = toolUse.input as Record<string, unknown>;
  const reactions = Math.max(0, Math.round(Number(input.predicted_reactions) || 0));
  const comments = Math.max(0, Math.round(Number(input.predicted_comments) || 0));
  const reposts = Math.max(0, Math.round(Number(input.predicted_reposts) || 0));
  const total = reactions + comments + reposts;

  const percentile = computePercentile(
    posts.map((p) => p.total_engagements),
    total,
  );

  const edits = ["edit_1", "edit_2", "edit_3"]
    .map((k) => input[k])
    .filter((e): e is string => typeof e === "string" && e.trim().length > 0);

  const validUrns = new Set(posts.map((p) => p.activity_urn));
  const similar = ["similar_post_1", "similar_post_2", "similar_post_3"]
    .map((k) => input[k])
    .filter((s): s is string => typeof s === "string" && validUrns.has(s));

  const rawRationale =
    typeof input.rationale === "string" ? input.rationale.trim() : "";

  return {
    predicted_reactions: reactions,
    predicted_comments: comments,
    predicted_reposts: reposts,
    predicted_total: total,
    percentile,
    rationale: cleanRationale(rawRationale),
    edits,
    similar_post_urns: similar,
  };
}

// Strip parenthetical URN/stat dumps Claude sometimes leaks into prose, like
// "the x402 post (7445460759133769728, 451 total)" → "the x402 post".
function cleanRationale(text: string): string {
  return text
    .replace(/\s*\(\s*\d{16,}\s*(?:,\s*\d[\d,]*\s*total)?\s*\)/gi, "")
    .replace(/\s*\(\s*\d[\d,]+\s*total\s*\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function generateDraftPost(
  posts: LinkedInPost[],
  topic: string,
): Promise<string> {
  const corpusBrief = buildCorpusBrief(posts);
  const userPrompt = `${corpusBrief}\n\n--- TOPIC ---\n${topic.trim()}\n\nWrite a single LinkedIn post for this company about this topic, in their voice. Output only the post body.`;

  const response = await claude().messages.create({
    model: SONNET,
    max_tokens: 2048,
    thinking: { type: "disabled" },
    output_config: { effort: "medium" },
    system: [
      {
        type: "text",
        text: GENERATE_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no draft text.");
  }
  return textBlock.text
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/[—–]/g, ",");
}
