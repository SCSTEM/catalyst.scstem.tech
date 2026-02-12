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
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    emoji: text("emoji").notNull(),
    channelId: text("channel_id").notNull(),
    messageTs: text("message_ts").notNull(),
    eventTs: text("event_ts").notNull(),
    isRemoval: integer("is_removal").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_reactions_emoji").on(table.emoji),
    index("idx_reactions_user").on(table.userId),
  ],
);

export const emojiTotals = sqliteTable("emoji_totals", {
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
