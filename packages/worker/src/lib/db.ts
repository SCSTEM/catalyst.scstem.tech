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

  // Insert the reaction row first — if it already exists (duplicate event from
  // Slack), .returning() yields an empty array so we skip aggregate updates.
  const [inserted] = await db
    .insert(reactions)
    .values(event)
    .onConflictDoNothing()
    .returning({ emoji: reactions.emoji });

  if (!inserted) {
    return;
  }

  await db.batch([
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
  // Atomic delete-then-insert: the batch runs in a single implicit transaction.
  // Use onConflictDoUpdate on the insert in case newName already exists.
  const [deleted] = await db
    .delete(emojiImages)
    .where(eq(emojiImages.name, oldName))
    .returning({ imageUrl: emojiImages.imageUrl });
  if (!deleted) {
    return;
  }
  await db
    .insert(emojiImages)
    .values({ name: newName, imageUrl: deleted.imageUrl })
    .onConflictDoUpdate({
      target: emojiImages.name,
      set: {
        imageUrl: deleted.imageUrl,
        updatedAt: sql`(datetime('now'))`,
      },
    });
}

export async function removeMessageReactions(
  d1: D1Database,
  channelId: string,
  messageTs: string,
) {
  const db = drizzle(d1);

  // Fetch all reactions on the deleted message so we know which aggregates
  // to decrement.
  const rows = await db
    .select({ userId: reactions.userId, emoji: reactions.emoji })
    .from(reactions)
    .where(
      and(
        eq(reactions.channelId, channelId),
        eq(reactions.messageTs, messageTs),
      ),
    );

  if (rows.length === 0) {
    return;
  }

  // Count how many times each emoji was used (for reaction_totals).
  const emojiCounts = new Map<string, number>();
  for (const row of rows) {
    emojiCounts.set(row.emoji, (emojiCounts.get(row.emoji) ?? 0) + 1);
  }

  // Each row is a unique (userId, emoji) pair due to the PK constraint,
  // so user_emoji_counts decrements by 1 per row.

  await db.batch([
    // Delete all reactions for this message
    db
      .delete(reactions)
      .where(
        and(
          eq(reactions.channelId, channelId),
          eq(reactions.messageTs, messageTs),
        ),
      ),

    // Decrement reaction_totals for each emoji
    ...[...emojiCounts.entries()].map(([emoji, count]) =>
      db
        .update(reactionTotals)
        .set({
          count: sql`MAX(0, ${reactionTotals.count} - ${count})`,
        })
        .where(eq(reactionTotals.emoji, emoji)),
    ),

    // Decrement user_emoji_counts for each (userId, emoji) pair
    ...rows.map((row) =>
      db
        .update(userEmojiCounts)
        .set({
          count: sql`MAX(0, ${userEmojiCounts.count} - 1)`,
        })
        .where(
          and(
            eq(userEmojiCounts.userId, row.userId),
            eq(userEmojiCounts.emoji, row.emoji),
          ),
        ),
    ),

    // Clean up zero-count rows
    db.delete(reactionTotals).where(eq(reactionTotals.count, 0)),
    db.delete(userEmojiCounts).where(eq(userEmojiCounts.count, 0)),
  ]);
}

export async function removeReaction(d1: D1Database, event: ReactionEvent) {
  const db = drizzle(d1);

  // Delete the reaction row first — if it didn't exist (duplicate remove event
  // or reaction from before backfill), .returning() yields an empty array so
  // we skip aggregate updates.
  const [deleted] = await db
    .delete(reactions)
    .where(
      and(
        eq(reactions.userId, event.userId),
        eq(reactions.emoji, event.emoji),
        eq(reactions.channelId, event.channelId),
        eq(reactions.messageTs, event.messageTs),
      ),
    )
    .returning({ emoji: reactions.emoji });

  if (!deleted) {
    return;
  }

  await db.batch([
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
    db.delete(reactionTotals).where(eq(reactionTotals.count, 0)),
    db.delete(userEmojiCounts).where(eq(userEmojiCounts.count, 0)),
  ]);
}
