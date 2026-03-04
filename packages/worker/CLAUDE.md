# Worker Package (`@catalyst/worker`)

Cloudflare Worker providing the Hono API and Slack event handler, backed by D1 (SQLite).

## Adding a New API Route

1. Create a new route file in `src/routes/`. Follow the pattern of existing routes — they all use `Hono<{ Bindings: Env }>` and create Drizzle instances per-request.
2. Mount it in `src/app.ts` via `.route()`. The exported `AppType` automatically picks up the new route — the web package gets type-safe RPC for free.

## Key Patterns

### Bindings

All route files use the global `Env` type. D1 bindings come from `wrangler.jsonc`, secrets are typed in `env.d.ts` via the `Cloudflare.Env` namespace. Run `wrangler types` to regenerate `worker-configuration.d.ts`.

### Drizzle Queries

Always create the Drizzle instance per-request from the D1 binding (`drizzle(c.env.DB)`). Never store `db` at module scope — the D1 binding changes per-request in Workers.

### Query Validation

Use `@hono/zod-validator` for query/body validation. See `src/routes/util.ts` for shared schemas (e.g. `limitQuery`). Follow the existing route files for usage patterns.

### Pre-aggregated Tables

`reaction_totals` and `user_emoji_counts` are maintained inline during writes (see `src/lib/db.ts`). Writes use `.returning()` to detect duplicates before updating aggregates. Do NOT query `reactions` for counts — use the aggregate tables.

### Request Routing (`src/index.ts`)

The entry point splits traffic:
- `/api/slack/events` → `slack-cloudflare-workers` SDK (lazy-initialized)
- Everything else → Hono app (`src/app.ts`)

This split exists because the Slack SDK needs raw request handling for signature verification.

## Schema Changes

1. Edit `src/db/schema.ts`
2. Delete all files in `migrations/` and `migrations/meta/`
3. Run `mise run db:generate` to create a fresh migration
4. Run `mise run db:migrate` to apply locally
