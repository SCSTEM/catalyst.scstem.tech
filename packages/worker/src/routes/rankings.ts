import { zValidator } from "@hono/zod-validator";
import { count, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { reactions, users } from "../db/schema";
import { limitSeasonQuery, seasonCondition } from "./util";

export const rankingsRoute = new Hono<{ Bindings: Env }>()
  .get("/emojis", zValidator("query", limitSeasonQuery), async (c) => {
    const db = drizzle(c.env.DB);
    const { limit, season } = c.req.valid("query");

    const results = await db
      .select({
        emoji: reactions.emoji,
        count: count(),
      })
      .from(reactions)
      .where(seasonCondition(season))
      .groupBy(reactions.emoji)
      .orderBy(desc(count()))
      .limit(limit);

    return c.json(results);
  })
  .get("/users", zValidator("query", limitSeasonQuery), async (c) => {
    const db = drizzle(c.env.DB);
    const { limit, season } = c.req.valid("query");

    const results = await db
      .select({
        userId: reactions.userId,
        totalCount: count(),
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
