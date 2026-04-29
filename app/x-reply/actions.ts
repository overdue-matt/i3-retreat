"use server";

import { fetchTweet, type Tweet, type FetchError } from "@/lib/x";
import { generateReplies, type Reply } from "@/lib/anthropic";

export type FetchTweetResult =
  | { ok: true; tweet: Tweet }
  | { ok: false; error: string };

export type GenerateRepliesResult =
  | { ok: true; replies: Reply[] }
  | { ok: false; error: string };

export async function fetchTweetAction(url: string): Promise<FetchTweetResult> {
  const result = await fetchTweet(url);
  if ("error" in result) {
    return { ok: false, error: (result as FetchError).error };
  }
  return { ok: true, tweet: result };
}

export async function generateRepliesAction(
  tweet: Tweet,
): Promise<GenerateRepliesResult> {
  try {
    const replies = await generateReplies(tweet);
    return { ok: true, replies };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Reply generation failed.";
    return { ok: false, error: message };
  }
}
