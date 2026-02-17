import { zValidator } from "@hono/zod-validator";
import { desc, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { cache } from "hono/cache";
import { z } from "zod";
import {
  reactions,
  reactionTotals,
  userEmojiCounts,
  users,
} from "../db/schema";

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

const trendsQuery = z
  .object({
    period: z.string().optional(),
    days: z.string().optional(),
    limit: z.string().optional(),
  })
  .optional()
  .default({});

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
      days: rawDays,
      limit: rawLimit,
    } = c.req.valid("query");
    const period = parsePeriod(rawPeriod);
    const days = Math.min(Math.max(Number(rawDays) || 90, 1), 365);
    const limit = Math.min(Math.max(Number(rawLimit) || 8, 1), 20);

    const cutoff = sql`datetime('now', '-' || ${String(days)} || ' days')`;
    const bucket = bucketExpr[period];

    // Find top N emojis overall
    const topEmojis = await db
      .select({ emoji: reactionTotals.emoji })
      .from(reactionTotals)
      .orderBy(desc(reactionTotals.count))
      .limit(limit);

    const emojiNames = topEmojis.map((r) => r.emoji);
    if (!emojiNames.length) {
      return c.json({ emojis: [], series: [] });
    }

    // Get per-bucket counts for top emojis
    const rows = await db
      .select({
        period: bucket,
        emoji: reactions.emoji,
        count: sql<number>`COUNT(*)`,
      })
      .from(reactions)
      .where(
        sql`${reactions.createdAt} >= ${cutoff} AND ${reactions.emoji} IN (${sql.join(
          emojiNames.map((e) => sql`${e}`),
          sql`,`,
        )})`,
      )
      .groupBy(bucket, reactions.emoji)
      .orderBy(bucket);

    // Get total per bucket (all emojis, not just top N)
    const totalRows = await db
      .select({
        period: bucket,
        count: sql<number>`COUNT(*)`,
      })
      .from(reactions)
      .where(sql`${reactions.createdAt} >= ${cutoff}`)
      .groupBy(bucket)
      .orderBy(bucket);

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
      days: rawDays,
      limit: rawLimit,
    } = c.req.valid("query");
    const period = parsePeriod(rawPeriod);
    const days = Math.min(Math.max(Number(rawDays) || 90, 1), 365);
    const limit = Math.min(Math.max(Number(rawLimit) || 8, 1), 20);

    const cutoff = sql`datetime('now', '-' || ${String(days)} || ' days')`;
    const bucket = bucketExpr[period];

    // Find top N users by total reaction count
    const topUsers = await db
      .select({
        userId: userEmojiCounts.userId,
        total: sql<number>`SUM(${userEmojiCounts.count})`,
      })
      .from(userEmojiCounts)
      .groupBy(userEmojiCounts.userId)
      .orderBy(desc(sql`SUM(${userEmojiCounts.count})`))
      .limit(limit);

    const userIds = topUsers.map((r) => r.userId);
    if (!userIds.length) {
      return c.json({
        users: {} as Record<string, { name: string; avatar: string | null }>,
        series: [],
      });
    }

    // Get display names + avatars
    const userRows = await db
      .select({
        userId: users.userId,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(inArray(users.userId, userIds));

    const userMap: Record<string, { name: string; avatar: string | null }> = {};
    for (const u of userRows) {
      userMap[u.userId] = {
        name: u.displayName || u.userId,
        avatar: u.avatarUrl,
      };
    }

    // Get per-bucket counts
    const rows = await db
      .select({
        period: bucket,
        userId: reactions.userId,
        count: sql<number>`COUNT(*)`,
      })
      .from(reactions)
      .where(
        sql`${reactions.createdAt} >= ${cutoff} AND ${reactions.userId} IN (${sql.join(
          userIds.map((id) => sql`${id}`),
          sql`,`,
        )})`,
      )
      .groupBy(bucket, reactions.userId)
      .orderBy(bucket);

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
