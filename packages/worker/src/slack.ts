import { SlackApp } from "slack-cloudflare-workers";
import {
  addEmoji,
  addReaction,
  removeEmoji,
  removeMessageReactions,
  removeReaction,
  renameEmoji,
} from "./lib/db";
import { slackApi } from "./lib/slack-api";

export function createSlackApp(env: Env) {
  const app = new SlackApp({ env });

  // ── Slash commands ──

  app.command("/catalyst", async () => {
    return ":wave:";
  });

  app.command("/backfill", async ({ payload, context }) => {
    try {
      await context.client.views.open({
        trigger_id: payload.trigger_id,
        view: {
          type: "modal",
          callback_id: "backfill-modal",
          title: { type: "plain_text", text: "Backfill Reactions" },
          submit: { type: "plain_text", text: "Start" },
          close: { type: "plain_text", text: "Cancel" },
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "Fetch historical reactions for this channel back to a specific date.",
              },
            },
            {
              type: "input",
              block_id: "date_block",
              element: {
                type: "datepicker",
                action_id: "backfill_date",
                placeholder: {
                  type: "plain_text",
                  text: "Select a date",
                },
              },
              label: { type: "plain_text", text: "Backfill since" },
            },
          ],
          private_metadata: JSON.stringify({
            channelId: payload.channel_id,
            userId: payload.user_id,
          }),
        },
      });
    } catch (e) {
      console.error("Failed to open backfill modal", e);
      return "Failed to open the backfill modal. Please try again.";
    }
    return "";
  });

  app.viewSubmission(
    "backfill-modal",
    async () => {
      return { response_action: "clear" };
    },
    async ({ payload }) => {
      if (!env.BACKFILL_WORKFLOW) {
        console.error("BACKFILL_WORKFLOW binding not configured");
        return;
      }

      const dateValue =
        payload.view.state.values.date_block?.backfill_date?.selected_date;
      const metadata = JSON.parse(payload.view.private_metadata) as {
        channelId: string;
        userId: string;
      };

      if (!dateValue || !metadata.channelId) {
        console.error("Missing date or channel in backfill submission");
        return;
      }

      const since = new Date(dateValue);
      if (Number.isNaN(since.getTime()) || since > new Date()) {
        console.error("Invalid or future date in backfill submission");
        return;
      }

      // Look up the channel name for user-friendly messages
      let channelName = metadata.channelId;
      try {
        const data = await slackApi<{ channel?: { name?: string } }>(
          env.SLACK_BOT_TOKEN,
          "conversations.info",
          { channel: metadata.channelId },
        );
        if (data.channel?.name) {
          channelName = data.channel.name;
        }
      } catch {
        // Fall back to channel ID
      }

      try {
        await env.BACKFILL_WORKFLOW.create({
          params: {
            channelId: metadata.channelId,
            since: dateValue,
            channelName,
            userId: metadata.userId,
          },
        });
        await slackApi(env.SLACK_BOT_TOKEN, "chat.postEphemeral", {
          channel: metadata.channelId,
          user: metadata.userId,
          text: `Starting backfill for #${channelName} since ${dateValue}. This may take a few minutes...`,
        });
      } catch (e) {
        console.error("Failed to start backfill workflow", e);
      }
    },
  );

  // ── Events ──

  app.event("reaction_added", async ({ payload }) => {
    if (payload.item?.type !== "message") {
      return;
    }
    if (!payload.item.channel || !payload.item.ts) {
      console.warn("reaction_added: message item missing channel/ts", payload);
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
      console.error("reaction_added: error", e);
    }
  });

  app.event("emoji_changed", async ({ payload }) => {
    try {
      if (payload.subtype === "add" && payload.name && payload.value) {
        if (payload.value.startsWith("alias:")) {
          return;
        }
        await addEmoji(env.DB, payload.name, payload.value);
        console.log("emoji_changed: add", payload.name);
      } else if (payload.subtype === "remove" && payload.names) {
        for (const name of payload.names) {
          await removeEmoji(env.DB, name);
        }
        console.log("emoji_changed: remove", payload.names.join(", "));
      } else if (
        payload.subtype === "rename" &&
        payload.old_name &&
        payload.new_name
      ) {
        await renameEmoji(env.DB, payload.old_name, payload.new_name);
        console.log(
          "emoji_changed: rename",
          payload.old_name,
          "→",
          payload.new_name,
        );
      }
    } catch (e) {
      console.error("emoji_changed: error", e);
    }
  });

  app.event("reaction_removed", async ({ payload }) => {
    if (payload.item?.type !== "message") {
      return;
    }
    if (!payload.item.channel || !payload.item.ts) {
      console.warn(
        "reaction_removed: message item missing channel/ts",
        payload,
      );
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
      console.error("reaction_removed: error", e);
    }
  });

  app.event("message", async ({ payload }) => {
    if (payload.subtype !== "message_deleted") {
      return;
    }

    const channel = payload.channel as string | undefined;
    const deletedTs = payload.deleted_ts as string | undefined;
    if (!channel || !deletedTs) {
      return;
    }

    try {
      await removeMessageReactions(env.DB, channel, deletedTs);
      console.log("message_deleted", channel, deletedTs);
    } catch (e) {
      console.error("message_deleted: error", e);
    }
  });

  return app;
}
