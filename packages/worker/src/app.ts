import { Hono } from "hono";
import { cors } from "hono/cors";
import { analyticsRoute } from "./routes/analytics";
import { authRoute } from "./routes/auth";
import { emojisRoute } from "./routes/emojis";
import { rankingsRoute } from "./routes/rankings";
import { usersRoute } from "./routes/users";

type Bindings = {
  DB: D1Database;
  SLACK_SIGNING_SECRET: string;
  SLACK_BOT_TOKEN: string;
  SITE_PASSWORD: string;
  TURNSTILE_SECRET_KEY: string;
};

const ALLOWED_ORIGINS = new Set([
  "https://catalyst.scstem.org",
  "http://localhost:5173",
]);

const app = new Hono<{ Bindings: Bindings }>()
  .use(
    "/api/*",
    cors({
      origin: (origin) => (ALLOWED_ORIGINS.has(origin) ? origin : ""),
      allowMethods: ["GET", "POST", "OPTIONS"],
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
  .route("/api/rankings", rankingsRoute)
  .route("/api/emojis", emojisRoute)
  .route("/api/users", usersRoute)
  .route("/api/analytics", analyticsRoute);

export type AppType = typeof app;

export default app;
