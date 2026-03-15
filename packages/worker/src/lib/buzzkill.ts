import { and, count, eq, gte } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { reactions } from "../db/schema";

/** Maximum reactions a user can add within the window before being rate-limited. */
export const BUZZKILL_THRESHOLD = 10;

/** Size of the sliding window in seconds. */
export const BUZZKILL_WINDOW_SECONDS = 60;

/**
 * Check if a user has exceeded the reaction rate limit.
 * Returns true if the user has added >= BUZZKILL_THRESHOLD reactions
 * within the last BUZZKILL_WINDOW_SECONDS seconds.
 */
export async function isRateLimited(
  db: DrizzleD1Database,
  userId: string,
): Promise<boolean> {
  const windowStart = new Date(
    Date.now() - BUZZKILL_WINDOW_SECONDS * 1000,
  ).toISOString();
  const [result] = await db
    .select({ count: count() })
    .from(reactions)
    .where(
      and(eq(reactions.userId, userId), gte(reactions.createdAt, windowStart)),
    );
  return (result?.count ?? 0) >= BUZZKILL_THRESHOLD;
}

/**
 * Returns SQL that deletes buzzkill reactions from the reactions table.
 * For each user, in each time bucket of BUZZKILL_WINDOW_SECONDS, if the
 * bucket contains more than BUZZKILL_THRESHOLD reactions, only the first
 * BUZZKILL_THRESHOLD are kept.
 *
 * @param channelId — if provided, scopes cleanup to a single channel
 */
export function buzzkillCleanupSQL(channelId?: string): string {
  const channelFilter = channelId
    ? `WHERE channel_id = '${channelId.replace(/'/g, "''")}'`
    : "";
  return `
DELETE FROM reactions WHERE rowid IN (
  SELECT rowid FROM (
    SELECT rowid,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, (CAST(strftime('%s', created_at) AS INTEGER) / ${BUZZKILL_WINDOW_SECONDS})
        ORDER BY created_at, message_ts
      ) AS rn,
      COUNT(*) OVER (
        PARTITION BY user_id, (CAST(strftime('%s', created_at) AS INTEGER) / ${BUZZKILL_WINDOW_SECONDS})
      ) AS bucket_count
    FROM reactions
    ${channelFilter}
  )
  WHERE bucket_count > ${BUZZKILL_THRESHOLD} AND rn > ${BUZZKILL_THRESHOLD}
);`;
}

/** Global cleanup SQL (all channels). */
export const BUZZKILL_CLEANUP_SQL = buzzkillCleanupSQL();
