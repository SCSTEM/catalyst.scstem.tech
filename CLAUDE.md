# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the repo root:

```bash
# Verify changes (run both before marking work done)
bun run typecheck        # tsc -b across all packages
bun run check            # biome lint + format (auto-fixes)
bun run test             # Vitest integration tests (worker API)

# Development
bun run dev              # Both worker + web in parallel
bun run dev:worker       # Wrangler on :8787
bun run dev:web          # Vite on :5173

# Build & deploy
bun run build            # Vite production build (web)
bun run deploy           # Deploy worker to Cloudflare

# Database
bun run db:generate          # Generate Drizzle migration from schema
bun run db:migrate:local     # Apply migrations to local D1
bun run db:migrate:remote    # Apply migrations to production D1

# Seed local database with sample data (no Slack token needed)
bun run db:seed

# Backfill historical Slack data
SLACK_BOT_TOKEN=xoxb-... bun run backfill
```

## Per-Package Documentation

Each package has its own `CLAUDE.md` with detailed patterns and conventions:

- **`packages/worker/CLAUDE.md`** — Adding routes, Drizzle patterns, Bindings, schema changes
- **`packages/web/CLAUDE.md`** — Component organization, TanStack Query patterns, shadcn/ui, styling

## Architecture

Bun monorepo with two packages:

- **`packages/worker`** — Cloudflare Worker: Hono API + Slack event handler, backed by D1 (SQLite). Deployed to `api.catalyst.scstem.org`.
- **`packages/web`** — React 19 + Vite SPA. Uses Hono's typed RPC client for end-to-end type safety with the worker API.

### Type-safe RPC chain

The worker exports `AppType` from `app.ts`. The web package references the worker via TypeScript project references (`tsconfig.json` → `references`), so `hono/client` infers request/response types across packages with zero codegen.

### Worker request routing

`src/index.ts` splits traffic by path:
- `/slack/events` → `slack-cloudflare-workers` SDK (signature verification, challenge, event dispatch)
- Everything else → Hono app (`src/app.ts`)

### Data model

Reactions use delete-on-remove (not event sourcing). Two pre-aggregated tables (`reaction_totals`, `user_emoji_counts`) are maintained inline during writes and rebuilt from scratch during backfill. Schema lives in `src/db/schema.ts`, migrations in `packages/worker/migrations/`.

### API routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/rankings/emojis` | Top emojis by reaction count |
| GET | `/api/rankings/users` | Top users by total reactions |
| GET | `/api/emojis` | Custom emoji name → image URL map |
| GET | `/api/emojis/:emoji/users` | Who uses a specific emoji |
| GET | `/api/users/:userId/emojis` | A user's emoji breakdown |
| GET | `/api/analytics/emoji-trends` | Emoji usage over time |
| GET | `/api/analytics/user-trends` | User activity over time |
| GET | `/api/health` | Health check |
| POST | `/api/auth/verify` | Password + Turnstile verification |
| POST | `/slack/events` | Slack webhook (SDK-handled) |

## Conventions

- **Always use `bun`/`bunx`**, never `npm`/`npx`.
- **Biome** handles formatting and linting. A PostToolUse hook runs `bun run check && bun run typecheck` after every file edit.
- **No one-line if statements.** Always use braces on a new line, even for single-statement bodies.
- **Caret ranges with full semver** in package.json (e.g. `"^4.11.9"`, not `"^4"`).
- **`import type` for type-only imports.** Enforced by biome (`useImportType`). Use `import type { Foo }` when importing only types.
- **No unused imports.** Enforced by biome (`noUnusedImports`). Remove imports that are no longer used after refactoring.
- **`@/` alias for cross-directory imports** in the web package. Only use relative imports for same-directory siblings. See `packages/web/CLAUDE.md` for details.
- Schema changes require deleting all migrations and regenerating a single clean migration with `bun run db:generate` (fresh project, no production migration history to preserve yet).
