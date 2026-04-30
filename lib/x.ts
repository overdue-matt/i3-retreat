// Thin wrapper around the X (Twitter) v2 single-tweet endpoint.
// Returns a tweet with its author, media, and the quoted tweet (if any).

const TWEET_FIELDS = [
  "created_at",
  "public_metrics",
  "attachments",
  "referenced_tweets",
  "author_id",
  "note_tweet",
].join(",");

const USER_FIELDS = [
  "name",
  "username",
  "profile_image_url",
  "verified",
  "verified_type",
].join(",");

const MEDIA_FIELDS = [
  "url",
  "preview_image_url",
  "type",
  "variants",
  "height",
  "width",
  "alt_text",
].join(",");

const EXPANSIONS = [
  "author_id",
  "attachments.media_keys",
  "referenced_tweets.id",
  "referenced_tweets.id.author_id",
  "referenced_tweets.id.attachments.media_keys",
].join(",");

export type Media = {
  type: "photo" | "video" | "animated_gif";
  url: string | null;
  preview_image_url: string | null;
  width?: number;
  height?: number;
  alt_text?: string;
};

export type Author = {
  name: string;
  username: string;
  profile_image_url: string;
  verified: boolean;
};

export type Metrics = {
  like_count: number;
  retweet_count: number;
  reply_count: number;
  quote_count: number;
  bookmark_count?: number;
  impression_count?: number;
};

export type Tweet = {
  id: string;
  url: string;
  text: string;
  created_at: string;
  author: Author;
  metrics: Metrics;
  media: Media[];
  quoted: Omit<Tweet, "quoted"> | null;
};

export type FetchError = {
  error: string;
  status?: number;
};

const URL_RE =
  /^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d+)/i;

export function extractTweetId(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  const match = trimmed.match(URL_RE);
  return match ? match[1] : null;
}

type RawTweet = {
  id: string;
  text: string;
  created_at?: string;
  author_id?: string;
  public_metrics?: Metrics;
  attachments?: { media_keys?: string[] };
  referenced_tweets?: Array<{ type: string; id: string }>;
  note_tweet?: { text: string };
};

type RawUser = {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  verified?: boolean;
  verified_type?: string;
};

type RawMedia = {
  media_key: string;
  type: "photo" | "video" | "animated_gif";
  url?: string;
  preview_image_url?: string;
  width?: number;
  height?: number;
  alt_text?: string;
};

type RawResponse = {
  data?: RawTweet;
  includes?: {
    users?: RawUser[];
    media?: RawMedia[];
    tweets?: RawTweet[];
  };
  errors?: Array<{ title?: string; detail?: string }>;
};

function buildAuthor(user: RawUser | undefined): Author {
  if (!user) {
    return {
      name: "Unknown",
      username: "unknown",
      profile_image_url: "",
      verified: false,
    };
  }
  // Bump default _normal (48px) to _400x400 for crisp avatars.
  const profile_image_url = (user.profile_image_url || "").replace(
    "_normal",
    "_400x400",
  );
  return {
    name: user.name,
    username: user.username,
    profile_image_url,
    verified: Boolean(user.verified) || Boolean(user.verified_type),
  };
}

function buildMedia(
  keys: string[] | undefined,
  mediaIndex: Map<string, RawMedia>,
): Media[] {
  if (!keys) return [];
  const out: Media[] = [];
  for (const key of keys) {
    const m = mediaIndex.get(key);
    if (!m) continue;
    out.push({
      type: m.type,
      url: m.url ?? null,
      preview_image_url: m.preview_image_url ?? null,
      width: m.width,
      height: m.height,
      alt_text: m.alt_text,
    });
  }
  return out;
}

function shapeTweet(
  raw: RawTweet,
  userIndex: Map<string, RawUser>,
  mediaIndex: Map<string, RawMedia>,
): Omit<Tweet, "quoted"> {
  const author = buildAuthor(
    raw.author_id ? userIndex.get(raw.author_id) : undefined,
  );
  return {
    id: raw.id,
    url: `https://x.com/${author.username}/status/${raw.id}`,
    text: raw.note_tweet?.text || raw.text,
    created_at: raw.created_at || "",
    author,
    metrics: raw.public_metrics || {
      like_count: 0,
      retweet_count: 0,
      reply_count: 0,
      quote_count: 0,
    },
    media: buildMedia(raw.attachments?.media_keys, mediaIndex),
  };
}

