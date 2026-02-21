import { zValidator } from "@hono/zod-validator";
import { desc, eq, gt, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { reactionTotals, userEmojiCounts, users } from "../db/schema";
import { limitQuery } from "./util";

export const rankingsRoute = new Hono<{ Bindings: Env }>()
  .get("/emojis", zValidator("query", limitQuery), async (c) => {
    const db = drizzle(c.env.DB);
    const { limit } = c.req.valid("query");

    const results = await db
      .select({
        emoji: reactionTotals.emoji,
        count: reactionTotals.count,
      })
      .from(reactionTotals)
      .where(gt(reactionTotals.count, 0))
      .orderBy(desc(reactionTotals.count))
      .limit(limit);

    return c.json(results);
  })
  .get("/users", zValidator("query", limitQuery), async (c) => {
    const db = drizzle(c.env.DB);
    const { limit } = c.req.valid("query");

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
      .orderBy(desc(sum(userEmojiCounts.count)))
      .limit(limit);

    return c.json(results);
  });
