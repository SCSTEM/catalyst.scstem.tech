import { zValidator } from "@hono/zod-validator";
import { and, count, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import {
  emojiImages,
  reactions,
  reactionTotals,
  userEmojiCounts,
  users,
} from "../db/schema";
import { seasonCondition } from "../util";
import { idsLimitSeasonQuery, idsQuery } from "./validation";

type EmojiProfile = {
  totalCount: number;
  firstUsedAt: string | null;
  firstUser: { userId: string; displayName: string; avatarUrl: string } | null;
  topUser: {
    userId: string;
    displayName: string;
    avatarUrl: string;
    count: number;
  } | null;
};

type EmojiReactor = {
  userId: string;
  count: number;
  displayName: string;
  avatarUrl: string;
};

export const emojisRoute = new Hono<{ Bindings: Env }>()
  // /emojis - map of emoji name to image URL, for all emojis.
  .get("/", async (c) => {
    const db = drizzle(c.env.DB);

    const rows = await db
      .select({
        name: emojiImages.name,
        imageUrl: emojiImages.imageUrl,
      })
      .from(emojiImages);

    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.name] = row.imageUrl;
    }

    c.header("Cache-Control", "public, max-age=3600");
    return c.json(map);
  })

  // /emojis/parrots - list of parrots and their total reaction counts, ordered by count desc then name asc.
  .get("/parrots", async (c) => {
    const db = drizzle(c.env.DB);

    const rows = await db
      .select({
        name: emojiImages.name,
        imageUrl: emojiImages.imageUrl,
        count: sql<number>`coalesce(${reactionTotals.count}, 0)`,
      })
      .from(emojiImages)
      .leftJoin(reactionTotals, eq(reactionTotals.emoji, emojiImages.name))
      .where(eq(emojiImages.isParrot, true))
      .orderBy(desc(reactionTotals.count), emojiImages.name);

    return c.json(rows);
  })

  // /emojis/profiles?ids=emoji1,emoji2,... - profile for each emoji, keyed by emoji name. Profile includes total count, first reactor, and top reactor.
  .get("/profiles", zValidator("query", idsQuery), async (c) => {
    const db = drizzle(c.env.DB);
    const { ids } = c.req.valid("query");

    // First reactor per emoji: earliest reaction within each emoji.
    const firstRanked = db.$with("first_ranked").as(
      db
        .select({
          emoji: reactions.emoji,
          userId: reactions.userId,
          createdAt: reactions.createdAt,
          rn: sql<number>`row_number() over (partition by ${reactions.emoji} order by ${reactions.createdAt} asc)`.as(
            "rn",
          ),
        })
        .from(reactions)
        .where(inArray(reactions.emoji, ids)),
    );

    // Top reactor per emoji, ranked from the pre-aggregated per-user counts.
    const topRanked = db.$with("top_ranked").as(
      db
        .select({
          emoji: userEmojiCounts.emoji,
          userId: userEmojiCounts.userId,
          count: userEmojiCounts.count,
          rn: sql<number>`row_number() over (partition by ${userEmojiCounts.emoji} order by ${userEmojiCounts.count} desc)`.as(
            "rn",
          ),
        })
        .from(userEmojiCounts)
        .where(inArray(userEmojiCounts.emoji, ids)),
    );

    const [totals, firstUsers, topUsers] = await Promise.all([
      db
        .select({ emoji: reactionTotals.emoji, count: reactionTotals.count })
        .from(reactionTotals)
        .where(inArray(reactionTotals.emoji, ids)),
      db
        .with(firstRanked)
        .select({
          emoji: firstRanked.emoji,
          userId: firstRanked.userId,
          createdAt: firstRanked.createdAt,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(firstRanked)
        .leftJoin(users, eq(firstRanked.userId, users.userId))
        .where(eq(firstRanked.rn, 1)),
      db
        .with(topRanked)
        .select({
          emoji: topRanked.emoji,
          userId: topRanked.userId,
          count: topRanked.count,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(topRanked)
        .leftJoin(users, eq(topRanked.userId, users.userId))
        .where(eq(topRanked.rn, 1)),
    ]);

    const totalByEmoji = new Map(
      totals.map((row) => [row.emoji, row.count] as const),
    );
    const firstByEmoji = new Map(
      firstUsers.map((row) => [row.emoji, row] as const),
    );
    const topByEmoji = new Map(
      topUsers.map((row) => [row.emoji, row] as const),
    );

    const profiles: Record<string, EmojiProfile> = {};
    for (const id of ids) {
      const first = firstByEmoji.get(id);
      const top = topByEmoji.get(id);
      profiles[id] = {
        totalCount: totalByEmoji.get(id) ?? 0,
        firstUsedAt: first?.createdAt ?? null,
        firstUser: first
          ? {
              userId: first.userId,
              displayName: first.displayName ?? "",
              avatarUrl: first.avatarUrl ?? "",
            }
          : null,
        topUser: top
          ? {
              userId: top.userId,
              displayName: top.displayName ?? "",
              avatarUrl: top.avatarUrl ?? "",
              count: top.count,
            }
          : null,
      };
    }

    return c.json(profiles);
  })

  // /emojis/users?ids=emoji1,emoji2,...&limit=N&season=S - top N reactors for each emoji, season-scoped. Reactor includes userId, displayName, avatarUrl, and reaction count for that emoji and season.
  .get("/users", zValidator("query", idsLimitSeasonQuery), async (c) => {
    const db = drizzle(c.env.DB);
    const { ids, limit, season } = c.req.valid("query");

    // Top `limit` reactors per emoji, season-scoped.
    const ranked = db.$with("ranked").as(
      db
        .select({
          emoji: reactions.emoji,
          userId: reactions.userId,
          count: count().as("count"),
          rn: sql<number>`row_number() over (partition by ${reactions.emoji} order by count(*) desc)`.as(
            "rn",
          ),
        })
        .from(reactions)
        .where(and(inArray(reactions.emoji, ids), seasonCondition(season)))
        .groupBy(reactions.emoji, reactions.userId),
    );

    const rows = await db
      .with(ranked)
      .select({
        emoji: ranked.emoji,
        userId: ranked.userId,
        count: ranked.count,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(ranked)
      .leftJoin(users, eq(ranked.userId, users.userId))
      .where(lte(ranked.rn, limit))
      .orderBy(ranked.emoji, desc(ranked.count));

    const byEmoji: Record<string, EmojiReactor[]> = {};
    for (const id of ids) {
      byEmoji[id] = [];
    }
    for (const row of rows) {
      byEmoji[row.emoji]?.push({
        userId: row.userId,
        count: row.count,
        displayName: row.displayName ?? "",
        avatarUrl: row.avatarUrl ?? "",
      });
    }

    return c.json(byEmoji);
  });
