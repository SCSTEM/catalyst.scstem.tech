# Web Package (`@catalyst/web`)

React 19 + Vite SPA. TanStack Router for file-based routing, TanStack Query for data fetching, Hono RPC client for end-to-end type safety with the worker API.

## File-Based Routing (TanStack Router)

Routes live in `src/routes/` and are auto-discovered by the TanStack Router Vite plugin. The generated route tree is `src/routeTree.gen.ts` (excluded from biome, never edit manually).

### Route structure

```
src/routes/
├── __root.tsx           # Root layout (auth gate, devtools)
├── _app.tsx             # Pathless layout (tabs, card wrapper, refresh button)
└── _app/
    ├── index.tsx        # / → redirects to /emojis
    ├── emojis/
    │   ├── index.tsx    # /emojis — emoji leaderboard
    │   └── $emoji.tsx   # /emojis/:emoji — emoji detail
    ├── users/
    │   ├── index.tsx    # /users — user leaderboard
    │   └── $userId.tsx  # /users/:userId — user detail
    └── trends.tsx       # /trends — trend charts
```

### Key conventions

- **`__root.tsx`** — `createRootRoute`. Wraps all routes with auth gate and TanStack Router DevTools.
- **`_app.tsx`** — Pathless layout route (`createFileRoute("/_app")`). Contains the tab navigation and card wrapper shared by all pages.
- **`$param.tsx`** — Dynamic segments. Access params via `Route.useParams()`.
- **Navigation** — Use `useNavigate()` from `@tanstack/react-router`, not `window.location` or state-based navigation.
- **Adding a route** — Create the file in `src/routes/`, export `Route` using `createFileRoute`. The Vite plugin auto-regenerates `routeTree.gen.ts`.

### Route file template

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/my-page")({
  component: MyPage,
});

function MyPage() {
  return <div>...</div>;
}
```

### Route with params

```tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/items/$itemId")({
  component: ItemDetail,
});

function ItemDetail() {
  const { itemId } = Route.useParams();
  const navigate = useNavigate();
  // ...
}
```

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
import { useEmojiMap } from "@/hooks/useEmojiMap";

// Good — same-directory sibling
import { LeaderboardRow } from "./LeaderboardRow";

// Bad — relative path crossing directories
import { api } from "../../lib/api";
```

The `@/` alias is configured in both `tsconfig.json` and `vite.config.ts` and resolves to `./src/*`.

## Data Fetching with TanStack Query

All API calls go through the typed Hono RPC client (`src/lib/api.ts`). The pattern:

```tsx
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const { data, isPending, error } = useQuery({
  queryKey: ["rankings", "emojis"],
  queryFn: async () => {
    const res = await api.api.rankings.emojis.$get();
    return await res.json();
  },
});
```

Key conventions:
- `queryKey` mirrors the API path segments (e.g. `["rankings", "emojis"]`)
- The `api.api.*` double-api is intentional — first `api` is the client instance, second is the `/api` route prefix
- Always `await res.json()` — the return type is automatically inferred from the worker's response
- For parameterized queries, include params in the key: `["users", userId, "emojis"]`

## Adding shadcn/ui Components

From the `packages/web` directory:

```bash
bunx shadcn@latest add <component-name>
```

This respects the `components.json` config which maps:
- Components → `@/components/ui/`
- Utils → `@/lib/utils`
- Hooks → `@/hooks/`

Currently installed: button, card, chart, input-otp, tabs, tooltip

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
