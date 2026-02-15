import { SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { createSessionToken } from "../src/lib/auth";
import { seedTestDb } from "./seed";

let authHeaders: Record<string, string>;

beforeAll(async () => {
  await seedTestDb();
  const token = await createSessionToken("000000");
  authHeaders = { Authorization: `Bearer ${token}` };
});

function authedFetch(url: string) {
  return SELF.fetch(url, { headers: authHeaders });
}

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const res = await SELF.fetch("http://localhost/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe("auth middleware", () => {
  it("rejects requests without a token", async () => {
    const res = await SELF.fetch("http://localhost/api/rankings/emojis");
    expect(res.status).toBe(401);
  });

  it("rejects requests with an invalid token", async () => {
    const res = await SELF.fetch("http://localhost/api/rankings/emojis", {
      headers: { Authorization: "Bearer invalid-token" },
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/rankings/emojis", () => {
  it("returns emojis sorted by count descending", async () => {
    const res = await authedFetch("http://localhost/api/rankings/emojis");
    expect(res.status).toBe(200);
    const data = (await res.json()) as Array<{
      emoji: string;
      count: number;
      imageUrl: string | null;
    }>;
    expect(data.length).toBeGreaterThan(0);
    // Should be sorted descending
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1]?.count ?? 0;
      const curr = data[i]?.count ?? 0;
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
    // thumbsup has count=4, should be first
    expect(data[0]?.emoji).toBe("thumbsup");
    expect(data[0]?.count).toBe(4);
  });

  it("respects limit parameter", async () => {
    const res = await authedFetch(
      "http://localhost/api/rankings/emojis?limit=2",
    );
    const data = (await res.json()) as unknown[];
    expect(data.length).toBe(2);
  });

  it("includes imageUrl for custom emojis", async () => {
    const res = await authedFetch("http://localhost/api/rankings/emojis");
    const data = (await res.json()) as Array<{
      emoji: string;
      imageUrl: string | null;
    }>;
    const shipit = data.find((e) => e.emoji === "shipit");
    expect(shipit?.imageUrl).toBe("https://example.com/shipit.png");
    // Standard emojis have no image
    const thumbsup = data.find((e) => e.emoji === "thumbsup");
    expect(thumbsup?.imageUrl).toBeNull();
  });
});

describe("GET /api/rankings/users", () => {
  it("returns users sorted by total reaction count", async () => {
    const res = await authedFetch("http://localhost/api/rankings/users");
    expect(res.status).toBe(200);
    const data = (await res.json()) as Array<{
      userId: string;
      totalCount: number;
      displayName: string | null;
      avatarUrl: string | null;
    }>;
    expect(data.length).toBe(3);
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1]?.totalCount ?? 0;
      const curr = data[i]?.totalCount ?? 0;
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it("includes user display names", async () => {
    const res = await authedFetch("http://localhost/api/rankings/users");
    const data = (await res.json()) as Array<{
      userId: string;
      displayName: string | null;
    }>;
    const alice = data.find((u) => u.userId === "U001");
    expect(alice?.displayName).toBe("Alice");
  });
});

describe("GET /api/emojis", () => {
  it("returns emoji name to image URL map", async () => {
    const res = await authedFetch("http://localhost/api/emojis");
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, string>;
    expect(data.shipit).toBe("https://example.com/shipit.png");
    expect(data.lgtm).toBe("https://example.com/lgtm.png");
  });
});

describe("GET /api/emojis/:emoji/users", () => {
  it("returns users who used a specific emoji", async () => {
    const res = await authedFetch("http://localhost/api/emojis/thumbsup/users");
    expect(res.status).toBe(200);
    const data = (await res.json()) as Array<{
      userId: string;
      count: number;
    }>;
    expect(data.length).toBe(3);
    // U001 has count=2 for thumbsup, should be first
    expect(data[0]?.userId).toBe("U001");
    expect(data[0]?.count).toBe(2);
  });

  it("returns empty array for unknown emoji", async () => {
    const res = await authedFetch(
      "http://localhost/api/emojis/nonexistent/users",
    );
    const data = (await res.json()) as unknown[];
    expect(data).toEqual([]);
  });
});

describe("GET /api/users/:userId/emojis", () => {
  it("returns emoji breakdown for a user", async () => {
    const res = await authedFetch("http://localhost/api/users/U002/emojis");
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      user: { userId: string; displayName: string } | null;
      emojis: Array<{ emoji: string; count: number }>;
    };
    expect(data.user?.userId).toBe("U002");
    expect(data.user?.displayName).toBe("Bob");
    expect(data.emojis.length).toBe(3);
  });

  it("returns null user for unknown userId", async () => {
    const res = await authedFetch("http://localhost/api/users/UNKNOWN/emojis");
    const data = (await res.json()) as { user: null; emojis: unknown[] };
    expect(data.user).toBeNull();
    expect(data.emojis).toEqual([]);
  });
});

describe("GET /api/analytics/emoji-trends", () => {
  it("returns emoji trend series", async () => {
    const res = await authedFetch(
      "http://localhost/api/analytics/emoji-trends?period=day&days=30",
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      emojis: string[];
      series: Array<Record<string, unknown>>;
    };
    expect(data.emojis.length).toBeGreaterThan(0);
    expect(data.series.length).toBeGreaterThan(0);
    // Each series entry should have a period key
    for (const point of data.series) {
      expect(point).toHaveProperty("period");
    }
  });
});

describe("GET /api/analytics/user-trends", () => {
  it("returns user trend series", async () => {
    const res = await authedFetch(
      "http://localhost/api/analytics/user-trends?period=day&days=30",
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      users: Record<string, { name: string; avatar: string | null }>;
      series: Array<Record<string, unknown>>;
    };
    expect(Object.keys(data.users).length).toBeGreaterThan(0);
    expect(data.series.length).toBeGreaterThan(0);
  });
});
