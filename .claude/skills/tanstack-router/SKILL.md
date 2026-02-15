---
name: tanstack-router
description: Add new pages and routes using TanStack Router's file-based routing system.
---

# Adding Routes with TanStack Router

This project uses TanStack Router with file-based routing. The Vite plugin (`@tanstack/router-plugin/vite`) auto-discovers route files in `packages/web/src/routes/` and generates `routeTree.gen.ts`. Never edit the generated file.

## Route Structure

```
src/routes/
├── __root.tsx           # Root layout (auth gate, router devtools)
├── _app.tsx             # Pathless layout (tab nav, card wrapper)
└── _app/
    ├── index.tsx        # / → redirects to /emojis
    ├── emojis/
    │   ├── index.tsx    # /emojis
    │   └── $emoji.tsx   # /emojis/:emoji
    ├── users/
    │   ├── index.tsx    # /users
    │   └── $userId.tsx  # /users/:userId
    └── trends.tsx       # /trends
```

### Key concepts

- **`__root.tsx`** — Root route wrapping all pages. Contains the auth gate and `<TanStackRouterDevtools>`.
- **`_app.tsx`** — Pathless layout (underscore prefix = no URL segment). Provides shared tab navigation and card wrapper. All page routes are children of `_app/`.
- **`$param.tsx`** — Dynamic route segment. The `$` prefix creates a URL parameter.
- **`index.tsx`** — Index route for a directory (matches the parent path exactly).

## Step 1: Create the Route File

Create a new file in `packages/web/src/routes/_app/`:

### Simple page (no params)

Create `packages/web/src/routes/_app/<name>.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/<name>")({
  component: MyPage,
});

function MyPage() {
  return <div>Page content</div>;
}
```

### Page with dynamic param

Create `packages/web/src/routes/_app/<feature>/$<paramName>.tsx`:

```tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/<feature>/$<paramName>")({
  component: DetailPage,
});

function DetailPage() {
  const { <paramName> } = Route.useParams();
  const navigate = useNavigate();

  return (
    <div>
      <button onClick={() => navigate({ to: "/<feature>" })}>Back</button>
      <p>Viewing: {<paramName>}</p>
    </div>
  );
}
```

### Directory with index + detail

For a feature with both a list and detail view, create a directory:

```
src/routes/_app/<feature>/
├── index.tsx        # /<feature> — list view
└── $<param>.tsx     # /<feature>/:param — detail view
```

## Step 2: Add Tab Navigation (if needed)

If the new page should appear in the main tab bar, update `packages/web/src/routes/_app.tsx`:

```tsx
const tabs = [
  { value: "emojis", to: "/emojis", label: "Top Reactions" },
  { value: "users", to: "/users", label: "Top Reactors" },
  { value: "trends", to: "/trends", label: "Trends" },
  { value: "<name>", to: "/<name>", label: "My New Tab" },  // Add here
] as const;
```

Also update `getActiveTab()` in the same file to recognize the new path:

```tsx
function getActiveTab(pathname: string): string {
  if (pathname.startsWith("/<name>")) {
    return "<name>";
  }
  // ... existing checks ...
}
```

## Step 3: Navigation Between Routes

Use `useNavigate` for programmatic navigation:

```tsx
import { useNavigate } from "@tanstack/react-router";

const navigate = useNavigate();

// Simple navigation
navigate({ to: "/emojis" });

// With params
navigate({ to: "/emojis/$emoji", params: { emoji: "fire" } });

// With search params
navigate({ to: "/emojis", search: { sort: "count" } });
```

For links in JSX, use `<Link>`:

```tsx
import { Link } from "@tanstack/react-router";

<Link to="/emojis/$emoji" params={{ emoji: "fire" }}>
  View Fire
</Link>
```

## Step 4: Route Tree Regeneration

The Vite plugin regenerates `routeTree.gen.ts` automatically when:
- The dev server is running (`bun run dev:web`)
- You run a build (`bun run build`)

If the dev server isn't running, start it briefly to regenerate, or run `bun run build`.

**Do not manually edit `routeTree.gen.ts`.** It's excluded from biome in `biome.json`.

## Checklist

- [ ] Route file created in `packages/web/src/routes/_app/`
- [ ] Route string in `createFileRoute()` matches the file path (e.g. `/_app/my-page`)
- [ ] If tabbed: added to `tabs` array and `getActiveTab()` in `_app.tsx`
- [ ] Navigation uses `useNavigate()` or `<Link>`, not `window.location`
- [ ] `routeTree.gen.ts` regenerated (start dev server or build)
- [ ] `bun run check && bun run typecheck` passes
