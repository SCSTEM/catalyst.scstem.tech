import { zValidator } from "@hono/zod-validator";
import { and, desc, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { cache } from "hono/cache";
import { z } from "zod";
import { reactions, users } from "../db/schema";
import { getCurrentSeason, seasonCondition } from "./util";

const bucketExpr = {
  day: sql<string>`strftime('%Y-%m-%d', created_at)`,
  week: sql<string>`strftime('%Y-%W', created_at)`,
  month: sql<string>`strftime('%Y-%m', created_at)`,
} as const;

type Period = keyof typeof bucketExpr;

function parsePeriod(raw: string | undefined): Period {
  if (raw === "day" || raw === "week" || raw === "month") {
    return raw;
  }
  return "week";
}

const trendsQuery = z.object({
  period: z.string().optional(),
  limit: z.string().optional(),
  season: z.string().optional(),
});

function parseSeason(raw: string | undefined): number {
  const parsed = Number(raw);
  if (Number.isInteger(parsed) && parsed >= 1970 && parsed <= 2100) {
    return parsed;
  }
  return getCurrentSeason();
}

export const analyticsRoute = new Hono<{ Bindings: Env }>()
  .use(
    "/*",
    cache({
      cacheName: "catalyst-analytics",
      cacheControl: "public, max-age=300",
    }),
  )
  .get("/emoji-trends", zValidator("query", trendsQuery), async (c) => {
    const db = drizzle(c.env.DB);
    const {
      period: rawPeriod,
      limit: rawLimit,
      season: rawSeason,
    } = c.req.valid("query");
    const period = parsePeriod(rawPeriod);
    const limit = Math.min(Math.max(Number(rawLimit) || 8, 1), 20);
    const season = parseSeason(rawSeason);
    const seasonWhere = seasonCondition(season);
    const bucket = bucketExpr[period];

    // Find top N emojis within the requested season
    const topEmojis = await db
      .select({
        emoji: reactions.emoji,
        count: sql<number>`COUNT(*)`,
      })
      .from(reactions)
      .where(seasonWhere)
      .groupBy(reactions.emoji)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(limit);

    const emojiNames = topEmojis.map((r) => r.emoji);
    if (!emojiNames.length) {
      return c.json({ emojis: [], series: [] });
    }

    // Batch: per-bucket counts for top emojis + total per bucket (independent queries)
    const [rows, totalRows] = await db.batch([
      db
        .select({
          period: bucket,
          emoji: reactions.emoji,
          count: sql<number>`COUNT(*)`,
        })
        .from(reactions)
        .where(and(seasonWhere, inArray(reactions.emoji, emojiNames)))
        .groupBy(bucket, reactions.emoji)
        .orderBy(bucket),
      db
        .select({
          period: bucket,
          count: sql<number>`COUNT(*)`,
        })
        .from(reactions)
        .where(seasonWhere)
        .groupBy(bucket)
        .orderBy(bucket),
    ]);

    // Merge into series
    const periodMap = new Map<string, Record<string, number>>();
    for (const row of totalRows) {
      periodMap.set(row.period, { total: row.count });
    }
    for (const row of rows) {
      const entry = periodMap.get(row.period);
      if (entry) {
        entry[row.emoji] = row.count;
      }
    }

    const series = [...periodMap.entries()].map(([p, data]) => ({
      period: p,
      ...data,
    }));

    return c.json({ emojis: emojiNames, series });
  })
  .get("/user-trends", zValidator("query", trendsQuery), async (c) => {
    const db = drizzle(c.env.DB);
    const {
      period: rawPeriod,
      limit: rawLimit,
      season: rawSeason,
    } = c.req.valid("query");
    const period = parsePeriod(rawPeriod);
    const limit = Math.min(Math.max(Number(rawLimit) || 8, 1), 20);
    const season = parseSeason(rawSeason);
    const seasonWhere = seasonCondition(season);
    const bucket = bucketExpr[period];

    // Find top N users by reaction count within the season
    const topUsers = await db
      .select({
        userId: reactions.userId,
        total: sql<number>`COUNT(*)`,
      })
      .from(reactions)
      .where(seasonWhere)
      .groupBy(reactions.userId)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(limit);

    const userIds = topUsers.map((r) => r.userId);
    if (!userIds.length) {
      return c.json({
        users: {} as Record<string, { name: string; avatar: string | null }>,
        series: [],
      });
    }

    // Batch: user metadata + per-bucket counts (independent queries)
    const [userRows, rows] = await db.batch([
      db
        .select({
          userId: users.userId,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(inArray(users.userId, userIds)),
      db
        .select({
          period: bucket,
          userId: reactions.userId,
          count: sql<number>`COUNT(*)`,
        })
        .from(reactions)
        .where(and(seasonWhere, inArray(reactions.userId, userIds)))
        .groupBy(bucket, reactions.userId)
        .orderBy(bucket),
    ]);

    const userMap: Record<string, { name: string; avatar: string | null }> = {};
    for (const u of userRows) {
      userMap[u.userId] = {
        name: u.displayName || u.userId,
        avatar: u.avatarUrl,
      };
    }

    const periodMap = new Map<string, Record<string, number>>();
    for (const row of rows) {
      let entry = periodMap.get(row.period);
      if (!entry) {
        entry = {};
        periodMap.set(row.period, entry);
      }
      entry[row.userId] = row.count;
    }

    const series = [...periodMap.entries()].map(([p, data]) => ({
      period: p,
      ...data,
    }));

    return c.json({ users: userMap, series });
  });
