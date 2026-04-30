"use server";

import {
  findSmartAccounts,
  type FinderResult,
} from "@/lib/cookie-finder";

export type FindResult =
  | { ok: true; result: FinderResult }
  | { ok: false; error: string };

export async function findAction(topic: string): Promise<FindResult> {
  const trimmed = topic.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: "Topic is too short. Try at least 2 characters." };
  }
  try {
    const result = await findSmartAccounts(trimmed);
    if ("error" in result) {
      return { ok: false, error: result.error };
    }
    return { ok: true, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Smart account search failed.";
    return { ok: false, error: message };
  }
}
