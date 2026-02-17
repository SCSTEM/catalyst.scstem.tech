import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  emojiImages,
  reactions,
  reactionTotals,
  userEmojiCounts,
} from "../db/schema";

type ReactionEvent = {
  userId: string;
  emoji: string;
  channelId: string;
  messageTs: string;
};

export async function addReaction(d1: D1Database, event: ReactionEvent) {
  const db = drizzle(d1);

  await db.batch([
    db.insert(reactions).values(event).onConflictDoNothing(),
    db
      .insert(reactionTotals)
      .values({ emoji: event.emoji, count: 1 })
      .onConflictDoUpdate({
        target: reactionTotals.emoji,
        set: { count: sql`${reactionTotals.count} + 1` },
      }),
    db
      .insert(userEmojiCounts)
      .values({ userId: event.userId, emoji: event.emoji, count: 1 })
      .onConflictDoUpdate({
        target: [userEmojiCounts.userId, userEmojiCounts.emoji],
        set: { count: sql`${userEmojiCounts.count} + 1` },
      }),
  ]);
}

export async function addEmoji(d1: D1Database, name: string, imageUrl: string) {
  const db = drizzle(d1);
  await db
    .insert(emojiImages)
    .values({ name, imageUrl })
    .onConflictDoUpdate({
      target: emojiImages.name,
      set: { imageUrl, updatedAt: sql`(datetime('now'))` },
    });
}

export async function removeEmoji(d1: D1Database, name: string) {
  const db = drizzle(d1);
  await db.delete(emojiImages).where(eq(emojiImages.name, name));
}

export async function renameEmoji(
  d1: D1Database,
  oldName: string,
  newName: string,
) {
  const db = drizzle(d1);
  const [old] = await db
    .select({ imageUrl: emojiImages.imageUrl })
    .from(emojiImages)
    .where(eq(emojiImages.name, oldName));
  if (!old) {
    return;
  }
  await db.batch([
    db.delete(emojiImages).where(eq(emojiImages.name, oldName)),
    db.insert(emojiImages).values({ name: newName, imageUrl: old.imageUrl }),
  ]);
}

export async function removeReaction(d1: D1Database, event: ReactionEvent) {
  const db = drizzle(d1);

  await db.batch([
    db
      .delete(reactions)
      .where(
        and(
          eq(reactions.userId, event.userId),
          eq(reactions.emoji, event.emoji),
          eq(reactions.channelId, event.channelId),
          eq(reactions.messageTs, event.messageTs),
        ),
      ),
    db
      .update(reactionTotals)
      .set({ count: sql`MAX(0, ${reactionTotals.count} - 1)` })
      .where(eq(reactionTotals.emoji, event.emoji)),
    db
      .update(userEmojiCounts)
      .set({ count: sql`MAX(0, ${userEmojiCounts.count} - 1)` })
      .where(
        and(
          eq(userEmojiCounts.userId, event.userId),
          eq(userEmojiCounts.emoji, event.emoji),
        ),
      ),
  ]);
}
