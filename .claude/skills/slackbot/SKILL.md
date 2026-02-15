---
name: slackbot
description: Add slash commands, event listeners, and other Slack integrations to the worker.
---

# Adding Slackbot Functionality

The Slack integration lives in `packages/worker/src/slack.ts` and uses the `slack-cloudflare-workers` SDK. It handles:

- Slash commands
- Event listeners (reaction_added, reaction_removed, etc.)

## Architecture

```
Request → src/index.ts → /slack/events → slack-cloudflare-workers SDK → src/slack.ts handlers
                       → everything else → Hono app (src/app.ts)
```

The SDK handles signature verification, URL verification challenges, and event dispatch. You only write the handler logic.

## Adding a Slash Command

Edit `packages/worker/src/slack.ts`:

```ts
app.command("/<command-name>", async ({ payload, context }) => {
  // payload.text     — the text after the command (e.g. "/cmd hello" → "hello")
  // payload.user_id  — who invoked it
  // payload.channel_id — which channel
  // context.env      — access to bindings (DB, etc.)

  // Return a string for an immediate ephemeral response:
  return "Response visible only to the user";

  // Or return a more complex message:
  return {
    response_type: "in_channel",  // or "ephemeral" (default)
    text: "Response visible to everyone",
  };
});
```

### Key notes for slash commands:

- The command must be registered in the Slack App settings (api.slack.com) first
- The request URL should be `https://api.catalyst.scstem.org/slack/events`
- Slack expects a response within 3 seconds — for long operations, acknowledge immediately and use `context.respond()` for a delayed response
- Access D1 via `env.DB` (passed to `createSlackApp`)

## Adding an Event Listener

Edit `packages/worker/src/slack.ts`:

```ts
app.event("<event-type>", async ({ payload, context }) => {
  // payload shape depends on the event type
  // See: https://api.slack.com/events

  // Access DB:
  const db = drizzle(env.DB);
});
```

### Common event types:

| Event | Payload Key Fields | Notes |
|-------|-------------------|-------|
| `reaction_added` | `user`, `reaction`, `item.channel`, `item.ts` | Already implemented |
| `reaction_removed` | `user`, `reaction`, `item.channel`, `item.ts` | Already implemented |
| `message` | `user`, `text`, `channel`, `ts` | New messages in channels |
| `app_mention` | `user`, `text`, `channel`, `ts` | When the bot is @mentioned |
| `member_joined_channel` | `user`, `channel` | User joins a channel |

### Important: Event subscriptions must be enabled in the Slack App settings:

1. Go to api.slack.com → Your App → Event Subscriptions
2. Enable events
3. Set Request URL to `https://api.catalyst.scstem.org/slack/events`
4. Subscribe to the event types you need under "Subscribe to bot events"

## Database Operations

For event handlers that need to write to D1, use the patterns in `src/lib/db.ts`:

```ts
import { addReaction, removeReaction } from "./lib/db";

// These handle both the raw reactions table AND the aggregate tables
// in a single db.batch() call (atomic writes).
await addReaction(env.DB, {
  userId: payload.user,
  emoji: payload.reaction,
  channelId: payload.item.channel,
  messageTs: payload.item.ts,
});
```

### Adding new DB operations:

1. Add the function to `src/lib/db.ts`
2. Use `db.batch([...])` for atomic multi-table writes
3. If you add new aggregate tables, update the seed and backfill scripts too

## The Env Pattern

The Slack app receives env bindings via `createSlackApp(env)`:

```ts
type Env = {
  SLACK_SIGNING_SECRET: string;
  SLACK_BOT_TOKEN: string;
  DB: D1Database;
};
```

If you need additional bindings (e.g. a new KV namespace), update:
1. The `Env` type in `src/slack.ts`
2. The call site in `src/index.ts` where `createSlackApp` is invoked
3. `wrangler.jsonc` to add the binding

## Testing Locally

```bash
# Start the worker
bun run dev:worker

# Use Slack's socket mode or ngrok to tunnel to localhost:8787
# Or test slash commands via curl:
curl -X POST http://localhost:8787/slack/events \
  -H "Content-Type: application/json" \
  -d '{"type": "url_verification", "challenge": "test"}'
```

Note: Signature verification will fail locally unless you set `SLACK_SIGNING_SECRET`. For local testing, the SDK's challenge response endpoint still works.

## Checklist

- [ ] Handler added in `packages/worker/src/slack.ts`
- [ ] Event/command registered in Slack App settings (api.slack.com)
- [ ] If new DB writes: added function in `src/lib/db.ts` with batch atomicity
- [ ] If new schema: updated schema, migrations, seed, and backfill scripts
- [ ] `bun run check && bun run typecheck` passes
