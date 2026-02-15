/**
 * Backfill script: imports historical Slack reactions into D1.
 *
 * Supports both local (bun:sqlite) and remote (Cloudflare D1 HTTP API) targets.
 * All inserts are type-checked against the Drizzle schema.
 *
 * Usage: bun scripts/backfill.ts
 *
 * Env vars:
 *   SLACK_BOT_TOKEN        — required
 *   BACKFILL_SINCE         — ISO date cutoff (e.g. "2025-01-01"), optional
 *   BACKFILL_TARGET        — "local" (default) or "remote"
 *
 * Remote-only env vars:
 *   CLOUDFLARE_ACCOUNT_ID  — required for remote
 *   CLOUDFLARE_DATABASE_ID — required for remote
 *   CLOUDFLARE_D1_TOKEN    — required for remote (API token with D1 write access)
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
import { drizzle as drizzleBunSqlite } from "drizzle-orm/bun-sqlite";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";

const MAX_RETRIES = 5;

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
const oldest = BACKFILL_SINCE
  ? String(Math.floor(new Date(BACKFILL_SINCE).getTime() / 1000))
  : undefined;

const BACKFILL_TARGET = process.env.BACKFILL_TARGET ?? "local";
if (BACKFILL_TARGET !== "local" && BACKFILL_TARGET !== "remote") {
  console.error('BACKFILL_TARGET must be "local" or "remote"');
  process.exit(1);
}

// ── D1 HTTP client shim (for remote mode) ──

function createD1HttpClient(
  accountId: string,
  databaseId: string,
  apiToken: string,
) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  async function query(sqlStr: string, params: unknown[]) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql: sqlStr, params }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`D1 HTTP error ${res.status}: ${text}`);
    }
    const body = (await res.json()) as {
      result: Array<{
        results: unknown[];
        success: boolean;
        meta: Record<string, unknown>;
      }>;
      success: boolean;
      errors: Array<{ message: string }>;
    };
    if (!body.success) {
      throw new Error(
        `D1 query failed: ${body.errors.map((e) => e.message).join(", ")}`,
      );
    }
    return body.result[0];
  }

  function createBoundStatement(sqlStr: string, params: unknown[]) {
    return {
      bind(...values: unknown[]) {
        return createBoundStatement(sqlStr, values);
      },
      run: () => query(sqlStr, params),
      all: () => query(sqlStr, params),
      first: async (col?: string) => {
        const result = await query(sqlStr, params);
        const row = result?.results?.[0] as Record<string, unknown> | undefined;
        if (!row) {
          return null;
        }
        return col ? row[col] : row;
      },
      raw: async () => {
        const result = await query(sqlStr, params);
        return (result?.results ?? []).map((r) =>
          Object.values(r as Record<string, unknown>),
        );
      },
    };
  }

  return {
    prepare(sqlStr: string) {
      return createBoundStatement(sqlStr, []);
    },
    batch: async (stmts: Array<ReturnType<typeof createBoundStatement>>) => {
      const results = [];
      for (const stmt of stmts) {
        results.push(await stmt.run());
      }
      return results;
    },
  };
}

// ── Connect to D1 ──

// Both drivers produce a Drizzle SQLite database. We use `any` because
// bun-sqlite is sync and d1 is async, but `await` handles both correctly.
// biome-ignore lint/suspicious/noExplicitAny: union of sync/async db drivers
let db: any;

if (BACKFILL_TARGET === "remote") {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_D1_TOKEN;
  if (!accountId || !databaseId || !apiToken) {
    console.error(
      "Remote mode requires CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, and CLOUDFLARE_D1_TOKEN",
    );
    process.exit(1);
  }
  // biome-ignore lint/suspicious/noExplicitAny: D1 types unavailable in Bun runtime
  db = drizzleD1(createD1HttpClient(accountId, databaseId, apiToken) as any);
  console.log("Connected to remote D1");
} else {
  const d1Dir = "packages/worker/.wrangler/state/v3/d1";
  const sqliteFiles = [...new Glob("**/*.sqlite").scanSync(d1Dir)];
  if (!sqliteFiles.length) {
    console.error(
      "No local D1 database found. Run `bun run db:migrate:local` first.",
    );
    process.exit(1);
  }
  const sqlite = new Database(`${d1Dir}/${sqliteFiles[0]}`);
  db = drizzleBunSqlite(sqlite);
  console.log(`Connected to local D1: ${sqliteFiles[0]}`);
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

