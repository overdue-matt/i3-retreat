// Thin wrapper around the Cookie.fun (Cookie3) v3 API.
// The docs ask for an `x-api-key` header — we send COOKIE3_CREDENTIAL there.
// COOKIE3_USERNAME exists in .env.example but isn't used by the v3 API.

const BASE_URL = "https://api.cookie.fun";

export type CookieAccount = {
  username: string;
  user_id: string | null;
  display_name: string;
  profile_image_url: string | null;
  bio: string | null;
  verified: boolean;
  followers_count: number;
  smart_followers_count: number;
  mindshare: number;
  smart_engagement_points: number;
  matching_tweets_count: number;
  /** Whatever raw shape we got, kept for debugging. */
  raw: Record<string, unknown>;
};

export type CookieTweetMedia = {
  type: "photo" | "video" | "gif";
  url: string;
  preview_image_url: string | null;
};

export type CookieTweet = {
  id: string;
  url: string;
  text: string;
  created_at: string;
  has_media: boolean;
  media: CookieTweetMedia[];
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  smart_engagements: number;
  author_username: string;
  author_display_name: string;
  author_profile_image_url: string | null;
};

export type CookieError = {
  error: string;
  status?: number;
};

type AuthHeaderResult =
  | { ok: true; headers: Record<string, string> }
  | { ok: false; error: string };

function authHeader(): AuthHeaderResult {
  const key = process.env.COOKIE3_CREDENTIAL;
  if (!key) {
    return { ok: false, error: "COOKIE3_CREDENTIAL is missing from .env." };
  }
  return {
    ok: true,
    headers: {
      "x-api-key": key,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };
}

async function postJson<T = unknown>(
  path: string,
  body: Record<string, unknown>,
): Promise<T | CookieError> {
  const auth = authHeader();
  if (!auth.ok) return { error: auth.error };
  const headers = auth.headers;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return { error: "Couldn't reach Cookie3. Check your network." };
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return {
        error: "Cookie3 auth failed. Check COOKIE3_CREDENTIAL.",
        status: res.status,
      };
    }
    if (res.status === 429) {
      return { error: "Cookie3 rate limit hit. Try again in a minute.", status: 429 };
    }
    return { error: `Cookie3 error (${res.status}).`, status: res.status };
  }

  const json = (await res.json()) as {
    ok?: T;
    success?: boolean;
    error?: { errorMessage?: string; errorType?: string };
  };

  if (json.success === false || json.error) {
    const detail =
      json.error?.errorMessage ||
      json.error?.errorType ||
      "Cookie3 returned an error.";
    return { error: detail };
  }

  return (json.ok ?? (json as unknown as T)) as T;
}

/* ---------- helpers ---------- */

function n(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function s(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function pickFirst<T>(obj: Record<string, unknown>, keys: string[]): T | undefined {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key] as T;
  }
  return undefined;
}

function normalizeAccount(raw: unknown): CookieAccount | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const username = s(
    pickFirst<string>(r, ["username", "screenName", "userName", "handle"]),
  );
  if (!username) return null;
  return {
    username: username.replace(/^@/, ""),
    user_id: s(pickFirst<string>(r, ["userId", "user_id", "id"])) || null,
    display_name: s(
      pickFirst<string>(r, [
        "displayName",
        "name",
        "fullName",
        "display_name",
      ]),
    ),
    profile_image_url:
      s(
        pickFirst<string>(r, [
          "profileImageUrl",
          "profileImage",
          "avatarUrl",
          "profile_image_url",
        ]),
      ) || null,
    bio:
      s(pickFirst<string>(r, ["bio", "description", "about"])) || null,
    verified: Boolean(
      pickFirst<boolean>(r, ["verified", "isVerified", "is_verified"]),
    ),
    followers_count: n(
      pickFirst(r, ["followersCount", "followers", "followerCount"]),
    ),
    smart_followers_count: n(
      pickFirst(r, [
        "smartFollowersCount",
        "smartFollowers",
        "smart_followers_count",
      ]),
    ),
    mindshare: n(pickFirst(r, ["mindshare", "mindShare", "mindshareScore"])),
    smart_engagement_points: n(
      pickFirst(r, [
        "smartEngagementPoints",
        "smart_engagement_points",
        "smartEngagement",
      ]),
    ),
    matching_tweets_count: n(
      pickFirst(r, ["matchingTweetsCount", "matchingTweets", "tweetCount"]),
    ),
    raw: r,
  };
}

