import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const reactions = sqliteTable(
  "reactions",
  {
    userId: text("user_id").notNull(),
    emoji: text("emoji").notNull(),
    channelId: text("channel_id").notNull(),
    messageTs: text("message_ts").notNull(),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.emoji, table.channelId, table.messageTs],
    }),
    index("idx_reactions_emoji").on(table.emoji),
    index("idx_reactions_created_at").on(table.createdAt),
    index("idx_reactions_user_channel_created").on(
      table.userId,
      table.channelId,
      table.createdAt,
    ),
  ],
);

export const reactionTotals = sqliteTable("reaction_totals", {
  emoji: text("emoji").primaryKey(),
  count: integer("count").notNull().default(0),
});

export const userEmojiCounts = sqliteTable(
  "user_emoji_counts",
  {
    userId: text("user_id").notNull(),
    emoji: text("emoji").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.emoji] }),
    index("idx_uec_user").on(table.userId),
    index("idx_uec_emoji").on(table.emoji),
  ],
);

export const users = sqliteTable("users", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull().default(""),
  avatarUrl: text("avatar_url").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const emojiImages = sqliteTable("emoji_images", {
  name: text("name").primaryKey(),
  imageUrl: text("image_url").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});
