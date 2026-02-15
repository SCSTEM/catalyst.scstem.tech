/**
 * Seed script: populates local D1 with sample data for development and testing.
 *
 * Usage: bun run db:seed
 *
 * Prerequisites:
 *   1. Run `bun run db:migrate:local` to create the database schema.
 *   2. Start the worker at least once (`bun run dev:worker`) to initialize .wrangler state.
 *
 * This script is idempotent — running it multiple times replaces existing seed data.
 */

import { Database } from "bun:sqlite";
import {
  emojiImages,
  reactions,
  reactionTotals,
  userEmojiCounts,
  users,
} from "@catalyst/worker/db/schema";
import { Glob } from "bun";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";

// ── Sample data ──

const SAMPLE_USERS = [
  {
    userId: "U00SEED01",
    displayName: "Alice Chen",
    avatarUrl: "https://i.pravatar.cc/72?u=alice",
  },
  {
    userId: "U00SEED02",
    displayName: "Bob Martinez",
    avatarUrl: "https://i.pravatar.cc/72?u=bob",
  },
  {
    userId: "U00SEED03",
    displayName: "Charlie Kim",
    avatarUrl: "https://i.pravatar.cc/72?u=charlie",
  },
  {
    userId: "U00SEED04",
    displayName: "Dana Okafor",
    avatarUrl: "https://i.pravatar.cc/72?u=dana",
  },
  {
    userId: "U00SEED05",
    displayName: "Eli Tanaka",
    avatarUrl: "https://i.pravatar.cc/72?u=eli",
  },
  {
    userId: "U00SEED06",
    displayName: "Faye Johnson",
    avatarUrl: "https://i.pravatar.cc/72?u=faye",
  },
  {
    userId: "U00SEED07",
    displayName: "Gus Petrov",
    avatarUrl: "https://i.pravatar.cc/72?u=gus",
  },
  {
    userId: "U00SEED08",
    displayName: "Hana Müller",
    avatarUrl: "https://i.pravatar.cc/72?u=hana",
  },
  {
    userId: "U00SEED09",
    displayName: "Ivan Rossi",
    avatarUrl: "https://i.pravatar.cc/72?u=ivan",
  },
  {
    userId: "U00SEED10",
    displayName: "Jade Patel",
    avatarUrl: "https://i.pravatar.cc/72?u=jade",
  },
];

// Standard emojis + mock "custom" emojis
const STANDARD_EMOJIS = [
  "thumbsup",
  "heart",
  "fire",
  "rocket",
  "eyes",
  "tada",
  "100",
  "thinking_face",
  "raised_hands",
  "muscle",
  "sparkles",
  "wave",
  "pray",
  "laughing",
  "clap",
];

const CUSTOM_EMOJIS = [
  {
    name: "shipit",
    imageUrl: "https://emoji.slack-edge.com/T123/shipit/abc123.png",
  },
  {
    name: "lgtm",
    imageUrl: "https://emoji.slack-edge.com/T123/lgtm/def456.png",
  },
  {
    name: "partyblob",
    imageUrl: "https://emoji.slack-edge.com/T123/partyblob/ghi789.png",
  },
  {
    name: "this-is-fine",
    imageUrl: "https://emoji.slack-edge.com/T123/this-is-fine/jkl012.png",
  },
  {
    name: "catjam",
    imageUrl: "https://emoji.slack-edge.com/T123/catjam/mno345.png",
  },
];

const ALL_EMOJIS = [...STANDARD_EMOJIS, ...CUSTOM_EMOJIS.map((e) => e.name)];

const CHANNELS = [
  "C00GENERAL",
  "C00RANDOM",
  "C00DEV",
  "C00DESIGN",
  "C00WATERCOOLER",
];

// ── Connect to local D1 ──

const d1Dir = "packages/worker/.wrangler/state/v3/d1";
const sqliteFiles = [...new Glob("**/*.sqlite").scanSync(d1Dir)];
if (!sqliteFiles.length) {
  console.error("No local D1 database found. Run these commands first:");
  console.error("  bun run dev:worker   # initialize .wrangler state");
  console.error("  bun run db:migrate:local");
  process.exit(1);
}

