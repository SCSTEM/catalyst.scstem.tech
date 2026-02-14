import { desc, eq, gt, sql, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import {
  emojiImages,
  reactionTotals,
  userEmojiCounts,
  users,
} from "../db/schema";

type Bindings = {
  DB: D1Database;
};

export const rankingsRoute = new Hono<{ Bindings: Bindings }>()
  .get("/emojis", async (c) => {
    const db = drizzle(c.env.DB);
    const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);

    const results = await db
      .select({
        emoji: reactionTotals.emoji,
        count: reactionTotals.count,
        imageUrl: emojiImages.imageUrl,
      })
      .from(reactionTotals)
      .leftJoin(emojiImages, eq(reactionTotals.emoji, emojiImages.name))
      .where(gt(reactionTotals.count, 0))
      .orderBy(desc(reactionTotals.count))
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
  });
