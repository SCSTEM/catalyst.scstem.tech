# Catalyst

Slack emoji reaction leaderboard.

Built as a Bun workspaces monorepo:

| Package           | Description                                | Deployed to                  |
| ----------------- | ------------------------------------------ | ---------------------------- |
| `packages/worker` | Hono API + Slack event handler (CF Worker) | `catalyst.scstem.tech/api/*` |
| `packages/web`    | React frontend (CF Pages)                  | `catalyst.scstem.tech`       |

**Stack:** Cloudflare Workers + D1, Hono, `slack-cloudflare-workers`, React 19, TanStack Router + Query, TailwindCSS v4

## Prerequisites

- [Bun](https://bun.sh) (v1.3+)
- [mise](https://mise.jdx.dev/) — task runner and env loader
- A [Cloudflare](https://dash.cloudflare.com) account
- A [Slack](https://api.slack.com/apps) workspace you can create apps in

## Quick start (local dev)

```bash
# 1. Install dependencies
bun install

# 2. Create your local secrets file
cp mise.local.toml.example mise.local.toml

# 3. Create + migrate the local D1 database
mise run db:migrate

# 4. Run the worker + web dev servers
mise run dev

# 5. Open the site. The AccessGate takes password **`000000`** by default.
```

The UI will look empty until you've imported some Slack data — see [Backfill historical data](#backfill-historical-data) below.

## Environment variables

| Variable                  | Why                                                        | Default                                 |
| ------------------------- | ---------------------------------------------------------- | --------------------------------------- |
| `SITE_PASSWORD`           | AccessGate password prompt                                 | `000000` (in `mise.toml`)               |
| `TURNSTILE_SECRET_KEY`    | Validates captcha token server-side                        | CF test secret (in `mise.toml`)         |
| `VITE_TURNSTILE_SITE_KEY` | Frontend captcha widget                                    | Frontend falls back to CF test site key |
| `SLACK_BOT_TOKEN`         | Backfill script, `/api/slack/events`, `/backfill` workflow | —                                       |
| `SLACK_SIGNING_SECRET`    | `/api/slack/events` signature verification                 | —                                       |
| `CLOUDFLARE_API_TOKEN`    | `mise run deploy:*` and remote `db:migrate`/`backfill`     | —                                       |

## Set up a Slack app

Skip this section if you're only doing frontend or read-API work — the AccessGate, charts, and rankings all work without Slack once you've got data in D1.

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. Name it whatever you want and pick your workspace

### Bot token scopes

Under **OAuth & Permissions**, add these **Bot Token Scopes**:

| Scope              | Used for                                                |
| ------------------ | ------------------------------------------------------- |
| `reactions:read`   | Receiving reaction events                               |
| `chat:write`       | Bot messages (backfill status, slash command responses) |
| `commands`         | Slash commands (`/catalyst`, `/backfill`)               |
| `channels:history` | Backfill: reading message history                       |
| `groups:history`   | Backfill: private channel history                       |
| `channels:read`    | Backfill: listing channels                              |
| `groups:read`      | Backfill: listing private channels                      |
| `users:read`       | Fetching user profiles (display names + avatars)        |
| `emoji:read`       | Fetching custom emoji images                            |

### Event subscriptions

Under **Event Subscriptions**:

1. Toggle **Enable Events** on
2. Set the **Request URL** to your deployed worker (e.g. `https://catalyst.scstem.tech/api/slack/events`)
3. Subscribe to bot events: `reaction_added`, `reaction_removed`

### Slash commands

Create two commands, both pointing at `/api/slack/events`:

| Command     | Description                               |
| ----------- | ----------------------------------------- |
| `/catalyst` | Ping the Catalyst bot                     |
| `/backfill` | Backfill emoji reactions for this channel |

The shared endpoint is fine — the `slack-cloudflare-workers` SDK dispatches by payload type.

### Install + grab credentials

- **OAuth & Permissions** → **Install to Workspace** → copy the **Bot User OAuth Token** (`xoxb-…`)
- **Basic Information** → **App Credentials** → copy the **Signing Secret**

Put both in `mise.local.toml` as `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET`.

## Backfill historical data

The backfill task pulls all existing reactions from Slack into D1 and rebuilds the aggregate tables.

```bash
mise run backfill              # local D1 (default)
mise run backfill staging      # remote: staging D1
mise run backfill prod         # remote: production D1
```

Requires `SLACK_BOT_TOKEN` in `mise.local.toml`. Remote targets also need `CLOUDFLARE_API_TOKEN` and a clean git working directory.

Optional cutoff: `BACKFILL_SINCE=2025-01-01 mise run backfill` (ISO date).

> The bot must be invited to any channels you want to backfill (`/invite @YourBotName`).

For on-demand single-channel backfills, use the `/backfill` slash command inside Slack — it triggers a Cloudflare Workflow that pages through the channel's history with automatic retries.

## Deploying

See **[DEPLOY.md](./DEPLOY.md)** for:

- First-time Cloudflare setup (D1 databases, Pages project, production secrets, environment variables)
- Day-to-day deploy commands and safety guardrails
- Infrastructure overview

Production secrets are managed via `wrangler secret put` — separately from your local `mise.local.toml`.

## Architecture

```
┌──────────────────┐     POST /api/slack/events  ┌─────────────────────┐
│   Slack Events   │ ──────────────────────────► │  slack-cloudflare-  │
│   API            │                             │  workers SDK        │
└──────────────────┘                             │  (sig verification, │
                                                 │   challenge, parse) │
                                                 └────────┬────────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────────┐
                                                 │  addReaction() /    │
                                                 │  removeReaction()   │
                                                 │  → D1 batch write   │
                                                 └─────────────────────┘

┌──────────────────┐     GET /api/*              ┌─────────────────────┐
│   React frontend │ ──────────────────────────► │  Hono app           │
│   (hono/client)  │ ◄────────────────────────── │  → Drizzle → D1     │
└──────────────────┘     JSON (type-safe RPC)    └─────────────────────┘
```
