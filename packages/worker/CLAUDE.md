# Worker Package (`@catalyst/worker`)

Cloudflare Worker providing the Hono API and Slack event handler, backed by D1 (SQLite).

## Adding a New API Route

1. Create a new route file in `src/routes/`. Follow the pattern of existing routes — they all use `Hono<{ Bindings: Env }>` and create Drizzle instances per-request.
2. Mount it in `src/app.ts` via `.route()`. The exported `AppType` automatically picks up the new route — the web package gets type-safe RPC for free.

## Key Patterns

### Bindings

All route files use the global `Env` type. D1 bindings come from `wrangler.jsonc`, secrets are typed in `env.d.ts` via the `Cloudflare.Env` namespace. Run `wrangler types` to regenerate `worker-configuration.d.ts`.

In local dev, `c.env.*` values are bridged from the process env by `CLOUDFLARE_INCLUDE_PROCESS_ENV=true` (set in the root `mise.toml`). Add new local-dev secrets to `mise.toml` (committed test defaults) or `mise.local.toml` (per-dev overrides) — not `.dev.vars`. Production secrets are managed via `wrangler secret put` per environment. See the root `README.md` for the full table.

### Drizzle Queries

Always create the Drizzle instance per-request from the D1 binding (`drizzle(c.env.DB)`). Never store `db` at module scope — the D1 binding changes per-request in Workers.

### Query Validation

Use `@hono/zod-validator` for query/body validation. See `src/routes/util.ts` for shared schemas (e.g. `limitQuery`). Follow the existing route files for usage patterns.

### Batch Endpoints

Resources are fetched by collection endpoints that accept N ids — never a separate singular `/:id` route. A request for one item is just a batch of one.

- Path: `GET /api/<resource>/<collection>?ids=a,b,c`
- Validate with `idsQuery` (or `idsLimitSeasonQuery`) from `src/routes/util.ts` — comma-separated, trimmed, de-duplicated, capped at `MAX_BATCH_IDS`.
- Always respond with `Record<id, Result>`, keyed for O(1) client lookup. Pre-seed every requested id so missing data is an empty/null value, not an absent key.
- Use `GET`. Switch a specific endpoint to `POST` only if its ids can contain `,`, or it needs a high cap with long ids.
- For per-group "top N" (e.g. top reactors per emoji), rank rows with a `row_number() over (partition by ...)` window function in a CTE, then filter `rn <= limit` — see `GET /api/emojis/users`.

Existing batch endpoints: `/api/emojis/profiles`, `/api/emojis/users`, `/api/users/emojis`.

### Pre-aggregated Tables

`reaction_totals` and `user_emoji_counts` are maintained inline during writes (see `src/lib/db.ts`). Writes use `.returning()` to detect duplicates before updating aggregates. Do NOT query `reactions` for counts — use the aggregate tables.

### Request Routing (`src/index.ts`)

The entry point splits traffic:
- `/api/slack/events` → `slack-cloudflare-workers` SDK (lazy-initialized)
- Everything else → Hono app (`src/app.ts`)

This split exists because the Slack SDK needs raw request handling for signature verification.

### Workflows

Durable multi-step tasks use [Cloudflare Workflows](https://developers.cloudflare.com/workflows/). To add a new workflow:

1. Create a class in `src/workflows/` extending `WorkflowEntrypoint<Env, Params>`
2. Export it from `src/index.ts`
3. Declare it in `wrangler.jsonc` under `workflows` (binding, name, class_name)
4. Run `wrangler types` to regenerate `worker-configuration.d.ts` with the new `Env` binding
5. Trigger it via the env binding: `env.MY_WORKFLOW.create({ params: { ... } })`

Existing workflow: `BackfillChannelWorkflow` — triggered by the `/backfill` slash command.

## Schema Changes

1. Edit `src/db/schema.ts`
2. Delete all files in `migrations/` and `migrations/meta/`
3. Run `mise run db:generate` to create a fresh migration
4. Run `mise run db:migrate` to apply locally
