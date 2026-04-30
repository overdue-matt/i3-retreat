// Thin wrapper around xAI / Grok (OpenAI-compatible endpoint).
// Used for research and content generation.

import OpenAI from "openai";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;
  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error("XAI_API_KEY is missing from .env.");
  _client = new OpenAI({
    apiKey: key,
    baseURL: "https://api.x.ai/v1",
  });
  return _client;
}

export const GROK_MODEL = "grok-4.20-reasoning";

export type NewsStory = {
  summary: string;
  url: string;
  source: string;
};

/**
 * Research recent news on a topic and return a list of stories with links.
 */
export async function researchTopic(topic: string): Promise<NewsStory[]> {
  const client = getClient();

  const prompt = `Search for the 3-5 most important news stories about "${topic}" from the last 24 hours. For each story, provide a 1-2 sentence summary, the source URL, and the publication name.

Return ONLY valid JSON in this exact format:
[
  {
    "summary": "Brief 1-2 sentence summary of the news.",
    "url": "https://example.com/article",
    "source": "Publication Name"
  }
]

Be factual, concise, and include real URLs from credible sources.`;

  const response = await client.chat.completions.create({
    model: GROK_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content?.trim() || "[]";

  try {
    const stories = JSON.parse(content);
    if (Array.isArray(stories)) {
      return stories.filter(
        (s): s is NewsStory =>
          typeof s === "object" &&
          typeof s.summary === "string" &&
          typeof s.url === "string" &&
          typeof s.source === "string"
      );
    }
  } catch {
    // Fallback: treat as plain text
    return [
      {
        summary: content,
        url: "#",
        source: "Research",
      },
    ];
  }

  return [];
}

type PostVariation = {
  angle: "hot_take" | "explainer" | "contrarian";
  text: string;
  imagePrompt: string;
};

/**
 * Generate 3 post variations based on news stories and target voice.
 */
export async function generatePostVariations(
  topic: string,
  news: NewsStory[],
  voiceSamples: string[],
): Promise<PostVariation[]> {
  const client = getClient();

  const newsBlock = news
    .map((n, i) => `${i + 1}. ${n.summary} (${n.source})`)
    .join("\n");
  const voiceBlock = voiceSamples.map((v, i) => `${i + 1}. ${v}`).join("\n\n");

  const prompt = `You are a social media content generator. Given recent news about "${topic}" and sample posts from a target account, generate 3 X/Twitter posts in that account's voice.

Recent news:
${newsBlock}

Sample posts from target account (learn their voice, tone, and style):
${voiceBlock}

Generate 3 posts with these angles:
- HOT_TAKE: Strong opinion or bold claim about the news
- EXPLAINER: Clear, informative breakdown of what's happening
- CONTRARIAN: Takes an unexpected or counter-intuitive angle

Rules:
- Each post must be ≤280 characters
- Match the target account's voice, tone, and style exactly
- No hashtags
- No emojis unless the target account uses them heavily
- NEVER use em-dashes (—) or en-dashes (–). Use commas, periods, or rewrite.
- Each post must reference the actual news, not generic commentary
- Be specific and engaging

Also generate a detailed image prompt for each post. The image should be eye-catching and relevant to the news topic. Describe:
- Visual style (e.g., minimalist, bold, tech-focused, abstract)
- Key visual elements or subject matter
- Color mood if relevant
- Should be specific enough to generate a compelling social media image

Return ONLY valid JSON in this exact format:
[
  {
    "angle": "hot_take",
    "text": "The actual post text here",
    "imagePrompt": "Simple visual description here"
  },
  {
    "angle": "explainer",
    "text": "The actual post text here",
    "imagePrompt": "Simple visual description here"
  },
  {
    "angle": "contrarian",
    "text": "The actual post text here",
    "imagePrompt": "Simple visual description here"
  }
]`;

  const response = await client.chat.completions.create({
    model: GROK_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content?.trim() || "[]";

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length === 3) {
      return parsed as PostVariation[];
    }
  } catch (e) {
    console.error("Failed to parse Grok response:", e);
  }

  // Fallback
  return [
    {
      angle: "hot_take",
      text: `${topic} is happening right now. This changes everything.`,
      imagePrompt: "Breaking news graphic with bold text",
    },
    {
      angle: "explainer",
      text: `Here's what you need to know about ${topic}: [News summary]`,
      imagePrompt: "Clean infographic explaining the topic",
    },
    {
      angle: "contrarian",
      text: `Everyone's talking about ${topic}, but they're missing the real story.`,
      imagePrompt: "Thought-provoking abstract visual",
    },
  ];
}
