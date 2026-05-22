import { z } from "zod";
import { getCurrentSeason } from "../util";

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
