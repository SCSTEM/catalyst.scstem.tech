/**
 * Backfill script: fetches historical Slack reactions and generates a .sql file.
 *
 * The generated file can be applied to local or remote D1 via wrangler:
 *   bunx wrangler d1 execute DB --file=./backfill.sql --local
 *   bunx wrangler d1 execute DB --file=./backfill.sql --remote
 *
 * Usage: bun scripts/backfill.ts
 *
 * Env vars:
 *   SLACK_BOT_TOKEN    — required
 *   BACKFILL_SINCE     — ISO date cutoff (e.g. "2025-01-01"), optional
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";

const MAX_RETRIES = 5;
const SQL_BATCH_SIZE = 500;
const OUTPUT_FILE = "backfill.sql";
const CHECKPOINT_FILE = ".backfill-checkpoint";

// ── Config ──

const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN;
if (!SLACK_TOKEN) {
  console.error("SLACK_BOT_TOKEN is required");
  process.exit(1);
}

const BACKFILL_SINCE = process.env.BACKFILL_SINCE;
if (BACKFILL_SINCE && Number.isNaN(new Date(BACKFILL_SINCE).getTime())) {
  console.error(
    `Invalid BACKFILL_SINCE date: "${BACKFILL_SINCE}". Use ISO format, e.g. "2025-01-01".`,
  );
  process.exit(1);
}

// ── Checkpoint: incremental fetching ──
// On each run, we save the start-of-today (UTC) as the checkpoint.
// Next run picks up from there, re-fetching today since it's incomplete.
// INSERT OR IGNORE makes overlapping data safe.

let checkpoint: string | undefined;
if (existsSync(CHECKPOINT_FILE)) {
  checkpoint = readFileSync(CHECKPOINT_FILE, "utf-8").trim();
  if (Number.isNaN(new Date(checkpoint).getTime())) {
    console.warn(`Invalid checkpoint "${checkpoint}", ignoring`);
    checkpoint = undefined;
  }
}

// Effective oldest = most recent of (BACKFILL_SINCE, checkpoint)
let effectiveSince: Date | undefined;
const sinceDateFromEnv = BACKFILL_SINCE ? new Date(BACKFILL_SINCE) : undefined;
const sinceDateFromCheckpoint = checkpoint ? new Date(checkpoint) : undefined;

if (sinceDateFromEnv && sinceDateFromCheckpoint) {
  effectiveSince =
    sinceDateFromCheckpoint > sinceDateFromEnv
      ? sinceDateFromCheckpoint
      : sinceDateFromEnv;
  if (sinceDateFromCheckpoint > sinceDateFromEnv) {
    console.log(
      `Checkpoint ${checkpoint} is newer than BACKFILL_SINCE=${BACKFILL_SINCE}, using checkpoint`,
    );
  }
} else {
  effectiveSince = sinceDateFromEnv ?? sinceDateFromCheckpoint;
}

const oldest = effectiveSince
  ? String(Math.floor(effectiveSince.getTime() / 1000))
  : undefined;

if (effectiveSince) {
  console.log(`Fetching data since ${effectiveSince.toISOString()}`);
}

// ── SQL helpers ──

function esc(value: string): string {
  return value.replace(/'/g, "''");
}

function chunks<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// ── Slack API helpers ──

type SlackReaction = { name: string; users: string[]; count: number };
type SlackMessage = { ts: string; reactions?: SlackReaction[] };

async function slackApi<T>(
  method: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`https://slack.com/api/${method}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${SLACK_TOKEN}` },
    });

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("Retry-After") ?? "5");
      console.warn(
        `  Rate limited on ${method}, retrying in ${retryAfter}s (attempt ${attempt + 1}/${MAX_RETRIES})`,
      );
      await sleep(retryAfter * 1000);
      continue;
    }

    if (!res.ok) {
      throw new Error(`Slack API ${method} HTTP ${res.status}`);
    }
    const data = (await res.json()) as T & { ok: boolean; error?: string };
    if (!data.ok) {
      throw new Error(`Slack API ${method}: ${data.error}`);
    }
    return data;
  }

  throw new Error(
    `Slack API ${method}: rate limited after ${MAX_RETRIES} retries`,
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Step 1: Fetch channels ──

console.log("Fetching channels...");
type ChannelsResponse = {
  channels: { id: string; name: string }[];
  response_metadata?: { next_cursor?: string };
};
const channels: { id: string; name: string }[] = [];
let channelCursor = "";
do {
  const params: Record<string, string> = {
    types: "public_channel,private_channel",
    limit: "200",
  };
  if (channelCursor) {
    params.cursor = channelCursor;
  }
  const res = await slackApi<ChannelsResponse>("users.conversations", params);
  channels.push(...res.channels.map((c) => ({ id: c.id, name: c.name })));
  channelCursor = res.response_metadata?.next_cursor ?? "";
  await sleep(1200);
} while (channelCursor);
console.log(`Found ${channels.length} channels`);

// ── Step 2: Fetch messages + reactions ──

type HistoryResponse = {
  messages: SlackMessage[];
  has_more: boolean;
  response_metadata?: { next_cursor?: string };
};

type ReactionRow = {
  userId: string;
  emoji: string;
  channelId: string;
  messageTs: string;
  createdAt: string;
};

const allReactions: ReactionRow[] = [];
const uniqueUsers = new Set<string>();

for (const channel of channels) {
  console.log(`  #${channel.name} (${channel.id})...`);
  let cursor = "";
  let pageCount = 0;
  do {
    const params: Record<string, string> = {
      channel: channel.id,
      limit: "200",
    };
    if (oldest) {
      params.oldest = oldest;
    }
    if (cursor) {
      params.cursor = cursor;
    }

    let res: HistoryResponse;
    try {
      res = await slackApi<HistoryResponse>("conversations.history", params);
    } catch (e) {
      console.warn(`    Skipping (error): ${e}`);
      break;
    }

    for (const msg of res.messages) {
      if (!msg.reactions) {
        continue;
      }
      for (const reaction of msg.reactions) {
        for (const userId of reaction.users) {
          allReactions.push({
            userId,
            emoji: reaction.name,
            channelId: channel.id,
            messageTs: msg.ts,
            createdAt: new Date(Number.parseFloat(msg.ts) * 1000).toISOString(),
          });
          uniqueUsers.add(userId);
        }
      }
    }

    cursor = res.response_metadata?.next_cursor ?? "";
    pageCount++;
    if (pageCount % 10 === 0) {
      console.log(`    ${pageCount} pages...`);
    }
    await sleep(1200);
  } while (cursor);
}

console.log(
  `Collected ${allReactions.length} reactions from ${uniqueUsers.size} users`,
);

// ── Step 3: Fetch user profiles ──

console.log("Fetching user profiles...");

type UserProfile = {
  userId: string;
  displayName: string;
  avatarUrl: string;
};

const userProfiles: UserProfile[] = [];
for (const userId of uniqueUsers) {
  try {
    const res = await slackApi<{
      user: {
        id: string;
        profile: {
          display_name?: string;
          real_name?: string;
          image_72?: string;
        };
      };
    }>("users.info", { user: userId });
    const profile = res.user.profile;
    userProfiles.push({
      userId,
      displayName: profile.display_name || profile.real_name || "",
      avatarUrl: profile.image_72 || "",
    });
  } catch (e) {
    console.warn(`  Failed to fetch user ${userId}: ${e}`);
  }
  await sleep(1200);
}
console.log(`  Fetched ${userProfiles.length} user profiles`);

// ── Step 4: Fetch custom emoji ──

console.log("Fetching custom emoji list...");

type EmojiRow = { name: string; imageUrl: string };
const emojiRows: EmojiRow[] = [];

try {
  const res = await slackApi<{ emoji: Record<string, string> }>("emoji.list");
  for (const [name, url] of Object.entries(res.emoji)) {
    if (url.startsWith("alias:")) {
      continue;
    }
    emojiRows.push({ name, imageUrl: url });
  }
  console.log(`  Fetched ${emojiRows.length} custom emojis`);
} catch (e) {
  console.warn(`Failed to fetch emoji list: ${e}`);
}

// ── Step 5: Generate SQL file ──

console.log("Generating SQL file...");
const lines: string[] = [];

// Checkpoint = start of today UTC (today's data is incomplete, so re-fetch next run)
const now = new Date();
const todayMidnight = new Date(
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
);
const newCheckpoint = todayMidnight.toISOString();

lines.push(`-- Generated by backfill.ts on ${now.toISOString()}`);
if (effectiveSince) {
  lines.push(`-- Data fetched since: ${effectiveSince.toISOString()}`);
}
lines.push(`-- Checkpoint: ${newCheckpoint}`);
lines.push("");

// Reactions (batched INSERT OR IGNORE)
if (allReactions.length > 0) {
  lines.push("-- Reactions");
  for (const batch of chunks(allReactions, SQL_BATCH_SIZE)) {
    lines.push(
      "INSERT OR IGNORE INTO reactions (user_id, emoji, channel_id, message_ts, created_at) VALUES",
    );
    const values = batch.map(
      (r) =>
        `  ('${esc(r.userId)}', '${esc(r.emoji)}', '${esc(r.channelId)}', '${esc(r.messageTs)}', '${esc(r.createdAt)}')`,
    );
    lines.push(`${values.join(",\n")};`);
    lines.push("");
  }
}

// Anti-buzzkill cleanup: remove excess reactions in burst windows
// Constants must match packages/worker/src/lib/buzzkill.ts
const BUZZKILL_WINDOW_SECONDS = 60;
const BUZZKILL_THRESHOLD = 10;
lines.push("-- Anti-buzzkill cleanup");
lines.push("DELETE FROM reactions WHERE rowid IN (");
lines.push("  SELECT rowid FROM (");
lines.push("    SELECT rowid,");
lines.push("      ROW_NUMBER() OVER (");
lines.push(
  `        PARTITION BY user_id, (CAST(strftime('%s', created_at) AS INTEGER) / ${BUZZKILL_WINDOW_SECONDS})`,
);
lines.push("        ORDER BY created_at, message_ts");
lines.push("      ) AS rn,");
lines.push("      COUNT(*) OVER (");
lines.push(
  `        PARTITION BY user_id, (CAST(strftime('%s', created_at) AS INTEGER) / ${BUZZKILL_WINDOW_SECONDS})`,
);
lines.push("      ) AS bucket_count");
lines.push("    FROM reactions");
lines.push("  )");
lines.push(
  `  WHERE bucket_count > ${BUZZKILL_THRESHOLD} AND rn > ${BUZZKILL_THRESHOLD}`,
);
lines.push(");");
lines.push("");

// Rebuild aggregate: reaction_totals
lines.push("-- Rebuild reaction_totals");
lines.push("DELETE FROM reaction_totals;");
lines.push(
  "INSERT INTO reaction_totals (emoji, count) SELECT emoji, COUNT(*) FROM reactions GROUP BY emoji;",
);
lines.push("");

// Rebuild aggregate: user_emoji_counts
lines.push("-- Rebuild user_emoji_counts");
lines.push("DELETE FROM user_emoji_counts;");
lines.push(
  "INSERT INTO user_emoji_counts (user_id, emoji, count) SELECT user_id, emoji, COUNT(*) FROM reactions GROUP BY user_id, emoji;",
);
lines.push("");

// Users (INSERT OR REPLACE)
if (userProfiles.length > 0) {
  lines.push("-- Users");
  for (const batch of chunks(userProfiles, SQL_BATCH_SIZE)) {
    lines.push(
      "INSERT OR REPLACE INTO users (user_id, display_name, avatar_url, updated_at) VALUES",
    );
    const values = batch.map(
      (u) =>
        `  ('${esc(u.userId)}', '${esc(u.displayName)}', '${esc(u.avatarUrl)}', datetime('now'))`,
    );
    lines.push(`${values.join(",\n")};`);
    lines.push("");
  }
}

// Custom emoji (INSERT OR REPLACE)
if (emojiRows.length > 0) {
  lines.push("-- Custom emoji");
  for (const batch of chunks(emojiRows, SQL_BATCH_SIZE)) {
    lines.push(
      "INSERT OR REPLACE INTO emoji_images (name, image_url, updated_at) VALUES",
    );
    const values = batch.map(
      (e) => `  ('${esc(e.name)}', '${esc(e.imageUrl)}', datetime('now'))`,
    );
    lines.push(`${values.join(",\n")};`);
    lines.push("");
  }
}

const sqlContent = lines.join("\n");
writeFileSync(OUTPUT_FILE, sqlContent);
writeFileSync(CHECKPOINT_FILE, newCheckpoint);

console.log(`\nGenerated ${OUTPUT_FILE} (${sqlContent.length} bytes)`);
console.log(`Checkpoint saved: ${newCheckpoint}`);
console.log(`  ${allReactions.length} reactions`);
console.log(`  ${userProfiles.length} users`);
console.log(`  ${emojiRows.length} custom emojis`);
console.log("\nApply with:");
console.log(`  bunx wrangler d1 execute DB --file=./${OUTPUT_FILE} --local`);
console.log(`  bunx wrangler d1 execute DB --file=./${OUTPUT_FILE} --remote`);
