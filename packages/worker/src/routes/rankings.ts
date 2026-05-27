import { zValidator } from "@hono/zod-validator";
import { count, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { reactions, users } from "../db/schema";
import { getTopReactionCounts } from "../lib/stats";
import { seasonCondition } from "../util";
import { limitSeasonQuery } from "./validation";

export const rankingsRoute = new Hono<{ Bindings: Env }>()
  // /rankings/emojis?limit=N&season=S - top N emojis by reaction count.
  .get("/emojis", zValidator("query", limitSeasonQuery), async (c) => {
    const db = drizzle(c.env.DB);
    const { limit, season } = c.req.valid("query");

    const ranked = await getTopReactionCounts(
      db,
      reactions.emoji,
      season,
      limit,
    );

    return c.json(ranked.map((r) => ({ emoji: r.key, count: r.count })));
  })
  // /rankings/users?limit=N&season=S - top N users by reaction count.
  .get("/users", zValidator("query", limitSeasonQuery), async (c) => {
    const db = drizzle(c.env.DB);
    const { limit, season } = c.req.valid("query");

    const results = await db
      .select({
        userId: reactions.userId,
        count: count(),
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(reactions)
      .leftJoin(users, eq(reactions.userId, users.userId))
      .where(seasonCondition(season))
      .groupBy(reactions.userId)
      .orderBy(desc(count()))
      .limit(limit);

    return c.json(results);
  });
