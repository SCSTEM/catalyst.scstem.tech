# Web Package (`@catalyst/web`)

React 19 + Vite SPA. TanStack Router for file-based routing, TanStack Query for data fetching, Hono RPC client for end-to-end type safety with the worker API.

## File-Based Routing (TanStack Router)

Routes live in `src/routes/` and are auto-discovered by the TanStack Router Vite plugin. The generated route tree is `src/routeTree.gen.ts` (excluded from biome, never edit manually).

### Route structure

Browse `src/routes/` for the current route tree — it is the source of truth. Key patterns:

- **`__root.tsx`** — `createRootRoute`. Wraps all routes with auth gate and DevTools.
- **`route.tsx` in a directory** — Layout route for that path segment. Contains shared UI (tabs, wrappers) and an `<Outlet />` for children.
- **`index.tsx` in a directory** — Index route (e.g. `/stats/` renders `stats/index.tsx`).
- **`$param.tsx`** — Dynamic segments. Access params via `Route.useParams()`.

### Key conventions

- **Navigation** — Use `useNavigate()` from `@tanstack/react-router`, not `window.location`. Always use fully-qualified paths (matching the file-system nesting).
- **Adding a route** — Create the file in `src/routes/`, export `Route` using `createFileRoute`. The Vite plugin auto-regenerates `routeTree.gen.ts`.

## Directory Layout

- `src/routes/` — TanStack Router file-based routes
- `src/components/` — Feature components (one per file, named export)
- `src/components/ui/` — shadcn/ui primitives (managed by the shadcn CLI, avoid manual edits)
- `src/hooks/` — Custom React hooks
- `src/lib/` — Utilities and the API client

## Import Conventions

Use the `@/` path alias for all imports within the `src/` directory. Only use relative imports for same-directory siblings.

```ts
// Good — cross-directory imports use @/
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useEmojiRankings } from "@/hooks/queries";

// Good — same-directory sibling
import { LeaderboardRow } from "./LeaderboardRow";

// Bad — relative path crossing directories
import { api } from "../../lib/api";
```

The `@/` alias is configured in both `tsconfig.json` and `vite.config.ts` and resolves to `./src/*`.

## Data Fetching with TanStack Query

All API calls go through the typed Hono RPC client (`src/lib/api.ts`). Wrap each query in a custom `useFoo` hook in `src/hooks/queries.ts` — never use `useQuery` inline in components.

```tsx
// src/hooks/queries.ts
export function useEmojiRankings() {
  return useQuery({
    queryKey: ["stats", "rankings", "emojis"],
    queryFn: async () => {
      const res = await api.api.rankings.emojis.$get();
      return fetchJson(res);
    },
  });
}

// In a component
import { useEmojiRankings } from "@/hooks/queries";

const { data, isPending, error } = useEmojiRankings();
```

Key conventions:
- **All query hooks live in `src/hooks/queries.ts`** — one file, named exports
- **Cache keys are namespaced by feature** — stats queries use `["stats", ...]` as the first segment to enable scoped invalidation
- After the namespace, `queryKey` mirrors the API path segments (e.g. `["stats", "rankings", "emojis"]`)
- The `api.api.*` double-api is intentional — first `api` is the client instance, second is the `/api` route prefix
- Use `fetchJson(res)` from `@/lib/api` — it handles 401 errors and infers the return type
- For parameterized queries, include params in the key: `["stats", "users", userId, "emojis"]`

## Component Conventions

- **Discrete prop types** — Extract a named `FooProps` type for component props unless the component has only 1–2 fields. Inline is fine for 1–2 fields.
- **Ternary over `&&`** — Prefer ternary expressions (`condition ? <X /> : null`) over `&&` (`condition && <X />`). Chain ternaries for multi-branch rendering (`loading ? ... : error ? ... : ...`).
- **Use `cn()` for dynamic classes** — Never use template strings for className. Use the `cn()` utility from `@/lib/utils` to compose conditional or dynamic class names.

```tsx
// Good
className={cn("flex items-center rounded-full", sizeClass)}

// Bad
className={`flex items-center rounded-full ${sizeClass}`}
```

## Adding shadcn/ui Components

From the `packages/web` directory:

```bash
bunx shadcn@latest add <component-name>
```

This respects the `components.json` config which maps:
- Components → `@/components/ui/`
- Utils → `@/lib/utils`
- Hooks → `@/hooks/`

Check `src/components/ui/` for the current list of installed components.

## Styling

- **Tailwind v4** with the Vite plugin (no `tailwind.config.ts`)
- **Neobrutalist theme** defined via CSS custom properties in `src/index.css`
- Color space: `oklch()` — all custom colors use oklch values
- Key design tokens: `--main` (accent yellow), `--background` (dark), `--foreground` (light), `--border` (black), `--shadow` (4px offset)
- Fonts: Sora (sans), Inconsolata (mono)

When adding new components, follow the existing visual style: bold borders, box shadows, high-contrast colors.

## Development

```bash
bun run dev:web    # Vite on :5173, proxies /api to :8787
```

The Vite dev server proxies all `/api/*` requests to `localhost:8787` (the worker dev server). Run both `dev:web` and `dev:worker` together, or use `bun run dev` to start both.
