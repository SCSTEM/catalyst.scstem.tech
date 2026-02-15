import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import {
  emojiImages,
  reactions,
  reactionTotals,
  userEmojiCounts,
  users,
} from "../src/db/schema";

/**
 * Applies migrations and seeds the test D1 database.
 * Import and call `seedTestDb()` in your test files' `beforeAll`.
 */
export async function seedTestDb() {
  // Apply migrations using prepare().run() (exec() has a bug in test D1)
  const statements = [
    `CREATE TABLE IF NOT EXISTS \`emoji_images\` (\`name\` text PRIMARY KEY NOT NULL, \`image_url\` text NOT NULL, \`updated_at\` text DEFAULT (datetime('now')) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS \`reaction_totals\` (\`emoji\` text PRIMARY KEY NOT NULL, \`count\` integer DEFAULT 0 NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS \`reactions\` (\`user_id\` text NOT NULL, \`emoji\` text NOT NULL, \`channel_id\` text NOT NULL, \`message_ts\` text NOT NULL, \`created_at\` text DEFAULT (datetime('now')) NOT NULL, PRIMARY KEY(\`user_id\`, \`emoji\`, \`channel_id\`, \`message_ts\`))`,
    `CREATE INDEX IF NOT EXISTS \`idx_reactions_emoji\` ON \`reactions\` (\`emoji\`)`,
    `CREATE INDEX IF NOT EXISTS \`idx_reactions_user\` ON \`reactions\` (\`user_id\`)`,
    `CREATE INDEX IF NOT EXISTS \`idx_reactions_created_at\` ON \`reactions\` (\`created_at\`)`,
    `CREATE TABLE IF NOT EXISTS \`user_emoji_counts\` (\`user_id\` text NOT NULL, \`emoji\` text NOT NULL, \`count\` integer DEFAULT 0 NOT NULL, PRIMARY KEY(\`user_id\`, \`emoji\`))`,
    `CREATE INDEX IF NOT EXISTS \`idx_uec_user\` ON \`user_emoji_counts\` (\`user_id\`)`,
    `CREATE TABLE IF NOT EXISTS \`users\` (\`user_id\` text PRIMARY KEY NOT NULL, \`display_name\` text DEFAULT '' NOT NULL, \`avatar_url\` text DEFAULT '' NOT NULL, \`updated_at\` text DEFAULT (datetime('now')) NOT NULL)`,
  ];
  for (const sql of statements) {
    await env.DB.prepare(sql).run();
  }

  // Seed data
  const db = drizzle(env.DB);

  await db.insert(users).values([
    {
      userId: "U001",
      displayName: "Alice",
      avatarUrl: "https://example.com/alice.png",
    },
    {
      userId: "U002",
      displayName: "Bob",
      avatarUrl: "https://example.com/bob.png",
    },
    { userId: "U003", displayName: "Charlie", avatarUrl: "" },
  ]);

  await db.insert(emojiImages).values([
    { name: "shipit", imageUrl: "https://example.com/shipit.png" },
    { name: "lgtm", imageUrl: "https://example.com/lgtm.png" },
  ]);

  // Insert reactions with explicit created_at for trend queries
  const now = new Date();
  const daysAgo = (n: number) =>
    new Date(now.getTime() - n * 86400000).toISOString();

  await db.insert(reactions).values([
    {
      userId: "U001",
      emoji: "thumbsup",
      channelId: "C01",
      messageTs: "1.0",
      createdAt: daysAgo(1),
    },
    {
      userId: "U001",
      emoji: "thumbsup",
      channelId: "C01",
      messageTs: "2.0",
      createdAt: daysAgo(2),
    },
    {
      userId: "U001",
      emoji: "heart",
      channelId: "C01",
      messageTs: "1.0",
      createdAt: daysAgo(3),
    },
    {
      userId: "U002",
      emoji: "thumbsup",
      channelId: "C01",
      messageTs: "1.0",
      createdAt: daysAgo(1),
    },
    {
      userId: "U002",
      emoji: "fire",
      channelId: "C01",
      messageTs: "3.0",
      createdAt: daysAgo(5),
    },
    {
      userId: "U002",
      emoji: "shipit",
      channelId: "C02",
      messageTs: "1.0",
      createdAt: daysAgo(10),
    },
    {
      userId: "U003",
      emoji: "thumbsup",
      channelId: "C01",
      messageTs: "4.0",
      createdAt: daysAgo(2),
    },
    {
      userId: "U003",
      emoji: "heart",
      channelId: "C01",
      messageTs: "2.0",
      createdAt: daysAgo(4),
    },
    {
      userId: "U003",
      emoji: "fire",
      channelId: "C01",
      messageTs: "3.0",
      createdAt: daysAgo(6),
    },
    {
      userId: "U003",
      emoji: "fire",
      channelId: "C02",
      messageTs: "1.0",
      createdAt: daysAgo(7),
    },
  ]);

  // Rebuild aggregates
  await db.insert(reactionTotals).values([
    { emoji: "thumbsup", count: 4 },
    { emoji: "heart", count: 2 },
    { emoji: "fire", count: 3 },
    { emoji: "shipit", count: 1 },
  ]);

  await db.insert(userEmojiCounts).values([
    { userId: "U001", emoji: "thumbsup", count: 2 },
    { userId: "U001", emoji: "heart", count: 1 },
    { userId: "U002", emoji: "thumbsup", count: 1 },
    { userId: "U002", emoji: "fire", count: 1 },
    { userId: "U002", emoji: "shipit", count: 1 },
    { userId: "U003", emoji: "thumbsup", count: 1 },
    { userId: "U003", emoji: "heart", count: 1 },
    { userId: "U003", emoji: "fire", count: 2 },
  ]);
}
