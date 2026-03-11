import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { WorkflowEntrypoint } from "cloudflare:workers";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { reactions, reactionTotals, userEmojiCounts } from "../db/schema";
import { slackApi } from "../lib/slack-api";

const MAX_PAGES = 500;

type BackfillParams = {
  channelId: string;
  since: string;
  channelName: string;
};

type ReactionRow = {
  userId: string;
  emoji: string;
  channelId: string;
  messageTs: string;
  createdAt: string;
};

type HistoryResponse = {
  messages: {
    ts: string;
    reactions?: { name: string; users: string[]; count: number }[];
  }[];
  has_more: boolean;
  response_metadata?: { next_cursor?: string };
};

export class BackfillChannelWorkflow extends WorkflowEntrypoint<
  Env,
  BackfillParams
> {
  override async run(event: WorkflowEvent<BackfillParams>, step: WorkflowStep) {
    const { channelId, since, channelName } = event.payload;
    const token = this.env.SLACK_BOT_TOKEN;
    const oldest = String(Math.floor(new Date(since).getTime() / 1000));

    // ── Fetch messages page by page, writing to D1 as we go ──

    let cursor = "";
    let pageCount = 0;
    let totalReactions = 0;

    do {
      const currentCursor = cursor;
      const page = await step.do(`fetch-page-${pageCount}`, async () => {
        const params: Record<string, string> = {
          channel: channelId,
          limit: "200",
          oldest,
        };
        if (currentCursor) {
          params.cursor = currentCursor;
        }

        const res = await slackApi<HistoryResponse>(
          token,
          "conversations.history",
          params,
        );

        const pageReactions: ReactionRow[] = [];
        for (const msg of res.messages) {
          if (!msg.reactions) {
            continue;
          }
          for (const reaction of msg.reactions) {
            for (const userId of reaction.users) {
              pageReactions.push({
                userId,
                emoji: reaction.name,
                channelId,
                messageTs: msg.ts,
                createdAt: new Date(
                  Number.parseFloat(msg.ts) * 1000,
                ).toISOString(),
              });
            }
          }
        }

        // Write this page's reactions to D1 immediately
        if (pageReactions.length > 0) {
          const db = drizzle(this.env.DB);
          const batchSize = 100;
          for (let i = 0; i < pageReactions.length; i += batchSize) {
            const batch = pageReactions.slice(i, i + batchSize);
            await db.insert(reactions).values(batch).onConflictDoNothing();
          }
        }

        return {
          count: pageReactions.length,
          nextCursor: res.response_metadata?.next_cursor ?? "",
        };
      });

      totalReactions += page.count;
      cursor = page.nextCursor;
      pageCount++;

      if (cursor && pageCount < MAX_PAGES) {
        await step.sleep(`rate-limit-${pageCount}`, "1 second");
      }
    } while (cursor && pageCount < MAX_PAGES);

    if (totalReactions === 0) {
      await step.do("notify-empty", async () => {
        await slackApi(token, "chat.postMessage", {
          channel: channelId,
          text: `Backfill complete for #${channelName} — no reactions found since ${since}.`,
        });
      });
      return;
    }

    // ── Rebuild aggregate tables ──

    await step.do("rebuild-aggregates", async () => {
      const db = drizzle(this.env.DB);
      await db.batch([
        db.delete(reactionTotals),
        db.run(
          sql`INSERT INTO reaction_totals (emoji, count) SELECT emoji, COUNT(*) FROM reactions GROUP BY emoji`,
        ),
        db.delete(userEmojiCounts),
        db.run(
          sql`INSERT INTO user_emoji_counts (user_id, emoji, count) SELECT user_id, emoji, COUNT(*) FROM reactions GROUP BY user_id, emoji`,
        ),
      ]);
    });

    // ── Notify completion ──

    const truncated = pageCount >= MAX_PAGES;
    await step.do("notify-complete", async () => {
      let text = `Backfill complete for #${channelName}: found ${totalReactions} reactions across ${pageCount} pages since ${since}.`;
      if (truncated) {
        text += `\n:warning: Hit the ${MAX_PAGES}-page limit. Some older messages may not have been processed. Use the CLI backfill script for very large channels.`;
      }
      await slackApi(token, "chat.postMessage", {
        channel: channelId,
        text,
      });
    });
  }
}
