/**
 * Mock data for Cloudflare Pages preview deployments.
 *
 * When `VITE_PREVIEW` is "true", the API client uses this mock fetch
 * instead of hitting a real backend. This lets preview deploys render
 * realistic data without a running worker.
 */

// ── Mock datasets ──

const MOCK_USERS: Record<string, { name: string; avatar: string | null }> = {
  U001: { name: "Alice Chen", avatar: "https://i.pravatar.cc/72?u=alice" },
  U002: { name: "Bob Martinez", avatar: "https://i.pravatar.cc/72?u=bob" },
  U003: { name: "Charlie Kim", avatar: "https://i.pravatar.cc/72?u=charlie" },
  U004: { name: "Dana Okafor", avatar: "https://i.pravatar.cc/72?u=dana" },
  U005: { name: "Eli Tanaka", avatar: "https://i.pravatar.cc/72?u=eli" },
  U006: { name: "Faye Johnson", avatar: "https://i.pravatar.cc/72?u=faye" },
  U007: { name: "Gus Petrov", avatar: "https://i.pravatar.cc/72?u=gus" },
  U008: { name: "Hana Müller", avatar: "https://i.pravatar.cc/72?u=hana" },
};

const MOCK_EMOJI_IMAGES: Record<string, string> = {
  shipit: "https://emoji.slack-edge.com/T0/shipit/abc.png",
  lgtm: "https://emoji.slack-edge.com/T0/lgtm/def.png",
  partyblob: "https://emoji.slack-edge.com/T0/partyblob/ghi.png",
  catjam: "https://emoji.slack-edge.com/T0/catjam/jkl.png",
};

const MOCK_RANKINGS_EMOJIS = [
  { emoji: "thumbsup", count: 342, imageUrl: null },
  { emoji: "heart", count: 281, imageUrl: null },
  { emoji: "fire", count: 195, imageUrl: null },
  { emoji: "rocket", count: 167, imageUrl: null },
  { emoji: "eyes", count: 134, imageUrl: null },
  { emoji: "tada", count: 112, imageUrl: null },
  { emoji: "shipit", count: 98, imageUrl: MOCK_EMOJI_IMAGES.shipit },
  { emoji: "100", count: 87, imageUrl: null },
  { emoji: "lgtm", count: 76, imageUrl: MOCK_EMOJI_IMAGES.lgtm },
  { emoji: "thinking_face", count: 65, imageUrl: null },
  { emoji: "raised_hands", count: 54, imageUrl: null },
  { emoji: "partyblob", count: 43, imageUrl: MOCK_EMOJI_IMAGES.partyblob },
  { emoji: "muscle", count: 38, imageUrl: null },
  { emoji: "sparkles", count: 31, imageUrl: null },
  { emoji: "catjam", count: 24, imageUrl: MOCK_EMOJI_IMAGES.catjam },
];

const MOCK_RANKINGS_USERS = [
  {
    userId: "U001",
    totalCount: 287,
    displayName: "Alice Chen",
    avatarUrl: "https://i.pravatar.cc/72?u=alice",
  },
  {
    userId: "U002",
    totalCount: 245,
    displayName: "Bob Martinez",
    avatarUrl: "https://i.pravatar.cc/72?u=bob",
  },
  {
    userId: "U003",
    totalCount: 198,
    displayName: "Charlie Kim",
    avatarUrl: "https://i.pravatar.cc/72?u=charlie",
  },
  {
    userId: "U004",
    totalCount: 176,
    displayName: "Dana Okafor",
    avatarUrl: "https://i.pravatar.cc/72?u=dana",
  },
  {
    userId: "U005",
    totalCount: 154,
    displayName: "Eli Tanaka",
    avatarUrl: "https://i.pravatar.cc/72?u=eli",
  },
  {
    userId: "U006",
    totalCount: 132,
    displayName: "Faye Johnson",
    avatarUrl: "https://i.pravatar.cc/72?u=faye",
  },
  {
    userId: "U007",
    totalCount: 110,
    displayName: "Gus Petrov",
    avatarUrl: "https://i.pravatar.cc/72?u=gus",
  },
  {
    userId: "U008",
    totalCount: 88,
    displayName: "Hana Müller",
    avatarUrl: "https://i.pravatar.cc/72?u=hana",
  },
];

