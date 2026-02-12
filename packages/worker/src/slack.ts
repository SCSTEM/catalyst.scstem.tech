import { SlackApp } from "slack-cloudflare-workers";
import { recordReaction } from "./lib/db";

type Env = {
  SLACK_SIGNING_SECRET: string;
  SLACK_BOT_TOKEN: string;
  DB: D1Database;
};

export function createSlackApp(env: Env) {
  const app = new SlackApp({ env });

  // ── Slash command ──

  app.command("/catalyst", async () => {
    return ":wave:";
  });

  // ── Events ──

  app.event("reaction_added", async ({ payload }) => {
    await recordReaction(env.DB, {
      userId: payload.user,
      emoji: payload.reaction,
      channelId: payload.item?.channel ?? "",
      messageTs: payload.item?.ts ?? "",
      eventTs: payload.event_ts ?? "",
      isRemoval: false,
    });
  });

  app.event("reaction_removed", async ({ payload }) => {
    await recordReaction(env.DB, {
      userId: payload.user,
      emoji: payload.reaction,
      channelId: payload.item?.channel ?? "",
      messageTs: payload.item?.ts ?? "",
      eventTs: payload.event_ts ?? "",
      isRemoval: true,
    });
  });

  return app;
}
