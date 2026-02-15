# Worker Package (`@catalyst/worker`)

Cloudflare Worker providing the Hono API and Slack event handler, backed by D1 (SQLite).

## Adding a New API Route

1. Create a new file in `src/routes/` (e.g. `src/routes/myFeature.ts`):

```ts
import { Hono } from "hono";

type Bindings = {
  DB: D1Database;
};

export const myFeatureRoute = new Hono<{ Bindings: Bindings }>()
  .get("/endpoint", async (c) => {
    const db = drizzle(c.env.DB);
    // ... query ...
    return c.json(result);
  });
```

2. Mount in `src/app.ts`:

```ts
import { myFeatureRoute } from "./routes/myFeature";
// ...
.route("/api/my-feature", myFeatureRoute)
```

The exported `AppType` in `app.ts` automatically picks up the new route — the web package gets type-safe RPC for free.

## Key Patterns

### Bindings

Every route file declares its own `type Bindings` with the D1Database and any secrets it needs. This keeps routes self-contained. The full set of bindings is in `src/app.ts`.

Available bindings (defined in `wrangler.jsonc` + secrets):
- `DB` — D1Database
- `SLACK_SIGNING_SECRET` — Slack webhook verification
- `SLACK_BOT_TOKEN` — Slack API calls
- `SITE_PASSWORD` — Site access password
- `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile captcha

### Drizzle Queries

Always create the Drizzle instance per-request from the D1 binding:

```ts
const db = drizzle(c.env.DB);
```

Never store `db` at module scope — the D1 binding changes per-request in Workers.

### Query Validation

Use `@hono/zod-validator` for query/body validation. See `src/routes/util.ts` for the shared `limitQuery` schema.

```ts
import { zValidator } from "@hono/zod-validator";
import { limitQuery } from "./util";

.get("/items", zValidator("query", limitQuery), async (c) => {
  const limit = c.req.valid("query")?.limit ?? 50;
  // ...
})
```

### Pre-aggregated Tables

`reaction_totals` and `user_emoji_counts` are maintained inline during writes (see `src/lib/db.ts`). When a reaction is added, both the raw `reactions` table and the aggregate tables are updated in a single `db.batch()` call. Do NOT query `reactions` for counts — use the aggregate tables.

### Request Routing (`src/index.ts`)

The entry point splits traffic:
- `/slack/events` → `slack-cloudflare-workers` SDK (lazy-initialized)
- Everything else → Hono app (`src/app.ts`)

This split exists because the Slack SDK needs raw request handling for signature verification.

## Schema Changes

This project is pre-production, so there's no migration history to preserve:

1. Edit `src/db/schema.ts`
2. Delete all files in `migrations/` and `migrations/meta/`
3. Run `bun run db:generate` to create a fresh migration
4. Run `bun run db:migrate:local` to apply locally
5. Re-seed with `bun run db:seed` if needed

## Testing Locally

```bash
bun run db:migrate:local   # Create/update local D1 schema
bun run db:seed            # Populate with sample data
bun run dev:worker         # Start on :8787
```

The local D1 database lives at `packages/worker/.wrangler/state/v3/d1/`.
