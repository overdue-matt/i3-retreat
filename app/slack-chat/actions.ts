"use server";

import {
  listChannels,
  loadConversations,
  type LoadedConversation,
  type SlackChannel,
} from "@/lib/slack";

export type ListChannelsResult =
  | { ok: true; channels: SlackChannel[] }
  | { ok: false; error: string };

export type LoadConversationsResult =
  | { ok: true; loaded: LoadedConversation }
  | { ok: false; error: string };

export async function listChannelsAction(): Promise<ListChannelsResult> {
  try {
    const channels = await listChannels();
    return { ok: true, channels };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to list channels.";
    return { ok: false, error: msg };
  }
}

export async function loadConversationsAction(
  channelIds: string[],
  windowDays: number,
): Promise<LoadConversationsResult> {
  if (channelIds.length === 0) {
    return { ok: false, error: "Pick at least one channel." };
  }
  if (![1, 7, 14, 30].includes(windowDays)) {
    return { ok: false, error: "Invalid time window." };
  }

  try {
    // Re-list to resolve IDs → names + private flag (cheap, cached by Slack on their side).
    const all = await listChannels();
    const byId = new Map(all.map((c) => [c.id, c]));
    const selected = channelIds
      .map((id) => byId.get(id))
      .filter((c): c is SlackChannel => Boolean(c));

    if (selected.length === 0) {
      return { ok: false, error: "Couldn't resolve any of the selected channels." };
    }

    const loaded = await loadConversations(selected, windowDays);
    return { ok: true, loaded };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load conversations.";
    return { ok: false, error: msg };
  }
}
