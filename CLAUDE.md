# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the repo root via [mise](https://mise.jdx.dev/). Run `mise tasks` to list all available tasks with descriptions.

```bash
# Verify changes (run both before marking work done)
bun run typecheck        # tsc -b across all packages
bun run check            # biome lint + format (auto-fixes)
mise run test            # Vitest integration tests (auto-migrates local D1 first)
mise run verify          # All three above

# Development
mise run dev             # Both worker + web in parallel
mise run dev:worker      # Wrangler on :8787
mise run dev:web         # Vite on :5173

# Database
mise run db:generate             # Generate Drizzle migration from schema
mise run db:migrate              # Apply migrations to local D1 (default)
mise run db:migrate staging      # Apply migrations to staging D1
mise run db:migrate prod         # Apply migrations to production D1

# Backfill historical Slack data (requires SLACK_BOT_TOKEN env var)
mise run backfill                # Generate SQL + apply to local D1 (default)
mise run backfill staging        # Generate SQL + apply to staging D1
mise run backfill prod           # Generate SQL + apply to production D1

# Deploy (defaults to staging; requires clean git state)
# Pages auto-deploys via git — these handle worker + DB
mise run deploy:site             # Verify → migrate → deploy worker (staging)
mise run deploy:site prod        # Verify → migrate → deploy worker (production)
mise run deploy:site --pages     # Also force-deploy Pages
mise run deploy:worker           # Deploy worker only to staging
mise run deploy:worker prod      # Deploy worker only to production
```

### Environment targeting

- **Local is the default** for all D1 commands (`db:migrate`, `backfill`).
- **Staging is the default** for all deploy commands (`deploy:worker`, `deploy:web`).
- **Production** always requires explicit `prod` argument and an interactive confirmation.
- **Remote targets** (staging/prod) require a clean git working directory.

## Per-Package Documentation

Each package has its own `CLAUDE.md` with detailed patterns and conventions:

- **`packages/worker/CLAUDE.md`** — Adding routes, Drizzle patterns, schema changes
- **`packages/web/CLAUDE.md`** — Routing (TanStack Router), data fetching (TanStack Query), components, styling

## Architecture

Bun monorepo with two packages:

- **`packages/worker`** — Cloudflare Worker: Hono API + Slack event handler, backed by D1 (SQLite).
- **`packages/web`** — React 19 + Vite SPA. TanStack Router (file-based routing) + TanStack Query. Uses Hono's typed RPC client for end-to-end type safety with the worker API.

### Type-safe RPC chain

The worker exports `AppType` from `app.ts`. The web package references the worker via TypeScript project references (`tsconfig.json` → `references`), so `hono/client` infers request/response types across packages with zero codegen.

### Worker request routing

`src/index.ts` splits traffic by path:
- `/api/slack/events` → `slack-cloudflare-workers` SDK (signature verification, challenge, event dispatch)
- Everything else → Hono app (`src/app.ts`)

### Data model

Reactions use delete-on-remove (not event sourcing). Two pre-aggregated tables (`reaction_totals`, `user_emoji_counts`) are maintained inline during writes and rebuilt from scratch during backfill. Schema lives in `src/db/schema.ts`, migrations in `packages/worker/migrations/`.

### API routes

All routes are defined in `packages/worker/src/app.ts`. Each `.route()` call mounts a route file from `src/routes/`. Read `app.ts` to see the full list — it's the single source of truth. Don't duplicate the route list elsewhere.

## Conventions

- **Always use `bun`/`bunx`**, never `npm`/`npx`.
- **Biome** handles formatting and linting. A PostToolUse hook runs `bun run check && bun run typecheck` after every file edit.
- **No one-line if statements.** Always use braces on a new line, even for single-statement bodies.
- **Caret ranges with full semver** in package.json (e.g. `"^4.11.9"`, not `"^4"`).
- **`import type` for type-only imports.** Enforced by biome (`useImportType`). Use `import type { Foo }` when importing only types.
- **No unused imports.** Enforced by biome (`noUnusedImports`). Remove imports that are no longer used after refactoring.
- **`@/` alias for cross-directory imports** in the web package. Only use relative imports for same-directory siblings. See `packages/web/CLAUDE.md` for details.
- Schema changes require deleting all migrations and regenerating a single clean migration with `mise run db:generate` (fresh project, no production migration history to preserve yet).