export async function fetchTweet(
  urlOrId: string,
): Promise<Tweet | FetchError> {
  const id = extractTweetId(urlOrId);
  if (!id) {
    return { error: "That doesn't look like an X / Twitter URL." };
  }

  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) {
    return { error: "TWITTER_BEARER_TOKEN is missing from .env." };
  }

  const params = new URLSearchParams({
    "tweet.fields": TWEET_FIELDS,
    "user.fields": USER_FIELDS,
    "media.fields": MEDIA_FIELDS,
    expansions: EXPANSIONS,
  });

  const res = await fetch(`https://api.twitter.com/2/tweets/${id}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 404) return { error: "Tweet not found — it may have been deleted or the account is protected.", status: 404 };
    if (res.status === 401 || res.status === 403)
      return { error: "X API auth failed. Check TWITTER_BEARER_TOKEN.", status: res.status };
    if (res.status === 429)
      return { error: "X API rate limit hit. Wait a minute and try again.", status: 429 };
    return { error: `X API error (${res.status}).`, status: res.status };
  }

  const json = (await res.json()) as RawResponse;

  if (!json.data) {
    const detail = json.errors?.[0]?.detail || json.errors?.[0]?.title;
    return { error: detail || "X returned no tweet data." };
  }

  const userIndex = new Map<string, RawUser>(
    (json.includes?.users || []).map((u) => [u.id, u]),
  );
  const mediaIndex = new Map<string, RawMedia>(
    (json.includes?.media || []).map((m) => [m.media_key, m]),
  );
  const tweetIndex = new Map<string, RawTweet>(
    (json.includes?.tweets || []).map((t) => [t.id, t]),
  );

  const main = shapeTweet(json.data, userIndex, mediaIndex);

  // Find a quoted tweet (if any) and shape it too.
  let quoted: Omit<Tweet, "quoted"> | null = null;
  const quotedRef = json.data.referenced_tweets?.find(
    (r) => r.type === "quoted",
  );
  if (quotedRef) {
    const rawQuoted = tweetIndex.get(quotedRef.id);
    if (rawQuoted) {
      quoted = shapeTweet(rawQuoted, userIndex, mediaIndex);
    }
  }

  return { ...main, quoted };
}

/**
 * Fetch recent tweets from a user by username.
 * Returns up to `count` of their most recent tweets (default 20, max 100).
 */
export async function fetchUserTweets(
  username: string,
  count: number = 20,
): Promise<string[] | FetchError> {
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) {
    return { error: "TWITTER_BEARER_TOKEN is missing from .env." };
  }

  // First, get user ID from username
  const userRes = await fetch(
    `https://api.twitter.com/2/users/by/username/${username}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );

  if (!userRes.ok) {
    if (userRes.status === 404)
      return { error: `User @${username} not found.`, status: 404 };
    if (userRes.status === 401 || userRes.status === 403)
      return {
        error: "X API auth failed. Check TWITTER_BEARER_TOKEN.",
        status: userRes.status,
      };
    return { error: `X API error (${userRes.status}).`, status: userRes.status };
  }

  const userData = (await userRes.json()) as { data?: { id: string } };
  const userId = userData.data?.id;
  if (!userId) {
    return { error: `Could not find user ID for @${username}.` };
  }

  // Now fetch their tweets
  const params = new URLSearchParams({
    max_results: String(Math.min(count, 100)),
    exclude: "retweets,replies",
  });

  const tweetsRes = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?${params}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );

  if (!tweetsRes.ok) {
    if (tweetsRes.status === 429)
      return {
        error: "X API rate limit hit. Wait a minute and try again.",
        status: 429,
      };
    return {
      error: `X API error (${tweetsRes.status}).`,
      status: tweetsRes.status,
    };
  }

  const tweetsData = (await tweetsRes.json()) as {
    data?: Array<{ text: string }>;
  };

  if (!tweetsData.data || tweetsData.data.length === 0) {
    return { error: `No recent tweets found for @${username}.` };
  }

  return tweetsData.data.map((t) => t.text);
}
