# Catalyst

Slack emoji **reaction** leaderboard. Shows which emojis get used most and who reacts the most across your workspace.

Built as a Bun workspaces monorepo:

| Package | Description | Deployed to |
|---------|-------------|-------------|
| `packages/worker` | Catalyst bot — Hono API + Slack event handler (CF Worker) | `api.catalyst.scstem.org` |
| `packages/web` | React frontend (CF Pages / static) | `catalyst.scstem.org` |

**Stack:** Cloudflare Workers + D1, Hono, `slack-cloudflare-workers`, React 19, TailwindCSS v4

## Prerequisites

- [Bun](https://bun.sh) (v1.3+)
- A [Cloudflare](https://dash.cloudflare.com) account
- A [Slack](https://api.slack.com/apps) workspace you can create apps in

## 1. Install dependencies

```bash
bun install
```

This resolves both workspace packages and all their dependencies.

## 2. Create a Slack app

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click **Create New App** > **From scratch**
2. Name it whatever you want and pick your workspace

### Bot token scopes

Under **OAuth & Permissions**, add these **Bot Token Scopes**:

| Scope | Used for |
|-------|----------|
| `reactions:read` | Receiving reaction events |
| `commands` | Slash command (`/catalyst`) |
| `channels:history` | Backfill: reading message history |
| `groups:history` | Backfill: private channel history |
| `channels:read` | Backfill: listing channels |
| `groups:read` | Backfill: listing private channels |
| `users:read` | Fetching user profiles (display names + avatars) |
| `emoji:read` | Fetching custom emoji images |

### Event subscriptions

Under **Event Subscriptions**:

1. Toggle **Enable Events** on
2. Set the **Request URL** to `https://api.catalyst.scstem.org/slack/events` (come back to this after deploying in step 5)
3. Under **Subscribe to bot events**, add:
   - `reaction_added`
   - `reaction_removed`

### Slash command

Under **Slash Commands**, click **Create New Command**:

| Field | Value |
|-------|-------|
| Command | `/catalyst` |
| Request URL | `https://api.catalyst.scstem.org/slack/events` |
| Short Description | Ping the Catalyst bot |

> The slash command and events share the same endpoint — the SDK dispatches by payload type.

### Install to workspace

Under **Install App**, click **Install to Workspace** and authorize. Copy the **Bot User OAuth Token** (`xoxb-...`).

### Grab the signing secret

Under **Basic Information** > **App Credentials**, copy the **Signing Secret**.

## 3. Create the D1 database

```bash
cd packages/worker
bunx wrangler d1 create emoji-db
```

This prints a database ID. Paste it into `packages/worker/wrangler.jsonc`:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "emoji-db",
      "database_id": "<paste-your-id-here>"
    }
  ]
}
```

### Apply the schema

Locally (for development):

```bash
cd packages/worker
bun run db:migrate:local
```

Remotely (for production):

```bash
cd packages/worker
bun run db:migrate:remote
```

## 4. Configure secrets

### Local development

Create `packages/worker/.dev.vars`:

```
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_BOT_TOKEN=xoxb-your-bot-token
```

### Production

```bash
cd packages/worker
bunx wrangler secret put SLACK_SIGNING_SECRET
bunx wrangler secret put SLACK_BOT_TOKEN
```

## 5. Deploy

### Worker

```bash
cd packages/worker
bun run deploy
```

### Web

Build static assets and deploy to Cloudflare Pages (or your preferred host):

```bash
cd packages/web
bun run build
```

After deploying the worker, go back to your Slack app's **Event Subscriptions** and set the Request URL to:

```
https://api.catalyst.scstem.org/slack/events
```

Slack will send a verification challenge — the `slack-cloudflare-workers` SDK handles this automatically.

## 6. Backfill historical data

The backfill script imports all existing reactions from your Slack workspace into D1. It supports both local and remote (production) targets.

### Local backfill (default)

Writes directly to the local D1 SQLite file via `bun:sqlite`:

```bash
export SLACK_BOT_TOKEN=xoxb-your-bot-token
export BACKFILL_SINCE=2025-01-01  # optional: ISO date cutoff

