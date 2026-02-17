# Deployment Guide — Catalyst on Cloudflare

## Prerequisites

- A [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Bun](https://bun.sh) installed
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed (`bun add -g wrangler`)
- Wrangler authenticated: `wrangler login`

---

## 1. Create the D1 Database

```bash
wrangler d1 create catalyst-db
```

This outputs a `database_id`. Update `packages/worker/wrangler.jsonc` with the new ID:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "catalyst-db",
    "database_id": "<your-database-id>"
  }
]
```

Apply the schema migration:

```bash
bun run db:migrate:remote
```

---

## 2. Set Worker Secrets

These are sensitive values that must NOT go in `wrangler.jsonc`. Set each one interactively:

```bash
# Site access password (users enter this to access the dashboard)
wrangler secret put SITE_PASSWORD

# Cloudflare Turnstile secret key (from dashboard.cloudflare.com → Turnstile)
wrangler secret put TURNSTILE_SECRET_KEY

# Slack app credentials (from api.slack.com → your app → Basic Information / OAuth)
wrangler secret put SLACK_SIGNING_SECRET
wrangler secret put SLACK_BOT_TOKEN
```

Optionally override `SESSION_TTL_HOURS` (defaults to `"0"` = no expiration):

```bash
wrangler secret put SESSION_TTL_HOURS
```

---

## 3. Deploy the Worker

```bash
bun run deploy
```

This runs `wrangler deploy` from the worker package. The worker is now live.

### Custom domain (optional)

The worker is deployed to `catalyst-api.scstem.workers.dev`. The staging environment deploys to `staging.catalyst-api.scstem.workers.dev`.

---

## 4. Create a Cloudflare Pages Project

From the repo root:

```bash
wrangler pages project create catalyst
```

Or create it via the dashboard: **Workers & Pages → Create → Pages → Connect to Git** (if you want automatic deploys from GitHub).

---

## 5. Build & Deploy the Frontend

### Set environment variables

The frontend needs build-time variables. In the Cloudflare dashboard:

**Workers & Pages → catalyst → Settings → Environment variables**

| Variable | Value | Notes |
|---|---|---|
| `VITE_API_URL` | `https://catalyst-api.scstem.workers.dev` | Worker API base URL |
| `VITE_TURNSTILE_SITE_KEY` | Your Turnstile site key | From dashboard → Turnstile |

### Deploy

```bash
# Build the frontend
bun run build

# Deploy to Pages
wrangler pages deploy packages/web/dist --project-name catalyst
```

---

## 6. Configure CORS

The worker allows requests from origins in the `ALLOWED_ORIGINS` set in `packages/worker/src/app.ts`, plus any `*.catalyst-scstem-tech.pages.dev` preview deployment origin and `staging.catalyst.scstem.tech`. If your frontend domain differs, add it there before deploying the worker.

---

## 7. Set Up Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create (or select) your app
2. **Event Subscriptions** → Enable → Request URL: `https://catalyst-api.scstem.workers.dev/slack/events`
3. Subscribe to **bot events**: `reaction_added`, `reaction_removed`
4. **Slash Commands** → Create: `/catalyst` with URL `https://catalyst-api.scstem.workers.dev/slack/events`
5. **OAuth & Permissions** → Bot token scopes: `reactions:read`, `users:read`, `emoji:read`, `commands`
6. Install the app to your workspace and use the Bot User OAuth Token as `SLACK_BOT_TOKEN`

---

## 8. Backfill Historical Data (Optional)

To populate the database with existing reactions from Slack:

```bash
SLACK_BOT_TOKEN=xoxb-... bun run backfill
```

This runs locally and writes directly to the remote D1 database.

---

## Staging Environment

The worker has a staging environment (`env.staging` in `wrangler.jsonc`) with a separate D1 database. Cloudflare Pages preview deployments use this staging worker.

### Setup

1. **Create the staging D1 database:**

   ```bash
   wrangler d1 create catalyst-db-staging
   ```

   Update the `database_id` in `wrangler.jsonc` under `env.staging`.

2. **Set staging secrets:**

   ```bash
   wrangler secret put SITE_PASSWORD --env staging
   wrangler secret put TURNSTILE_SECRET_KEY --env staging
   wrangler secret put SLACK_SIGNING_SECRET --env staging
   wrangler secret put SLACK_BOT_TOKEN --env staging
   ```

3. **Apply migrations to staging DB:**

   ```bash
   wrangler d1 migrations apply DB --remote --env staging
   ```

4. **Deploy the staging worker:**

   ```bash
   cd packages/worker && wrangler deploy --env staging
   ```

5. **Set Pages preview env var:**

   In the Cloudflare dashboard under **Workers & Pages → catalyst → Settings → Environment variables → Preview**, set:

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://staging.catalyst-api.scstem.workers.dev` |

---

## Summary

| Component | Service | Domain |
|---|---|---|
| API + Slack handler | Cloudflare Worker (`catalyst-api`) | `catalyst-api.scstem.workers.dev` |
| Frontend SPA | Cloudflare Pages (`catalyst`) | `catalyst.scstem.tech` / `staging.catalyst.scstem.tech` |
| Database (production) | Cloudflare D1 (`catalyst-db`) | — |
| Database (staging) | Cloudflare D1 (`catalyst-db-staging`) | — |
| Captcha | Cloudflare Turnstile | — |

## Redeployment

```bash
# Worker (after API changes)
bun run deploy

# Frontend (after UI changes)
bun run build && wrangler pages deploy packages/web/dist --project-name catalyst

# Database (after schema changes)
bun run db:migrate:remote
```
