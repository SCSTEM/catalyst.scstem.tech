import { and, gte, lt, type SQL } from "drizzle-orm";
import z from "zod";
import { reactions } from "../db/schema";

const limitField = z
  .string()
  .transform((val) => Number(val))
  .refine((val) => val >= 1 && val <= 200, {
    message: "Limit must be between 1 and 200",
  })
  .optional()
  .default(50);

const seasonField = z
  .string()
  .transform((val) => Number(val))
  .refine((val) => Number.isInteger(val) && val >= 1970 && val <= 2100, {
    message: "Season must be a valid year",
  })
  .optional()
  .default(() => getCurrentSeason());

export const limitQuery = z.object({ limit: limitField });

export const seasonQuery = z.object({ season: seasonField });

export const limitSeasonQuery = z.object({
  limit: limitField,
  season: seasonField,
});

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
