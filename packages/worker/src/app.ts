import { Hono } from "hono";
import { cors } from "hono/cors";
import { emojisRoute } from "./routes/emojis";
import { rankingsRoute } from "./routes/rankings";
import { usersRoute } from "./routes/users";

type Bindings = {
  DB: D1Database;
  SLACK_SIGNING_SECRET: string;
  SLACK_BOT_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>()
  .use(
    "/api/*",
    cors({
      origin: ["https://catalyst.scstem.org", "http://localhost:5173"],
      allowMethods: ["GET", "OPTIONS"],
      maxAge: 86400,
    }),
  )
  .get("/api/health", (c) => c.json({ ok: true }))
  .route("/api/rankings", rankingsRoute)
  .route("/api/emojis", emojisRoute)
  .route("/api/users", usersRoute);

export type AppType = typeof app;

export default app;
