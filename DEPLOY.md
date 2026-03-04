# Deployment Guide — Catalyst on Cloudflare

## Day-to-Day Deployment

All deploy commands run from the repo root via [mise](https://mise.jdx.dev/).

### Full deploy (recommended)

```bash
mise run deploy:site             # Deploy everything to staging
mise run deploy:site prod        # Deploy everything to production
```

This runs, in order:

1. **Verify** — typecheck + lint + tests (`mise run verify`)
2. **Migrate** — applies D1 migrations to the remote database
3. **Worker** — deploys the Cloudflare Worker via `wrangler deploy`
4. **Pages** — builds the web package and deploys to Cloudflare Pages

Use this for most deploys. It ensures migrations run before new code goes live, so the database schema always matches the deployed worker.

### Partial deploys

If only one half changed and you're confident there are no schema changes:

```bash
mise run deploy:worker           # Worker only → staging
mise run deploy:worker prod      # Worker only → production
mise run deploy:web              # Pages only → staging
mise run deploy:web prod         # Pages only → production
```

Both run `mise run verify` as a dependency before deploying.

### Migrations only

```bash
mise run db:migrate              # Local D1 (default)
mise run db:migrate staging      # Staging D1
mise run db:migrate prod         # Production D1
```

### Backfill historical Slack data

```bash
SLACK_BOT_TOKEN=xoxb-... mise run backfill              # Local (default)
SLACK_BOT_TOKEN=xoxb-... mise run backfill staging       # Staging
SLACK_BOT_TOKEN=xoxb-... mise run backfill prod          # Production
```

### Safety guardrails

- **Staging is the default** for all deploy commands.
- **Local is the default** for `db:migrate` and `backfill`.
- **Production requires explicit `prod`** argument and an interactive `y/N` confirmation.
- **All remote operations require a clean git working directory.** Commit or stash first.
- **Verify runs automatically** — you don't need to run it separately before deploying.

### When to use what

| Scenario | Command |
|---|---|
| Normal deploy with schema + code changes | `mise run deploy:site` |
| Code-only change (no migration) | `mise run deploy:worker` or `mise run deploy:web` |
| Schema change, code not ready to deploy | `mise run db:migrate staging` |
| Promote staging to production | `mise run deploy:site prod` |

---

## Initial Setup

Follow these steps when setting up the project on a new Cloudflare account.

### Prerequisites

- A [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Bun](https://bun.sh) installed
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`bun add -g wrangler`)
- Wrangler authenticated: `wrangler login`

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

| Variable | Production | Preview/Staging |
|---|---|---|
| `VITE_API_URL` | `https://catalyst.scstem.tech/api` | `https://staging.catalyst.scstem.tech/api` |
| `VITE_TURNSTILE_SITE_KEY` | Your Turnstile site key | Your Turnstile site key |

### 4. Set Up Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create (or select) your app
2. **Event Subscriptions** → Enable → Request URL: `https://catalyst.scstem.tech/api/slack/events`
3. Subscribe to **bot events**: `reaction_added`, `reaction_removed`
4. **Slash Commands** → Create: `/catalyst` with URL `https://catalyst.scstem.tech/api/slack/events`
5. **OAuth & Permissions** → Bot token scopes: `reactions:read`, `users:read`, `emoji:read`, `commands`
6. Install the app to your workspace and use the Bot User OAuth Token as `SLACK_BOT_TOKEN`

### 5. First Deploy

```bash
mise run deploy:site
mise run deploy:site prod
```

---

## Infrastructure Summary

| Component | Service | Domain |
|---|---|---|
| API + Slack handler | Cloudflare Worker | `catalyst.scstem.tech/api/*` (prod) / `staging.catalyst.scstem.tech/api/*` (staging) |
| Frontend SPA | Cloudflare Pages | `catalyst.scstem.tech` (prod) / `staging.catalyst.scstem.tech` (staging) |
| Database (production) | Cloudflare D1 | `catalyst-db` |
| Database (staging) | Cloudflare D1 | `catalyst-db-staging` |
| Captcha | Cloudflare Turnstile | — |
