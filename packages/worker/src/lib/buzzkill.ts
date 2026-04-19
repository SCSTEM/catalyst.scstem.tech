import { and, count, eq, gte, sql } from "drizzle-orm";
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
  // strftime normalizes both `created_at` formats on disk:
  //   live inserts → 'YYYY-MM-DD HH:MM:SS' (from `datetime('now')`)
  //   backfill     → ISO 8601 'YYYY-MM-DDTHH:MM:SS.sssZ'
  // Raw string comparison would break on the ' ' vs 'T' at char 10.
  const cutoffSeconds = Math.floor(Date.now() / 1000) - BUZZKILL_WINDOW_SECONDS;
  const [result] = await db
    .select({ count: count() })
    .from(reactions)
    .where(
      and(
        eq(reactions.userId, userId),
        gte(
          sql<number>`CAST(strftime('%s', ${reactions.createdAt}) AS INTEGER)`,
          cutoffSeconds,
        ),
      ),
    );
  return (result?.count ?? 0) >= BUZZKILL_THRESHOLD;
}