bun scripts/backfill.ts
```

### Remote backfill (production)

Writes to your production D1 database via the Cloudflare REST API:

```bash
export SLACK_BOT_TOKEN=xoxb-your-bot-token
export BACKFILL_TARGET=remote
export CLOUDFLARE_ACCOUNT_ID=your-account-id
export CLOUDFLARE_DATABASE_ID=your-d1-database-id
export CLOUDFLARE_D1_TOKEN=your-api-token

# Optional: ISO date cutoff
export BACKFILL_SINCE=2025-01-01

bun scripts/backfill.ts
```

The `CLOUDFLARE_D1_TOKEN` needs the **D1 Write** permission. You can create one at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens).

### What it does

1. List all channels the bot has access to
2. Fetch message history (with rate limiting)
3. Extract reactions and insert them into D1
4. Rebuild aggregate count tables
5. Fetch user profiles (display names + avatars)
6. Fetch custom emoji image URLs

> **Note:** The bot must be a member of channels you want to backfill. Invite it with `/invite @YourBotName` or add it to channels in the Slack app settings.

## Development

Start both services in separate terminals:

```bash
# Terminal 1 — Worker (Hono API + Slack handler on :8787)
cd packages/worker
bun run dev

# Terminal 2 — Frontend (Vite on :5173, proxies /api → :8787)
cd packages/web
bun run dev
```

Visit `http://localhost:5173`.

### Root scripts

| Script | Description |
|--------|-------------|
| `bun run typecheck` | TypeScript type checking across all packages (`tsc -b`) |
| `bun run check` | Biome lint + format (auto-fix) |
| `bun run format` | Biome format only (auto-fix) |
| `bun run lint` | Biome lint only (auto-fix) |

### Worker scripts (`packages/worker`)

| Script | Description |
|--------|-------------|
| `bun run dev` | Start wrangler dev server |
| `bun run deploy` | Deploy to Cloudflare Workers |
| `bun run db:generate` | Generate Drizzle migration |
| `bun run db:migrate:local` | Apply D1 schema locally |
| `bun run db:migrate:remote` | Apply D1 schema to production |
| `bun run cf-typegen` | Regenerate Cloudflare bindings types |

### Web scripts (`packages/web`)

| Script | Description |
|--------|-------------|
| `bun run dev` | Start Vite dev server |
| `bun run build` | Production build |
| `bun run preview` | Preview production build |

### API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/leaderboard/emojis?limit=50` | Top emojis by reaction count |
| GET | `/api/leaderboard/users?limit=50` | Top reactors by total count |
| GET | `/api/leaderboard/emojis/:emoji` | Who uses a specific emoji most |
| GET | `/api/leaderboard/users/:userId` | A user's emoji breakdown |
| GET | `/api/emojis` | Custom emoji name-to-image-URL map |
| POST | `/slack/events` | Slack Events API webhook (handled by SDK) |

## Architecture

```
┌──────────────────┐     POST /slack/events      ┌─────────────────────┐
│   Slack Events   │ ──────────────────────────►  │  slack-cloudflare-  │
│   API            │                              │  workers SDK        │
└──────────────────┘                              │  (sig verification, │
                                                  │   challenge, parse) │
                                                  └────────┬────────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────────┐
                                                  │  recordReaction()   │
                                                  │  → D1 batch write   │
                                                  └─────────────────────┘

┌──────────────────┐     GET /api/*               ┌─────────────────────┐
│   React frontend │ ──────────────────────────►  │  Hono app (CORS)    │
│   (hono/client)  │ ◄──────────────────────────  │  → Drizzle → D1     │
└──────────────────┘     JSON (type-safe RPC)     └─────────────────────┘
```

The worker entry point (`packages/worker/src/index.ts`) routes by path:
- `/slack/events` → `slack-cloudflare-workers` SDK
- Everything else → Hono app

Hono RPC type safety is maintained across packages via TypeScript project references — the worker tsconfig emits declarations, and the web tsconfig references it.
