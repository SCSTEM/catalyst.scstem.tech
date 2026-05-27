import { zValidator } from "@hono/zod-validator";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { cache } from "hono/cache";
import { reactions, users } from "../db/schema";
import { getReactionTrendSeries } from "../lib/stats";
import { trendsQuery } from "./validation";

export const analyticsRoute = new Hono<{ Bindings: Env }>()
  .use(
    "/*",
    cache({
      cacheName: "catalyst-analytics",
      cacheControl: "public, max-age=300",
    }),
  )
  // /analytics/emoji-trends?period=P&limit=N&season=S - per-period reaction
  // counts for the top N emojis in the season.
  .get("/emoji-trends", zValidator("query", trendsQuery), async (c) => {
    const db = drizzle(c.env.DB);
    const { period, limit, season } = c.req.valid("query");

    const { keys, series } = await getReactionTrendSeries(db, reactions.emoji, {
      season,
      period,
      limit,
    });

    return c.json({ emojis: keys, series });
  })
  // /analytics/user-trends?period=P&limit=N&season=S - per-period reaction
  // counts for the top N users in the season, with display metadata.
  .get("/user-trends", zValidator("query", trendsQuery), async (c) => {
    const db = drizzle(c.env.DB);
    const { period, limit, season } = c.req.valid("query");

    const { keys, series } = await getReactionTrendSeries(
      db,
      reactions.userId,
      {
        season,
        period,
        limit,
      },
    );

    const userMap: Record<string, { name: string; avatar: string | null }> = {};
    if (keys.length) {
      const userRows = await db
        .select({
          userId: users.userId,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(inArray(users.userId, keys));
      for (const u of userRows) {
        userMap[u.userId] = {
          name: u.displayName || u.userId,
          avatar: u.avatarUrl,
        };
      }
    }

    return c.json({ userIds: keys, users: userMap, series });
  });
