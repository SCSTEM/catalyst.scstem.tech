import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { verifySessionToken } from "./lib/auth";
import { analyticsRoute } from "./routes/analytics";
import { authRoute } from "./routes/auth";
import { emojisRoute } from "./routes/emojis";
import { rankingsRoute } from "./routes/rankings";
import { usersRoute } from "./routes/users";

const ALLOWED_ORIGINS = new Set(["https://catalyst.scstem.tech"]);

if (!env.PRODUCTION) {
  ALLOWED_ORIGINS.add("http://localhost:5173");
  ALLOWED_ORIGINS.add("https://staging.catalyst.scstem.tech");
}

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.has(origin)) {
    return true;
  }
  // Allow Cloudflare Pages preview deployment origins
  if (
    !env.PRODUCTION &&
    origin.startsWith("https://") &&
    origin.endsWith(".catalyst-scstem-tech.pages.dev")
  ) {
    return true;
  }

  return false;
}

const app = new Hono<{ Bindings: Env }>()
  .use("/api/*", logger())
  .use("/api/*", secureHeaders())
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
  .use(
    "/api/*",
    bearerAuth({
      verifyToken: async (token, c) => {
        const ttl = Number(c.env.SESSION_TTL_HOURS) || 0;
        return verifySessionToken(c.env.SITE_PASSWORD, token, ttl);
      },
    }),
  )
  .route("/api/rankings", rankingsRoute)
  .route("/api/emojis", emojisRoute)
  .route("/api/users", usersRoute)
  .route("/api/analytics", analyticsRoute);

export type AppType = typeof app;

export default app;