function chunks<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
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

// ── Step 3: Insert reactions ──

console.log("Inserting reactions...");
const BATCH_SIZE = 100;
const reactionBatches = chunks(allReactions, BATCH_SIZE);
const [{ countBefore: reactionsCountBefore }] = await db
  .select({ countBefore: sql<number>`COUNT(*)` })
  .from(reactions);
for (let i = 0; i < reactionBatches.length; i++) {
  const batch = reactionBatches[i];
  if (!batch) {
    continue;
  }
  await db
    .insert(reactions)
    .values(
      batch.map((r: ReactionRow) => ({
        userId: r.userId,
        emoji: r.emoji,
        channelId: r.channelId,
        messageTs: r.messageTs,
        createdAt: r.createdAt,
      })),
    )
    .onConflictDoNothing()
    .run();
  if (i % 20 === 0) {
    const count = Math.min((i + 1) * BATCH_SIZE, allReactions.length);
    console.log(`  ${count} / ${allReactions.length}`);
  }
}
const [{ countAfter: reactionsCountAfter }] = await db
  .select({ countAfter: sql<number>`COUNT(*)` })
  .from(reactions);
console.log(
  `  ${reactionsCountAfter - reactionsCountBefore} new reactions inserted`,
);

// ── Step 4: Rebuild aggregates from DB ──
//
// Aggregates are computed from the full reactions table (not just what was
// fetched this run). Re-running backfill is safe (ON CONFLICT DO NOTHING).

console.log("Rebuilding aggregate tables...");

await db.run(sql`DELETE FROM ${reactionTotals}`);
await db.run(sql`
  INSERT INTO ${reactionTotals} (emoji, count)
  SELECT emoji, COUNT(*) FROM ${reactions} GROUP BY emoji
`);
console.log("  emoji totals rebuilt");

await db.run(sql`DELETE FROM ${userEmojiCounts}`);
await db.run(sql`
  INSERT INTO ${userEmojiCounts} (user_id, emoji, count)
  SELECT user_id, emoji, COUNT(*) FROM ${reactions} GROUP BY user_id, emoji
`);
console.log("  user-emoji counts rebuilt");

// ── Step 5: Fetch user profiles ──

console.log("Fetching user profiles...");
const [{ countBefore: usersCountBefore }] = await db
  .select({ countBefore: sql<number>`COUNT(*)` })
  .from(users);
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
    await db
      .insert(users)
      .values({
        userId,
        displayName: profile.display_name || profile.real_name || "",
        avatarUrl: profile.image_72 || "",
      })
      .onConflictDoUpdate({
        target: users.userId,
        set: {
          displayName: profile.display_name || profile.real_name || "",
          avatarUrl: profile.image_72 || "",
        },
      })
      .run();
  } catch (e) {
    console.warn(`  Failed to fetch user ${userId}: ${e}`);
  }
  await sleep(1200);
}
const [{ countAfter: usersCountAfter }] = await db
  .select({ countAfter: sql<number>`COUNT(*)` })
  .from(users);
console.log(`  ${usersCountAfter - usersCountBefore} new users inserted`);

// ── Step 6: Fetch custom emoji ──

console.log("Fetching custom emoji list...");
const [{ countBefore: emojisCountBefore }] = await db
  .select({ countBefore: sql<number>`COUNT(*)` })
  .from(emojiImages);
try {
  const res = await slackApi<{ emoji: Record<string, string> }>("emoji.list");
  const emojiRows: { name: string; imageUrl: string }[] = [];
  for (const [name, url] of Object.entries(res.emoji)) {
    if (url.startsWith("alias:")) {
      continue;
    }
    emojiRows.push({ name, imageUrl: url });
  }
  for (const batch of chunks(emojiRows, BATCH_SIZE)) {
    await db
      .insert(emojiImages)
      .values(batch)
      .onConflictDoUpdate({
        target: emojiImages.name,
        set: { imageUrl: sql`excluded.image_url` },
      })
      .run();
  }
  const [{ countAfter: emojisCountAfter }] = await db
    .select({ countAfter: sql<number>`COUNT(*)` })
    .from(emojiImages);
  console.log(
    `  ${emojisCountAfter - emojisCountBefore} new custom emojis inserted`,
  );
} catch (e) {
  console.warn(`Failed to fetch emoji list: ${e}`);
}

console.log("Backfill complete!");
