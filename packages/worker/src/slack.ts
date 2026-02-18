import { SlackApp } from "slack-cloudflare-workers";
import {
  addEmoji,
  addReaction,
  removeEmoji,
  removeReaction,
  renameEmoji,
} from "./lib/db";

export function createSlackApp(env: Env) {
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

  app.event("emoji_changed", async ({ payload }) => {
    try {
      if (payload.subtype === "add" && payload.name && payload.value) {
        if (payload.value.startsWith("alias:")) {
          return;
        }
        await addEmoji(env.DB, payload.name, payload.value);
        console.log("emoji_added", payload.name);
      } else if (payload.subtype === "remove" && payload.names) {
        for (const name of payload.names) {
          await removeEmoji(env.DB, name);
        }
        console.log("emoji_removed", payload.names.join(", "));
      } else if (
        payload.subtype === "rename" &&
        payload.old_name &&
        payload.new_name
      ) {
        await renameEmoji(env.DB, payload.old_name, payload.new_name);
        console.log("emoji_renamed", payload.old_name, "→", payload.new_name);
      }
    } catch (e) {
      console.error("emoji_changed failed", e);
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
