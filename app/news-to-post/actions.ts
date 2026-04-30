"use server";

import { researchTopic, generatePostVariations, type NewsStory } from "@/lib/xai";
import { fetchUserTweets } from "@/lib/x";
import { generateImage, type ImagePayload } from "@/lib/gemini";

export type PostVariation = {
  angle: "hot_take" | "explainer" | "contrarian";
  label: string;
  text: string;
  image: ImagePayload | null;
};

export type GenerateResult =
  | {
      ok: true;
      news: NewsStory[];
      voiceSamples: string[];
      posts: PostVariation[];
    }
  | { ok: false; error: string };

const ANGLE_LABELS = {
  hot_take: "HOT TAKE",
  explainer: "EXPLAINER",
  contrarian: "CONTRARIAN",
};

/**
 * Main orchestration: research → voice → generate → images
 */
export async function generateNewsPostsAction(
  topic: string,
  targetHandle: string,
): Promise<GenerateResult> {
  try {
    // Step 1: Research the topic
    const news = await researchTopic(topic);
    if (news.length === 0) {
      return { ok: false, error: "No recent news found for this topic." };
    }

    // Step 2: Fetch voice samples from target account
    const tweetsResult = await fetchUserTweets(targetHandle, 20);
    if ("error" in tweetsResult) {
      return { ok: false, error: tweetsResult.error };
    }
    const voiceSamples = tweetsResult.slice(0, 10); // Use first 10 for voice

    // Step 3: Generate post variations
    const variations = await generatePostVariations(topic, news, voiceSamples);

    // Step 4: Generate images for each variation
    const posts: PostVariation[] = await Promise.all(
      variations.map(async (v) => {
        let image: ImagePayload | null = null;
        try {
          image = await generateImage(v.imagePrompt);
        } catch (err) {
          console.error(
            `Image generation failed for ${v.angle}:`,
            err instanceof Error ? err.message : err,
          );
          // Continue without image
        }

        return {
          angle: v.angle,
          label: ANGLE_LABELS[v.angle],
          text: v.text,
          image,
        };
      }),
    );

    return {
      ok: true,
      news,
      voiceSamples,
      posts,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Post generation failed.";
    return { ok: false, error: message };
  }
}
