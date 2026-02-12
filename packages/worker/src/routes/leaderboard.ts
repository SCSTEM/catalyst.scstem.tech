import { and, desc, eq, gt, sql, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { emojiImages, emojiTotals, userEmojiCounts, users } from "../db/schema";

type Bindings = {
  DB: D1Database;
};

export const leaderboardRoute = new Hono<{ Bindings: Bindings }>()
  .get("/emojis", async (c) => {
    const db = drizzle(c.env.DB);
    const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);

    const results = await db
      .select({
        emoji: emojiTotals.emoji,
        count: emojiTotals.count,
        imageUrl: emojiImages.imageUrl,
      })
      .from(emojiTotals)
      .leftJoin(emojiImages, eq(emojiTotals.emoji, emojiImages.name))
      .where(gt(emojiTotals.count, 0))
      .orderBy(desc(emojiTotals.count))
      .limit(limit);

    return c.json(results);
  })
  .get("/users", async (c) => {
    const db = drizzle(c.env.DB);
    const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);

    const results = await db
      .select({
        userId: userEmojiCounts.userId,
        totalCount: sum(userEmojiCounts.count).mapWith(Number),
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(userEmojiCounts)
      .leftJoin(users, eq(userEmojiCounts.userId, users.userId))
      .where(gt(userEmojiCounts.count, 0))
      .groupBy(userEmojiCounts.userId)
      .orderBy(sql`total_count desc`)
      .limit(limit);

    return c.json(results);
  })
  .get("/emojis/:emoji", async (c) => {
    const db = drizzle(c.env.DB);
    const emoji = c.req.param("emoji");
    const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);

    const results = await db
      .select({
        userId: userEmojiCounts.userId,
        count: userEmojiCounts.count,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(userEmojiCounts)
      .leftJoin(users, eq(userEmojiCounts.userId, users.userId))
      .where(
        and(eq(userEmojiCounts.emoji, emoji), gt(userEmojiCounts.count, 0)),
      )
      .orderBy(desc(userEmojiCounts.count))
      .limit(limit);

    return c.json(results);
  })
  .get("/users/:userId", async (c) => {
    const db = drizzle(c.env.DB);
    const userId = c.req.param("userId");
    const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);

    const emojis = await db
      .select({
        emoji: userEmojiCounts.emoji,
        count: userEmojiCounts.count,
        imageUrl: emojiImages.imageUrl,
      })
      .from(userEmojiCounts)
      .leftJoin(emojiImages, eq(userEmojiCounts.emoji, emojiImages.name))
      .where(
        and(eq(userEmojiCounts.userId, userId), gt(userEmojiCounts.count, 0)),
      )
      .orderBy(desc(userEmojiCounts.count))
      .limit(limit);

    const user = await db
      .select({
        userId: users.userId,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.userId, userId))
      .get();

    return c.json({ user: user ?? null, emojis });
  });
