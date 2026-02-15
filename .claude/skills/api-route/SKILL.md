---
name: api-route
description: Add a new API route to the worker with a corresponding type-safe client in the web package.
---

# Adding a New API Route

Follow these steps to add a new API route end-to-end.

## Step 1: Create the Route File

Create `packages/worker/src/routes/<name>.ts`:

```ts
import { Hono } from "hono";

type Bindings = {
  DB: D1Database;
  // Add other bindings as needed (see packages/worker/src/app.ts for the full set)
};

export const <name>Route = new Hono<{ Bindings: Bindings }>()
  .get("/endpoint", async (c) => {
    const db = drizzle(c.env.DB);
    // ... your query logic ...
    return c.json(result);
  });
```

### Key patterns:

- **One route file per feature domain** (e.g. `rankings.ts`, `analytics.ts`, `users.ts`)
- **Declare a local `Bindings` type** with only what the route needs
- **Create Drizzle per-request**: `const db = drizzle(c.env.DB)` — never at module scope
- **Use zod validation** for query params and request bodies:
  ```ts
  import { zValidator } from "@hono/zod-validator";
  import { z } from "zod";

  .get("/items", zValidator("query", z.object({ limit: z.string().optional() })), async (c) => {
    const { limit } = c.req.valid("query");
  })
  ```
- **Use the shared `limitQuery`** from `./util.ts` for standard pagination

## Step 2: Mount in app.ts

Edit `packages/worker/src/app.ts`:

```ts
import { <name>Route } from "./routes/<name>";

// Add to the chain (BEFORE the export):
  .route("/api/<name>", <name>Route)
```

**IMPORTANT:** The route MUST be chained in the same expression as the existing routes. The `AppType` export captures the full chain — if you break it into separate statements, the web package loses type inference for the new route.

## Step 3: Consume in the Web Package

The new route is immediately available via the typed RPC client. No codegen needed.

```tsx
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const { data, isPending } = useQuery({
  queryKey: ["<name>", "endpoint"],
  queryFn: async () => {
    const res = await api.api.<name>.endpoint.$get();
    return await res.json();
  },
});
```

For routes with parameters:

```tsx
// Path params: /api/users/:userId/emojis
const res = await api.api.users[":userId"].emojis.$get({
  param: { userId: "U001" },
});

// Query params: /api/rankings/emojis?limit=10
const res = await api.api.rankings.emojis.$get({
  query: { limit: "10" },
});

// POST body: /api/auth/verify
const res = await api.api.auth.verify.$post({
  json: { password: "123456", turnstileToken: "tok" },
});
```

If the new API route also needs a new page, create a TanStack Router route file. See the `tanstack-router` skill for details.

## Step 4: Add a Test

Add test cases to `packages/worker/test/api.test.ts`:

```ts
describe("GET /api/<name>/endpoint", () => {
  it("returns expected data", async () => {
    const res = await SELF.fetch("http://localhost/api/<name>/endpoint");
    expect(res.status).toBe(200);
    const data = await res.json();
    // assertions...
  });
});
```

If the route needs seed data, add it to `packages/worker/test/seed.ts`.

## Step 5: Update Mock Data (for preview deploys)

Add a mock response in `packages/web/src/lib/mock-data.ts`:

```ts
// Add to the routes array:
{
  pattern: /\/api\/<name>\/endpoint$/,
  handler: () => ({ /* mock response matching your route's return type */ }),
},
```

## Checklist

- [ ] Route file created in `packages/worker/src/routes/`
- [ ] Route mounted in `packages/worker/src/app.ts` (chained, not separate)
- [ ] Web package can call the route with full type inference
- [ ] Test added in `packages/worker/test/api.test.ts`
- [ ] Mock data added in `packages/web/src/lib/mock-data.ts`
- [ ] `bun run check && bun run typecheck && bun run test` passes
