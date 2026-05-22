import { zValidator } from "@hono/zod-validator";
import { and, count, desc, inArray, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { reactions, users } from "../db/schema";
import { seasonCondition } from "../util";
import { idsLimitSeasonQuery } from "./validation";

type UserEmojis = {
  user: { userId: string; displayName: string; avatarUrl: string } | null;
  emojis: Array<{ emoji: string; count: number }>;
};

export const usersRoute = new Hono<{ Bindings: Env }>()

  // /users/emojis?ids=userid1,userid2,...&limit=N&season=S - top N emojis for each user, season-scoped. Emoji includes name and count.
  .get("/emojis", zValidator("query", idsLimitSeasonQuery), async (c) => {
    const db = drizzle(c.env.DB);
    const { ids, limit, season } = c.req.valid("query");

    // Top `limit` emoji per user, season-scoped.
    const ranked = db.$with("ranked").as(
      db
        .select({
          userId: reactions.userId,
          emoji: reactions.emoji,
          count: count().as("count"),
          rn: sql<number>`row_number() over (partition by ${reactions.userId} order by count(*) desc)`.as(
            "rn",
          ),
        })
        .from(reactions)
        .where(and(inArray(reactions.userId, ids), seasonCondition(season)))
        .groupBy(reactions.userId, reactions.emoji),
    );

    const [emojiRows, userRows] = await Promise.all([
      db
        .with(ranked)
        .select({
          userId: ranked.userId,
          emoji: ranked.emoji,
          count: ranked.count,
        })
        .from(ranked)
        .where(lte(ranked.rn, limit))
        .orderBy(ranked.userId, desc(ranked.count)),
      db
        .select({
          userId: users.userId,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(inArray(users.userId, ids)),
    ]);

    const userById = new Map(userRows.map((u) => [u.userId, u] as const));

    const result: Record<string, UserEmojis> = {};
    for (const id of ids) {
      result[id] = { user: userById.get(id) ?? null, emojis: [] };
    }
    for (const row of emojiRows) {
      result[row.userId]?.emojis.push({ emoji: row.emoji, count: row.count });
    }

    return c.json(result);
  });
