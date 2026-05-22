import { and, count, desc, inArray, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { reactions } from "../db/schema";
import { seasonCondition } from "../util";

/** A `reactions` column the stats helpers can group by. */
type GroupColumn = typeof reactions.emoji | typeof reactions.userId;

const bucketExpr = {
  day: sql<string>`strftime('%Y-%m-%d', created_at)`,
  week: sql<string>`strftime('%Y-%W', created_at)`,
  month: sql<string>`strftime('%Y-%m', created_at)`,
} as const;

export type Period = keyof typeof bucketExpr;

/** Top `limit` values of `groupCol` by reaction count within a season. */
export function getTopReactionCounts(
  db: DrizzleD1Database,
  groupCol: GroupColumn,
  season: number,
  limit: number,
) {
  return db
    .select({ key: groupCol, count: count() })
    .from(reactions)
    .where(seasonCondition(season))
    .groupBy(groupCol)
    .orderBy(desc(count()))
    .limit(limit);
}

/**
 * Per-period reaction counts for the top `limit` values of `groupCol`,
 * season-scoped. Every bucket in the season is present for every key
 * (zero-filled) so stacked chart areas have a continuous baseline.
 */
export async function getReactionTrendSeries(
  db: DrizzleD1Database,
  groupCol: GroupColumn,
  opts: { season: number; period: Period; limit: number },
) {
  const { season, period, limit } = opts;
  const seasonWhere = seasonCondition(season);
  const bucket = bucketExpr[period];

  const ranked = await getTopReactionCounts(db, groupCol, season, limit);
  const keys = ranked.map((row) => row.key);

  const periodMap = new Map<string, Record<string, number>>();

  if (keys.length) {
    const [periodKeyCounts, seasonPeriods] = await db.batch([
      db
        .select({ period: bucket, key: groupCol, count: count() })
        .from(reactions)
        .where(and(seasonWhere, inArray(groupCol, keys)))
        .groupBy(bucket, groupCol)
        .orderBy(bucket),
      db
        .select({ period: bucket })
        .from(reactions)
        .where(seasonWhere)
        .groupBy(bucket)
        .orderBy(bucket),
    ]);

    for (const { period: p } of seasonPeriods) {
      const entry: Record<string, number> = {};
      for (const key of keys) {
        entry[key] = 0;
      }
      periodMap.set(p, entry);
    }
    for (const row of periodKeyCounts) {
      const entry = periodMap.get(row.period);
      if (entry) {
        entry[row.key] = row.count;
      }
    }
  }

  const series = [...periodMap.entries()].map(([p, data]) => ({
    period: p,
    ...data,
  }));

  return { keys, series };
}
