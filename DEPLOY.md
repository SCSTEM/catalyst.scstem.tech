# Deployment Guide — Catalyst on Cloudflare

## Day-to-Day Deployment

All deploy commands run from the repo root via [mise](https://mise.jdx.dev/).

The **frontend auto-deploys** via Cloudflare Pages git integration for both staging and production. The commands below handle the worker and database — the parts that require manual deploys.

### Standard deploy

```bash
mise run deploy:site             # Staging (default)
mise run deploy:site prod        # Production
```

This runs, in order:

1. **Verify** — typecheck + lint (`mise run verify`)
2. **Migrate** — applies D1 migrations to the remote database
3. **Worker** — deploys the Cloudflare Worker via `wrangler deploy`

Migrations run before new code goes live, so the database schema always matches the deployed worker.

To also force-deploy Pages (bypassing auto-deploy), add `--pages`:

```bash
mise run deploy:site --pages
mise run deploy:site prod --pages
```

### Worker only

If there are no schema changes:

```bash
mise run deploy:worker           # Staging (default)
mise run deploy:worker prod      # Production
```

Runs `mise run verify` as a dependency before deploying.

### Migrations only

```bash
mise run db:migrate              # Local D1 (default)
mise run db:migrate staging      # Staging D1
mise run db:migrate prod         # Production D1
```

### Backfill historical Slack data

```bash
mise run backfill              # Local (default)
mise run backfill staging      # Staging
mise run backfill prod         # Production
```

Requires `SLACK_BOT_TOKEN` in `mise.local.toml`. Remote targets also need `CLOUDFLARE_API_TOKEN`.

### Workflows (Slack-triggered backfill)

The `/backfill` slash command in Slack triggers a durable [Cloudflare Workflow](https://developers.cloudflare.com/workflows/) (`BackfillChannelWorkflow`) that backfills a single channel server-side. It pages through message history, writes reactions to D1, rebuilds aggregates, and posts a completion message — all with automatic retries.

The workflow deploys automatically as part of `wrangler deploy` (it's declared in `wrangler.jsonc`). No extra deployment steps are needed.

Use **`/backfill`** for on-demand single-channel backfills from Slack. Use **`mise run backfill`** for bulk backfills across all channels from the CLI.

### Safety guardrails

- **Staging is the default** for all deploy commands.
- **Local is the default** for `db:migrate` and `backfill`.
- **Production requires explicit `prod`** argument and an interactive `y/N` confirmation.
- **All remote operations require a clean git working directory.** Commit or stash first.
- **Verify runs automatically** — you don't need to run it separately before deploying.

### When to use what

| Scenario                                | Command                                  |
| --------------------------------------- | ---------------------------------------- |
| Normal deploy (schema + worker changes) | `mise run deploy:site`                   |
| Worker-only change (no migration)       | `mise run deploy:worker`                 |
| Schema change, code not ready to deploy | `mise run db:migrate staging`            |
| Promote staging to production           | `mise run deploy:site prod`              |
| Force Pages redeploy                    | `mise run deploy:site --pages`           |
| Backfill a single channel (from Slack)  | `/backfill` slash command in the channel |

---

## Initial Setup

Follow these steps when setting up the project on a new Cloudflare account.

### Prerequisites

- A [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Bun](https://bun.sh) installed
- [mise](https://mise.jdx.dev/) installed
- A populated `mise.local.toml` (copy from `mise.local.toml.example`) with `CLOUDFLARE_API_TOKEN` set — see the root `README.md` for details
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) is provided via `bunx wrangler`; no global install needed

### 1. Create D1 Databases

```bash
# Production
wrangler d1 create catalyst-db

# Staging
wrangler d1 create catalyst-db-staging
```

Update `packages/worker/wrangler.jsonc` with the database IDs:

- Top-level `d1_databases[0].database_id` → production ID
- `env.staging.d1_databases[0].database_id` → staging ID

Apply migrations:

```bash
mise run db:migrate staging
mise run db:migrate prod
```

### 2. Set Worker Secrets

```bash
# Production
wrangler secret put SITE_PASSWORD
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put SLACK_SIGNING_SECRET
wrangler secret put SLACK_BOT_TOKEN

# Staging
wrangler secret put SITE_PASSWORD --env staging
wrangler secret put TURNSTILE_SECRET_KEY --env staging
wrangler secret put SLACK_SIGNING_SECRET --env staging
wrangler secret put SLACK_BOT_TOKEN --env staging
```

### 3. Create a Cloudflare Pages Project

```bash
wrangler pages project create catalyst-scstem-tech
```

Set build-time environment variables in the Cloudflare dashboard under **Workers & Pages → Settings → Environment variables**:

| Variable                  | Production                         | Preview/Staging                            |
| ------------------------- | ---------------------------------- | ------------------------------------------ |
| `VITE_API_URL`            | `https://catalyst.scstem.tech/api` | `https://staging.catalyst.scstem.tech/api` |
| `VITE_TURNSTILE_SITE_KEY` | Your Turnstile site key            | Your Turnstile site key                    |

### 4. Set Up Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create (or select) your app
2. **Event Subscriptions** → Enable → Request URL: `https://catalyst.scstem.tech/api/slack/events`
3. Subscribe to **bot events**: `reaction_added`, `reaction_removed`
4. **Slash Commands** → Create: `/catalyst` with URL `https://catalyst.scstem.tech/api/slack/events`
5. **OAuth & Permissions** → Bot token scopes: `reactions:read`, `users:read`, `emoji:read`, `commands`
6. Install the app to your workspace and use the Bot User OAuth Token as `SLACK_BOT_TOKEN`

### 5. First Deploy

```bash
mise run deploy:site --pages
mise run deploy:site prod --pages
```

---

## Infrastructure Summary

| Component             | Service                        | Domain                                                                               |
| --------------------- | ------------------------------ | ------------------------------------------------------------------------------------ |
| API + Slack handler   | Cloudflare Worker              | `catalyst.scstem.tech/api/*` (prod) / `staging.catalyst.scstem.tech/api/*` (staging) |
| Frontend SPA          | Cloudflare Pages (auto-deploy) | `catalyst.scstem.tech` (prod) / `staging.catalyst.scstem.tech` (staging)             |
| Database (production) | Cloudflare D1                  | `catalyst-db`                                                                        |
| Database (staging)    | Cloudflare D1                  | `catalyst-db-staging`                                                                |
| Backfill workflow     | Cloudflare Workflows           | `backfill-channel-workflow`                                                          |
| Captcha               | Cloudflare Turnstile           | —                                                                                    |
