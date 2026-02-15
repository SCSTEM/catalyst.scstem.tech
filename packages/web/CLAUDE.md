# Web Package (`@catalyst/web`)

React 19 + Vite SPA. Uses Hono's typed RPC client for end-to-end type safety with the worker API.

## Component Organization

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
