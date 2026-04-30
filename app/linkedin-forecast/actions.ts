"use server";

import { fetchLinkedInPosts, type LinkedInPost } from "@/lib/linkedin";
import {
  forecastEngagement,
  generateDraftPost,
  type Forecast,
} from "@/lib/linkedin-forecast";

export type LoadCompanyResult =
  | { ok: true; slug: string; posts: LinkedInPost[] }
  | { ok: false; error: string };

export async function loadCompanyAction(
  input: string,
): Promise<LoadCompanyResult> {
  const result = await fetchLinkedInPosts(input, 50);
  return result;
}

export type ForecastResult =
  | { ok: true; forecast: Forecast }
  | { ok: false; error: string };

export async function forecastAction(
  posts: LinkedInPost[],
  draft: string,
): Promise<ForecastResult> {
  const trimmed = draft.trim();
  if (trimmed.length < 10) {
    return { ok: false, error: "Draft is too short to forecast." };
  }
  if (posts.length === 0) {
    return { ok: false, error: "Load a company first." };
  }
  try {
    const forecast = await forecastEngagement(posts, trimmed);
    return { ok: true, forecast };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Forecast failed.";
    return { ok: false, error: message };
  }
}

export type GenerateResult =
  | { ok: true; draft: string }
  | { ok: false; error: string };

export async function generateDraftAction(
  posts: LinkedInPost[],
  topic: string,
): Promise<GenerateResult> {
  const trimmed = topic.trim();
  if (trimmed.length < 3) {
    return { ok: false, error: "Topic is too short." };
  }
  if (posts.length === 0) {
    return { ok: false, error: "Load a company first." };
  }
  try {
    const draft = await generateDraftPost(posts, trimmed);
    return { ok: true, draft };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Draft generation failed.";
    return { ok: false, error: message };
  }
}
