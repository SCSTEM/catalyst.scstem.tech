# Web Package (`@catalyst/web`)

React 19 + Vite SPA. TanStack Router for file-based routing, TanStack Query for data fetching, Hono RPC client for end-to-end type safety with the worker API.

## File-Based Routing (TanStack Router)

Routes live in `src/routes/` and are auto-discovered by the TanStack Router Vite plugin. The generated route tree is `src/routeTree.gen.ts` (excluded from biome, never edit manually).

Browse `src/routes/` for the current route tree — it is the source of truth. Key patterns:

- **`__root.tsx`** — `createRootRoute`. Wraps all routes with auth gate and DevTools.
- **`route.tsx` in a directory** — Layout route for that path segment. Contains shared UI and an `<Outlet />` for children.
- **`index.tsx` in a directory** — Index route (e.g. `/stats/` renders `stats/index.tsx`).
- **`$param.tsx`** — Dynamic segments. Access params via `Route.useParams()`.

### Key conventions

- **Navigation** — Use `useNavigate()` from `@tanstack/react-router`, not `window.location`.
- **Adding a route** — Create the file in `src/routes/`, export `Route` using `createFileRoute`. The Vite plugin auto-regenerates `routeTree.gen.ts`.

## Directory Layout

- `src/routes/` — TanStack Router file-based routes
- `src/components/` — Feature components (one per file, named export)
- `src/components/ui/` — shadcn/ui primitives (managed by the shadcn CLI, avoid manual edits)
- `src/hooks/` — Custom React hooks
- `src/lib/` — Utilities and the API client

## Import Conventions

Use the `@/` path alias for all cross-directory imports within `src/`. Only use relative imports for same-directory siblings. The alias is configured in both `tsconfig.json` and `vite.config.ts`.

## Data Fetching with TanStack Query

All API calls go through the typed Hono RPC client (`src/lib/api.ts`). Wrap each query in a custom hook in `src/hooks/queries.ts` — never use `useQuery` inline in components. Follow the existing hooks in that file for the pattern.

Key conventions:
- **All query hooks live in `src/hooks/queries.ts`** — one file, named exports
- **Cache keys are namespaced by feature** — e.g. `["stats", "rankings", "emojis"]`
- The `api.api.*` double-api is intentional — first `api` is the client instance, second is the `/api` route prefix
- Use `fetchJson(res)` from `@/lib/api` — it handles 401 session expiry and infers the return type
- For parameterized queries, include params in the key: `["stats", "users", userId, "emojis"]`

## Component Conventions

- **Discrete prop types** — Extract a named `FooProps` type unless the component has only 1–2 fields.
- **Ternary over `&&`** — Prefer `condition ? <X /> : null` over `condition && <X />`.
- **Use `cn()` for dynamic classes** — Never use template strings for className. Use `cn()` from `@/lib/utils`.

## Adding shadcn/ui Components

From the `packages/web` directory: `bunx shadcn@latest add <component-name>`. Check `src/components/ui/` for the current list.

## Styling

- **Tailwind v4** with the Vite plugin (no `tailwind.config.ts`)
- **Neobrutalist theme** defined via CSS custom properties in `src/index.css`
- Color space: `oklch()` — all custom colors use oklch values
- Fonts: Sora (sans), Inconsolata (mono)

When adding new components, follow the existing visual style: bold borders, box shadows, high-contrast colors.

## Development

The Vite dev server proxies all `/api/*` requests to `localhost:8787` (the worker dev server). Run both `dev:web` and `dev:worker` together, or use `bun run dev` to start both.
