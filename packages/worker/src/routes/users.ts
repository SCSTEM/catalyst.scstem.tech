import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { userEmojiCounts, users } from "../db/schema";
import { limitQuery } from "./util";

type Bindings = {
  DB: D1Database;
};

export const usersRoute = new Hono<{ Bindings: Bindings }>().get(
  "/:userId/emojis",
  zValidator("query", limitQuery),
  async (c) => {
    const db = drizzle(c.env.DB);
    const userId = c.req.param("userId");
    const limit = c.req.valid("query")?.limit ?? 50;

    const [emojis, [user]] = (await db.batch([
      db
        .select({
          emoji: userEmojiCounts.emoji,
          count: userEmojiCounts.count,
        })
        .from(userEmojiCounts)
        .where(
          and(eq(userEmojiCounts.userId, userId), gt(userEmojiCounts.count, 0)),
        )
        .orderBy(desc(userEmojiCounts.count))
        .limit(limit),
      db
        .select({
          userId: users.userId,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.userId, userId)),
    ])) as [
      { emoji: string; count: number }[],
      { userId: string; displayName: string; avatarUrl: string }[],
    ];

    return c.json({ user: user ?? null, emojis });
  },
);
