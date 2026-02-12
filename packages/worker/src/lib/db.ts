import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { emojiTotals, reactions, userEmojiCounts } from "../db/schema";

export async function recordReaction(
  d1: D1Database,
  event: {
    userId: string;
    emoji: string;
    channelId: string;
    messageTs: string;
    eventTs: string;
    isRemoval: boolean;
  },
) {
  const db = drizzle(d1);
  const delta = event.isRemoval ? -1 : 1;

  await db.batch([
    db.insert(reactions).values({
      userId: event.userId,
      emoji: event.emoji,
      channelId: event.channelId,
      messageTs: event.messageTs,
      eventTs: event.eventTs,
      isRemoval: event.isRemoval ? 1 : 0,
    }),
    db
      .insert(emojiTotals)
      .values({ emoji: event.emoji, count: Math.max(0, delta) })
      .onConflictDoUpdate({
        target: emojiTotals.emoji,
        set: {
          count: sql`MAX(0, ${emojiTotals.count} + ${delta})`,
        },
      }),
    db
      .insert(userEmojiCounts)
      .values({
        userId: event.userId,
        emoji: event.emoji,
        count: Math.max(0, delta),
      })
      .onConflictDoUpdate({
        target: [userEmojiCounts.userId, userEmojiCounts.emoji],
        set: {
          count: sql`MAX(0, ${userEmojiCounts.count} + ${delta})`,
        },
      }),
  ]);
}
