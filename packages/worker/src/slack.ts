import { SlackApp } from "slack-cloudflare-workers";
import { addReaction, removeReaction } from "./lib/db";

type Env = {
  SLACK_SIGNING_SECRET: string;
  SLACK_BOT_TOKEN: string;
  DB: D1Database;
};

export function createSlackApp(env: Env): SlackApp<Env> {
  const app = new SlackApp({ env });

  // ── Slash command ──

  app.command("/catalyst", async () => {
    return ":wave:";
  });

  // ── Events ──

  app.event("reaction_added", async ({ payload }) => {
    await addReaction(env.DB, {
      userId: payload.user,
      emoji: payload.reaction,
      channelId: payload.item?.channel ?? "",
      messageTs: payload.item?.ts ?? "",
    });
  });

  app.event("reaction_removed", async ({ payload }) => {
    await removeReaction(env.DB, {
      userId: payload.user,
      emoji: payload.reaction,
      channelId: payload.item?.channel ?? "",
      messageTs: payload.item?.ts ?? "",
    });
  });

  return app;
}
