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
    if (!payload.item?.channel || !payload.item?.ts) {
      return;
    }
    try {
      await addReaction(env.DB, {
        userId: payload.user,
        emoji: payload.reaction,
        channelId: payload.item.channel,
        messageTs: payload.item.ts,
      });
      console.log("reaction_added", payload.reaction, payload.user);
    } catch (e) {
      console.error("reaction_added failed", e);
    }
  });

  app.event("reaction_removed", async ({ payload }) => {
    if (!payload.item?.channel || !payload.item?.ts) {
      return;
    }
    try {
      await removeReaction(env.DB, {
        userId: payload.user,
        emoji: payload.reaction,
        channelId: payload.item.channel,
        messageTs: payload.item.ts,
      });
      console.log("reaction_removed", payload.reaction, payload.user);
    } catch (e) {
      console.error("reaction_removed failed", e);
    }
  });

  return app;
}
