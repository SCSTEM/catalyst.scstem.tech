import { and, gte, lt, type SQL } from "drizzle-orm";
import { reactions } from "./db/schema";

/**
 * FRC seasons start in July. A date in July of year N belongs to season N+1.
 */
export function getCurrentSeason(): number {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  return month >= 7 ? year + 1 : year;
}

/**
 * Inclusive start / exclusive end of an FRC season as a date-only prefix.
 *
 * Safe for lexicographic compare against `reactions.created_at`, which can
 * appear in two formats: `YYYY-MM-DD HH:MM:SS` (live writes via
 * `datetime('now')`) or ISO 8601 `YYYY-MM-DDTHH:MM:SS.sssZ` (backfill).
 * Both share the same `YYYY-MM-DD` prefix, so prefix comparisons line up
 * correctly across formats and remain index-friendly.
 */
export function seasonRange(season: number): { start: string; end: string } {
  return {
    start: `${season - 1}-07-01`,
    end: `${season}-07-01`,
  };
}

export function seasonCondition(season: number): SQL<unknown> {
  const { start, end } = seasonRange(season);
  // biome-ignore lint/style/noNonNullAssertion: `and` only returns undefined when given zero clauses
  return and(gte(reactions.createdAt, start), lt(reactions.createdAt, end))!;
}
