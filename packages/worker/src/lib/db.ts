import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { emojiImages, reactions } from "../db/schema";
import { isRateLimited } from "./buzzkill";

type ReactionEvent = {
  userId: string;
  emoji: string;
  channelId: string;
  messageTs: string;
};

export async function addReaction(d1: D1Database, event: ReactionEvent) {
  const db = drizzle(d1);

  if (await isRateLimited(db, event.userId, event.channelId)) {
    console.warn("reaction rate-limited", {
      userId: event.userId,
      channelId: event.channelId,
      emoji: event.emoji,
      messageTs: event.messageTs,
    });
    return;
  }

  // Aggregates (reaction_totals, user_emoji_counts) are maintained by
  // SQLite triggers on `reactions` — see migration 0003.
  await db.insert(reactions).values(event).onConflictDoNothing();
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
  // Aggregates cascade via the AFTER DELETE trigger on `reactions`.
  await db
    .delete(reactions)
    .where(
      and(
        eq(reactions.channelId, channelId),
        eq(reactions.messageTs, messageTs),
      ),
    );
}

export async function removeReaction(d1: D1Database, event: ReactionEvent) {
  const db = drizzle(d1);
  // Aggregates cascade via the AFTER DELETE trigger on `reactions`.
  await db
    .delete(reactions)
    .where(
      and(
        eq(reactions.userId, event.userId),
        eq(reactions.emoji, event.emoji),
        eq(reactions.channelId, event.channelId),
        eq(reactions.messageTs, event.messageTs),
      ),
    );
}
