// Thin wrapper around the Apify LinkedIn company-posts actor.
// Exports `fetchLinkedInPosts(slugOrUrl, limit)` that returns normalized posts.
// Reposts (the company sharing other companies' posts) are filtered out.

const APIFY_BASE = "https://api.apify.com/v2";
const ACTOR = "apimaestro~linkedin-company-posts";

export type LinkedInMediaItem = {
  url: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail?: string;
};

export type LinkedInMedia = {
  type: "image" | "video";
  items: LinkedInMediaItem[];
};

export type LinkedInDocument = {
  title: string;
  page_count: number;
  url: string;
};

export type LinkedInAuthor = {
  name: string;
  follower_count: number;
  company_url: string;
  logo_url: string;
};

export type LinkedInStats = {
  total_reactions: number;
  like: number;
  celebrate: number;
  support: number;
  love: number;
  insightful: number;
  funny: number;
  comments: number;
  reposts: number;
};

export type LinkedInPost = {
  activity_urn: string;
  post_url: string;
  text: string;
  posted_at_iso: string;
  posted_at_relative: string;
  author: LinkedInAuthor;
  stats: LinkedInStats;
  total_engagements: number;
  media: LinkedInMedia | null;
  document: LinkedInDocument | null;
};

const COMPANY_RE = /linkedin\.com\/(?:company|school)\/([^/?#]+)/i;
const PERSONAL_RE = /linkedin\.com\/in\//i;
const BARE_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

export type SlugError = "personal_profile" | "invalid";

export function slugFromInput(
  input: string,
): { slug: string } | { error: SlugError } {
  const trimmed = input.trim();
  if (!trimmed) return { error: "invalid" };

  // Personal profile URL — different actor needed, not supported here.
  if (PERSONAL_RE.test(trimmed)) return { error: "personal_profile" };

  // Company / school URL — extract slug.
  const match = trimmed.match(COMPANY_RE);
  if (match) {
    const slug = match[1].toLowerCase().replace(/\/+$/, "");
    return BARE_SLUG_RE.test(slug) ? { slug } : { error: "invalid" };
  }

  // Bare slug (no URL parts).
  if (/^https?:\/\//i.test(trimmed) || trimmed.includes("/")) {
    return { error: "invalid" };
  }
  const slug = trimmed.toLowerCase().replace(/^@/, "");
  return BARE_SLUG_RE.test(slug) ? { slug } : { error: "invalid" };
}

type RawPost = {
  activity_urn?: string;
  post_url?: string;
  text?: string;
  post_type?: string;
  posted_at?: { date?: string; relative?: string };
  author?: {
    name?: string;
    follower_count?: number;
    company_url?: string;
    logo_url?: string;
  };
  stats?: Partial<LinkedInStats>;
  media?: { type?: string; items?: unknown[] };
  document?: { title?: string; page_count?: number; url?: string } | null;
  source_company?: string;
};

function parseDate(s: string | undefined): string {
  if (!s) return "";
  const iso = s.replace(" ", "T") + "Z";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

function isRepost(raw: RawPost): boolean {
  // (1) post_type explicitly signals a repost / share
  const postType = (raw.post_type || "").toLowerCase();
  if (
    postType === "share" ||
    postType === "reshare" ||
    postType === "repost" ||
    postType.includes("repost") ||
    postType.includes("reshare")
  ) {
    return true;
  }

  // (2) author slug differs from the slug we queried for
  const sourceCompany = raw.source_company?.toLowerCase();
  const companyUrl = raw.author?.company_url || "";
  const m = companyUrl.match(/linkedin\.com\/company\/([^/?#]+)/i);
  const authorSlug = m ? m[1].toLowerCase() : "";
  if (sourceCompany && authorSlug && authorSlug !== sourceCompany) {
    return true;
  }

  return false;
}

function normalizeMedia(raw: RawPost["media"]): LinkedInMedia | null {
  if (!raw || !raw.items || !Array.isArray(raw.items) || raw.items.length === 0) return null;
  const type = raw.type === "image" || raw.type === "video" ? raw.type : null;
  if (!type) return null;
  const items: LinkedInMediaItem[] = [];
  for (const it of raw.items as Array<Record<string, unknown>>) {
    const url = typeof it.url === "string" ? it.url : "";
    if (!url) continue;
    items.push({
      url,
      width: typeof it.width === "number" ? it.width : undefined,
      height: typeof it.height === "number" ? it.height : undefined,
      duration: typeof it.duration === "number" ? it.duration : undefined,
      thumbnail: typeof it.thumbnail === "string" ? it.thumbnail : undefined,
    });
  }
  return items.length > 0 ? { type, items } : null;
}

function normalize(raw: RawPost): LinkedInPost | null {
  if (!raw.activity_urn || !raw.post_url || typeof raw.text !== "string") return null;
  // Empty-bodied posts are almost always pure shares with no original content.
  if (raw.text.trim().length === 0) return null;
  if (isRepost(raw)) return null;

  const stats: LinkedInStats = {
    total_reactions: raw.stats?.total_reactions ?? 0,
    like: raw.stats?.like ?? 0,
    celebrate: raw.stats?.celebrate ?? 0,
    support: raw.stats?.support ?? 0,
    love: raw.stats?.love ?? 0,
    insightful: raw.stats?.insightful ?? 0,
    funny: raw.stats?.funny ?? 0,
    comments: raw.stats?.comments ?? 0,
    reposts: raw.stats?.reposts ?? 0,
  };
  if (!stats.total_reactions) {
    stats.total_reactions =
      stats.like + stats.celebrate + stats.support + stats.love + stats.insightful + stats.funny;
  }
  const total_engagements = stats.total_reactions + stats.comments + stats.reposts;

  const document: LinkedInDocument | null =
    raw.document && raw.document.title && raw.document.url && raw.document.page_count
      ? {
          title: raw.document.title,
          page_count: raw.document.page_count,
          url: raw.document.url,
        }
      : null;

  return {
    activity_urn: raw.activity_urn,
    post_url: raw.post_url,
    text: raw.text,
    posted_at_iso: parseDate(raw.posted_at?.date),
    posted_at_relative: raw.posted_at?.relative || "",
    author: {
      name: raw.author?.name || "",
      follower_count: raw.author?.follower_count ?? 0,
      company_url: raw.author?.company_url || "",
      logo_url: raw.author?.logo_url || "",
    },
    stats,
    total_engagements,
    media: normalizeMedia(raw.media),
    document,
  };
}

export type FetchPostsResult =
  | { ok: true; slug: string; posts: LinkedInPost[] }
  | { ok: false; error: string };

export async function fetchLinkedInPosts(
  input: string,
  limit = 50,
): Promise<FetchPostsResult> {
  const parsed = slugFromInput(input);
  if ("error" in parsed) {
    if (parsed.error === "personal_profile") {
      return {
        ok: false,
        error:
          "That's a personal profile (linkedin.com/in/...). This forecaster works on company pages only — try a URL like linkedin.com/company/stripe instead.",
      };
    }
    return {
      ok: false,
      error:
        "That doesn't look like a LinkedIn company. Paste a full URL (linkedin.com/company/stripe) or just the slug (stripe).",
    };
  }
  const slug = parsed.slug;

  const token = process.env.APIFY_API_TOKEN;
  if (!token) return { ok: false, error: "APIFY_API_TOKEN is missing from .env." };

  let runRes: Response;
  try {
    runRes = await fetch(
      `${APIFY_BASE}/acts/${ACTOR}/runs?timeout=240&waitForFinish=240`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company_name: slug,
          page_number: 1,
          limit,
          sort: "recent",
        }),
        cache: "no-store",
      },
    );
  } catch {
    return { ok: false, error: "Couldn't reach Apify. Check your network." };
  }

  if (!runRes.ok) {
    if (runRes.status === 401 || runRes.status === 403)
      return { ok: false, error: "Apify auth failed. Check APIFY_API_TOKEN." };
    return { ok: false, error: `Apify error (${runRes.status}).` };
  }

  const runJson = (await runRes.json()) as {
    data?: { status?: string; defaultDatasetId?: string };
  };
  const run = runJson.data;
  if (!run || run.status !== "SUCCEEDED" || !run.defaultDatasetId) {
    return {
      ok: false,
      error: `Scraper finished with status: ${run?.status || "unknown"}. The slug may be wrong or the company private.`,
    };
  }

  const itemsRes = await fetch(
    `${APIFY_BASE}/datasets/${run.defaultDatasetId}/items?format=json`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (!itemsRes.ok) {
    return { ok: false, error: `Couldn't read scraper output (${itemsRes.status}).` };
  }

  const items = (await itemsRes.json()) as RawPost[];
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: `No posts found for "${slug}". Double-check the slug.` };
  }

  const posts = items
    .map(normalize)
    .filter((p): p is LinkedInPost => p !== null)
    .sort((a, b) => {
      const at = a.posted_at_iso ? Date.parse(a.posted_at_iso) : 0;
      const bt = b.posted_at_iso ? Date.parse(b.posted_at_iso) : 0;
      return bt - at;
    });

  if (posts.length === 0) {
    return {
      ok: false,
      error: `Found ${items.length} items but none were original posts (all reposts).`,
    };
  }

  return { ok: true, slug, posts };
}
