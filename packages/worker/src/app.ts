import { Hono } from "hono";
import { cors } from "hono/cors";
import { verifySessionToken } from "./lib/auth";
import { analyticsRoute } from "./routes/analytics";
import { authRoute } from "./routes/auth";
import { emojisRoute } from "./routes/emojis";
import { rankingsRoute } from "./routes/rankings";
import { usersRoute } from "./routes/users";

type Bindings = {
  DB: D1Database;
  SLACK_SIGNING_SECRET: string;
  SITE_PASSWORD: string;
  TURNSTILE_SECRET_KEY: string;
  SESSION_TTL_HOURS: string;
};

const ALLOWED_ORIGINS = new Set([
  "https://catalyst.scstem.tech",
  "http://localhost:5173",
]);

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.has(origin)) {
    return true;
  }
  // Allow Cloudflare Pages preview deployment origins
  if (
    origin.startsWith("https://") &&
    origin.endsWith(".catalyst-scstem-tech.pages.dev")
  ) {
    return true;
  }
  return false;
}

const app = new Hono<{ Bindings: Bindings }>()
  .use(
    "/api/*",
    cors({
      origin: (origin) => (isAllowedOrigin(origin) ? origin : ""),
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      maxAge: 86400,
    }),
  )
  .use("/api/*", async (c, next) => {
    await next();
    if (!c.res.headers.has("Cache-Control")) {
      c.res.headers.set("Cache-Control", "public, max-age=60");
    }
  })
  .get("/api/health", (c) => c.json({ ok: true }))
  .route("/api/auth", authRoute)
  .use("/api/*", async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const token = header.slice(7);
    const ttl = Number(c.env.SESSION_TTL_HOURS) || 0;
    const valid = await verifySessionToken(c.env.SITE_PASSWORD, token, ttl);
    if (!valid) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    await next();
  })
  .route("/api/rankings", rankingsRoute)
  .route("/api/emojis", emojisRoute)
  .route("/api/users", usersRoute)
  .route("/api/analytics", analyticsRoute);

export type AppType = typeof app;

export default app;
