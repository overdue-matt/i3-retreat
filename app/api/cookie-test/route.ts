// Diagnostic endpoint for the Cookie3 / Cookie.fun API.
// Hit `localhost:3000/api/cookie-test` in your browser. It tries a handful of
// base URLs + endpoints + auth patterns and returns a JSON report so you can
// see which combination actually responds.
//
// Delete this file once Cookie3 is wired up correctly.

// preview.cookie.fun is the Next.js website. The API likely lives at
// /api/... on that same host. Also probing the production website.
const BASES = [
  "https://preview.cookie.fun",
  "https://www.cookie.fun",
  "https://cookie.fun",
];

const PATH_PREFIXES = ["/api", ""];

// We compose <base><prefix>/v3/sectors and POST <base><prefix>/v3/account/query.
const SECTOR_PATH = "/v3/sectors";
const QUERY_PATH = "/v3/account/query";

// Auth header variations. Some APIs use Authorization: Bearer, some use
// x-api-key, some prefix with the username, some use Basic auth.
type AuthVariant = {
  name: string;
  build: (user: string, key: string) => Record<string, string>;
};
const AUTHS: AuthVariant[] = [
  {
    name: "x-api-key",
    build: (_u, k) => ({ "x-api-key": k }),
  },
  {
    name: "Bearer",
    build: (_u, k) => ({ Authorization: `Bearer ${k}` }),
  },
  {
    name: "Basic user:key",
    build: (u, k) => ({
      Authorization: `Basic ${Buffer.from(`${u}:${k}`).toString("base64")}`,
    }),
  },
  {
    name: "x-api-key + x-username",
    build: (u, k) => ({ "x-api-key": k, "x-username": u }),
  },
];

type Probe = {
  base: string;
  path: string;
  method: "GET" | "POST";
  auth: string;
  status: number | "fetch-failed";
  bodySample: string;
  headers: Record<string, string>;
};

function maskKey(key: string | undefined): string {
  if (!key) return "(missing)";
  if (key.length < 8) return "***";
  return `${key.slice(0, 4)}***${key.slice(-4)}`;
}

async function probe(
  base: string,
  path: string,
  method: "GET" | "POST",
  body: object | null,
  authName: string,
  authHeaders: Record<string, string>,
): Promise<Probe> {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const text = await res.text();
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      if (
        k === "content-type" ||
        k === "server" ||
        k === "www-authenticate" ||
        k === "x-ratelimit-remaining"
      ) {
        headers[k] = v;
      }
    });
    return {
      base,
      path,
      method,
      auth: authName,
      status: res.status,
      bodySample: text.slice(0, 300),
      headers,
    };
  } catch (err) {
    return {
      base,
      path,
      method,
      auth: authName,
      status: "fetch-failed",
      bodySample: err instanceof Error ? err.message : String(err),
      headers: {},
    };
  }
}

export async function GET() {
  const apiKey = process.env.COOKIE3_CREDENTIAL || "";
  const username = process.env.COOKIE3_USERNAME || "";

  if (!apiKey) {
    return Response.json(
      {
        ok: false,
        error:
          "COOKIE3_CREDENTIAL is missing from .env. Add it and restart the dev server.",
      },
      { status: 400 },
    );
  }

  const probes: Probe[] = [];
  let winner: Probe | null = null;

  // Sweep <base><prefix><path> × auth, with POST against query endpoint
  // (sectors is GET but the website answers HTML on every GET, so it's not
  // a useful signal — POST against /v3/account/query gives clearer status).
  outer: for (const base of BASES) {
    for (const prefix of PATH_PREFIXES) {
      for (const auth of AUTHS) {
        const headers = auth.build(username, apiKey);
        const fullPath = `${prefix}${QUERY_PATH}`;
        const p = await probe(
          base,
          fullPath,
          "POST",
          {
            searchQuery: "bitcoin",
            sortBy: "SmartEngagementPoints",
            sortOrder: "Descending",
          },
          auth.name,
          headers,
        );
        probes.push(p);
        // Real API success will return JSON (not HTML). Accept anything < 400
        // that's not text/html.
        const ct = p.headers["content-type"] || "";
        if (
          typeof p.status === "number" &&
          p.status < 400 &&
          !ct.includes("text/html")
        ) {
          winner = p;
          break outer;
        }
      }
    }
  }

  // Also confirm with a GET sectors against the winning base+prefix.
  let sectorsCheck: Probe | null = null;
  if (winner) {
    const prefix = winner.path.replace(QUERY_PATH, "");
    const authVariant = AUTHS.find((a) => a.name === winner!.auth);
    if (authVariant) {
      sectorsCheck = await probe(
        winner.base,
        `${prefix}${SECTOR_PATH}`,
        "GET",
        null,
        winner.auth,
        authVariant.build(username, apiKey),
      );
    }
  }

  return Response.json({
    ok: true,
    auth: {
      cookie3_credential: maskKey(apiKey),
      cookie3_username: username || "(empty)",
    },
    sweep: probes,
    winner,
    sectorsCheck,
    hint: winner
      ? `Use BASE='${winner.base}', path prefix='${winner.path.replace(QUERY_PATH, "")}', auth='${winner.auth}'.`
      : "No combination returned a non-HTML < 400. The real API host might still be hidden behind a different domain.",
  });
}
