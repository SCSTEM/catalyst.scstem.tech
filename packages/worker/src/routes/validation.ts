import { z } from "zod";
import { getCurrentSeason } from "../util";

function makeLimitField(min = 1, max = 200, fallback = 50) {
  return z
    .string()
    .transform((val) => Number(val))
    .refine((val) => val >= min && val <= max, {
      message: `Limit must be between ${min} and ${max}`,
    })
    .optional()
    .default(fallback);
}

const limitField = makeLimitField();

const seasonField = z
  .string()
  .transform((val) => Number(val))
  .refine((val) => Number.isInteger(val) && val >= 1970 && val <= 2100, {
    message: "Season must be a valid year",
  })
  .optional()
  .default(() => getCurrentSeason());

const periodField = z.enum(["day", "week", "month"]).optional().default("week");

export const MAX_BATCH_IDS = 100;

const idsField = z
  .string()
  .transform((val) => [
    ...new Set(
      val
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ])
  .refine((ids) => ids.length >= 1 && ids.length <= MAX_BATCH_IDS, {
    message: `Provide 1 to ${MAX_BATCH_IDS} ids`,
  });

export const limitQuery = z.object({ limit: limitField });

export const seasonQuery = z.object({ season: seasonField });

export const limitSeasonQuery = z.object({
  limit: limitField,
  season: seasonField,
});

export const idsQuery = z.object({ ids: idsField });

export const idsLimitSeasonQuery = z.object({
  ids: idsField,
  limit: limitField,
  season: seasonField,
});

export const trendsQuery = z.object({
  period: periodField,
  limit: makeLimitField(1, 20, 8),
  season: seasonField,
});