function normalizeTweet(raw: unknown, fallbackAuthor?: CookieAccount): CookieTweet | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = s(pickFirst<string>(r, ["id", "tweetId", "tweet_id"]));
  if (!id) return null;
  const text = s(pickFirst<string>(r, ["text", "content", "fullText"]));
  if (!text) return null;

  // Author may live on the tweet object or fall back to the parent account.
  const authorRaw = (r.author as Record<string, unknown> | undefined) || {};
  const authorUsername =
    s(
      pickFirst<string>(authorRaw, ["username", "screenName", "handle"]),
    ) || fallbackAuthor?.username || "";
  const authorDisplayName =
    s(
      pickFirst<string>(authorRaw, ["displayName", "name", "fullName"]),
    ) || fallbackAuthor?.display_name || "";
  const authorImage =
    s(
      pickFirst<string>(authorRaw, [
        "profileImageUrl",
        "profileImage",
        "avatarUrl",
      ]),
    ) || fallbackAuthor?.profile_image_url || "";

  const url =
    s(pickFirst<string>(r, ["url", "tweetUrl", "permalink"])) ||
    (authorUsername ? `https://x.com/${authorUsername}/status/${id}` : "");

  // Media — try a few shapes.
  const mediaRaw = (r.media || r.attachments || []) as unknown[];
  const media: CookieTweetMedia[] = Array.isArray(mediaRaw)
    ? mediaRaw
        .map((m): CookieTweetMedia | null => {
          if (!m || typeof m !== "object") return null;
          const mo = m as Record<string, unknown>;
          const mUrl = s(
            pickFirst<string>(mo, ["url", "mediaUrl", "src"]),
          );
          if (!mUrl) return null;
          const t = s(pickFirst<string>(mo, ["type", "mediaType"])).toLowerCase();
          const type: CookieTweetMedia["type"] =
            t === "video" ? "video" : t === "gif" || t === "animated_gif" ? "gif" : "photo";
          return {
            type,
            url: mUrl,
            preview_image_url:
              s(
                pickFirst<string>(mo, [
                  "previewImageUrl",
                  "thumbnail",
                  "preview_image_url",
                ]),
              ) || null,
          };
        })
        .filter((m): m is CookieTweetMedia => m !== null)
    : [];

  return {
    id,
    url,
    text,
    created_at:
      s(pickFirst<string>(r, ["createdAt", "created_at", "date"])) || "",
    has_media: media.length > 0 || Boolean(r.hasMedia),
    media,
    likes: n(pickFirst(r, ["likesCount", "likes", "favoriteCount"])),
    retweets: n(pickFirst(r, ["retweetsCount", "retweets", "retweetCount"])),
    replies: n(pickFirst(r, ["repliesCount", "replies", "replyCount"])),
    impressions: n(pickFirst(r, ["impressions", "impressionsCount", "views"])),
    smart_engagements: n(
      pickFirst(r, [
        "smartEngagements",
        "smart_engagements",
        "smartEngagementCount",
      ]),
    ),
    author_username: authorUsername.replace(/^@/, ""),
    author_display_name: authorDisplayName,
    author_profile_image_url: authorImage || null,
  };
}

function unwrapList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const r = payload as Record<string, unknown>;
    for (const key of ["data", "items", "results", "accounts", "tweets", "feed"]) {
      const v = r[key];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

/* ---------- public API ---------- */

export type AccountQueryResult =
  | { ok: true; accounts: CookieAccount[] }
  | { ok: false; error: string };

export async function searchSmartAccounts(
  topic: string,
  limit = 5,
): Promise<AccountQueryResult> {
  const query = topic.trim();
  if (!query) return { ok: false, error: "Topic is empty." };

  const result = await postJson<unknown>("/v3/account/query", {
    searchQuery: query,
    type: "Original",
    sortBy: "SmartEngagementPoints",
    sortOrder: "Descending",
  });
  if (result && typeof result === "object" && "error" in (result as object)) {
    return { ok: false, error: (result as CookieError).error };
  }

  const list = unwrapList(result);
  const accounts = list
    .map(normalizeAccount)
    .filter((a): a is CookieAccount => a !== null)
    .slice(0, limit);

  if (accounts.length === 0) {
    return {
      ok: false,
      error: `No smart accounts found for "${query}". Try a broader topic.`,
    };
  }

  return { ok: true, accounts };
}

export type AccountFeedResult =
  | { ok: true; tweets: CookieTweet[] }
  | { ok: false; error: string };

export async function fetchAccountFeed(
  account: CookieAccount,
  limit = 20,
): Promise<AccountFeedResult> {
  const result = await postJson<unknown>("/v3/account/feed", {
    username: account.username,
    type: "Original",
    sortBy: "Impressions",
    sortOrder: "Descending",
  });
  if (result && typeof result === "object" && "error" in (result as object)) {
    return { ok: false, error: (result as CookieError).error };
  }

  const list = unwrapList(result);
  const tweets = list
    .map((t) => normalizeTweet(t, account))
    .filter((t): t is CookieTweet => t !== null)
    .slice(0, limit);

  return { ok: true, tweets };
}