const sqlite = new Database(`${d1Dir}/${sqliteFiles[0]}`);
const db = drizzle(sqlite);
console.log(`Connected to local D1: ${sqliteFiles[0]}`);

// ── Deterministic pseudo-random generator (seeded for reproducible data) ──

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

// ── Generate reactions ──

console.log("Generating sample reactions...");

const sampleReactions: {
  userId: string;
  emoji: string;
  channelId: string;
  messageTs: string;
  createdAt: string;
}[] = [];

const seen = new Set<string>();

// Generate ~50 message timestamps spread across 90 days
const now = Date.now();
const MESSAGE_COUNT = 50;
const messageTimestamps: string[] = [];
for (let i = 0; i < MESSAGE_COUNT; i++) {
  const daysAgo = Math.floor(rand() * 90);
  const ts = ((now - daysAgo * 86400000) / 1000).toFixed(6);
  messageTimestamps.push(ts);
}

// Generate ~400 reactions
const TARGET_REACTIONS = 400;
let attempts = 0;
while (
  sampleReactions.length < TARGET_REACTIONS &&
  attempts < TARGET_REACTIONS * 3
) {
  attempts++;
  const userId = pick(SAMPLE_USERS).userId;
  const emoji = pick(ALL_EMOJIS);
  const channelId = pick(CHANNELS);
  const messageTs = pick(messageTimestamps);

  // Ensure uniqueness (matches the composite primary key)
  const key = `${userId}:${emoji}:${channelId}:${messageTs}`;
  if (seen.has(key)) {
    continue;
  }
  seen.add(key);

  // Derive a created_at from the message timestamp
  const createdAt = new Date(Number.parseFloat(messageTs) * 1000).toISOString();

  sampleReactions.push({ userId, emoji, channelId, messageTs, createdAt });
}

console.log(`Generated ${sampleReactions.length} sample reactions`);

// ── Clear existing data and insert ──

console.log("Clearing existing data...");
db.run(sql`DELETE FROM ${reactions}`);
db.run(sql`DELETE FROM ${reactionTotals}`);
db.run(sql`DELETE FROM ${userEmojiCounts}`);
db.run(sql`DELETE FROM ${users}`);
db.run(sql`DELETE FROM ${emojiImages}`);

// Insert users
console.log("Inserting users...");
db.insert(users).values(SAMPLE_USERS).run();

// Insert custom emoji images
console.log("Inserting custom emoji images...");
db.insert(emojiImages).values(CUSTOM_EMOJIS).run();

// Insert reactions in batches
console.log("Inserting reactions...");
const BATCH_SIZE = 100;
for (let i = 0; i < sampleReactions.length; i += BATCH_SIZE) {
  const batch = sampleReactions.slice(i, i + BATCH_SIZE);
  db.insert(reactions).values(batch).run();
}

// Rebuild aggregates
console.log("Rebuilding aggregate tables...");
db.run(sql`
  INSERT INTO ${reactionTotals} (emoji, count)
  SELECT emoji, COUNT(*) FROM ${reactions} GROUP BY emoji
`);

db.run(sql`
  INSERT INTO ${userEmojiCounts} (user_id, emoji, count)
  SELECT user_id, emoji, COUNT(*) FROM ${reactions} GROUP BY user_id, emoji
`);

// Print summary
const [{ totalReactions }] = db
  .select({ totalReactions: sql<number>`COUNT(*)` })
  .from(reactions)
  .all();
const [{ totalUsers }] = db
  .select({ totalUsers: sql<number>`COUNT(*)` })
  .from(users)
  .all();
const [{ totalEmojis }] = db
  .select({ totalEmojis: sql<number>`COUNT(DISTINCT emoji)` })
  .from(reactionTotals)
  .all();

console.log(`\nSeed complete!`);
console.log(`  ${totalUsers} users`);
console.log(`  ${totalEmojis} unique emojis`);
console.log(`  ${totalReactions} reactions`);
console.log(`\nRun 'bun run dev' to see it in action.`);