function generateWeeklyBuckets(weeks: number): string[] {
  const buckets: string[] = [];
  const now = new Date();
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 7 * 86400000);
    const year = d.getFullYear();
    const weekNum = Math.ceil(
      (d.getTime() - new Date(year, 0, 1).getTime()) / (7 * 86400000),
    );
    buckets.push(`${year}-${String(weekNum).padStart(2, "0")}`);
  }
  return buckets;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function buildEmojiTrends() {
  const emojis = [
    "thumbsup",
    "heart",
    "fire",
    "rocket",
    "eyes",
    "tada",
    "shipit",
    "100",
  ];
  const buckets = generateWeeklyBuckets(12);
  const rand = seededRandom(42);

  const series = buckets.map((period) => {
    const point: Record<string, unknown> = { period, total: 0 };
    let total = 0;
    for (const emoji of emojis) {
      const count = Math.floor(rand() * 30) + 5;
      point[emoji] = count;
      total += count;
    }
    point.total = total;
    return point;
  });

  return { emojis, series };
}

function buildUserTrends() {
  const userIds = [
    "U001",
    "U002",
    "U003",
    "U004",
    "U005",
    "U006",
    "U007",
    "U008",
  ];
  const buckets = generateWeeklyBuckets(12);
  const rand = seededRandom(99);

  const series = buckets.map((period) => {
    const point: Record<string, unknown> = { period };
    for (const uid of userIds) {
      point[uid] = Math.floor(rand() * 20) + 3;
    }
    return point;
  });

  return { users: MOCK_USERS, series };
}

function buildUserEmojis(userId: string) {
  const user = MOCK_RANKINGS_USERS.find((u) => u.userId === userId);
  const emojis = [
    { emoji: "thumbsup", count: 42, imageUrl: null },
    { emoji: "heart", count: 31, imageUrl: null },
    { emoji: "fire", count: 28, imageUrl: null },
    { emoji: "rocket", count: 19, imageUrl: null },
    { emoji: "shipit", count: 15, imageUrl: MOCK_EMOJI_IMAGES.shipit },
    { emoji: "eyes", count: 12, imageUrl: null },
  ];
  return {
    user: user
      ? {
          userId: user.userId,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        }
      : null,
    emojis,
  };
}

function buildEmojiUsers(_emoji: string) {
  return MOCK_RANKINGS_USERS.slice(0, 5).map((u, i) => ({
    userId: u.userId,
    count: 30 - i * 5,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
  }));
}

// ── Route matching ──

type MockRoute = {
  pattern: RegExp;
  handler: (match: RegExpMatchArray, url: URL) => unknown;
};

const routes: MockRoute[] = [
  {
    pattern: /\/api\/health$/,
    handler: () => ({ ok: true }),
  },
  {
    pattern: /\/api\/auth\/verify$/,
    handler: () => ({ ok: true, token: "mock-preview-token" }),
  },
  {
    pattern: /\/api\/rankings\/emojis$/,
    handler: (_match, url) => {
      const limit = Number(url.searchParams.get("limit")) || 50;
      return MOCK_RANKINGS_EMOJIS.slice(0, limit);
    },
  },
  {
    pattern: /\/api\/rankings\/users$/,
    handler: (_match, url) => {
      const limit = Number(url.searchParams.get("limit")) || 50;
      return MOCK_RANKINGS_USERS.slice(0, limit);
    },
  },
  {
    pattern: /\/api\/emojis\/([^/]+)\/users$/,
    handler: (match) => buildEmojiUsers(match[1] ?? ""),
  },
  {
    pattern: /\/api\/emojis$/,
    handler: () => MOCK_EMOJI_IMAGES,
  },
  {
    pattern: /\/api\/users\/([^/]+)\/emojis$/,
    handler: (match) => buildUserEmojis(match[1] ?? ""),
  },
  {
    pattern: /\/api\/analytics\/emoji-trends$/,
    handler: () => buildEmojiTrends(),
  },
  {
    pattern: /\/api\/analytics\/user-trends$/,
    handler: () => buildUserTrends(),
  },
];

// ── Mock fetch ──

export function createMockFetch(): typeof fetch {
  return async (input: RequestInfo | URL, _init?: RequestInit) => {
    const raw =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const url = new URL(raw, "http://localhost");

    for (const route of routes) {
      const match = url.pathname.match(route.pattern);
      if (match) {
        const body = route.handler(match, url);
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  };
}
