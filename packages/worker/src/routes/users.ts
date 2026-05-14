import { zValidator } from "@hono/zod-validator";
import { and, count, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { reactions, users } from "../db/schema";
import type { AppEnv } from "../lib/types";
import { isAnonymous } from "../lib/types";
import { limitSeasonQuery, seasonCondition } from "./util";

export const usersRoute = new Hono<AppEnv>().get(
  "/:userId/emojis",
  zValidator("query", limitSeasonQuery),
  async (c) => {
    const db = drizzle(c.env.DB);
    const userId = c.req.param("userId");
    const { limit, season } = c.req.valid("query");

    const [emojis, [user]] = (await db.batch([
      db
        .select({
          emoji: reactions.emoji,
          count: count(),
        })
        .from(reactions)
        .where(and(eq(reactions.userId, userId), seasonCondition(season)))
        .groupBy(reactions.emoji)
        .orderBy(desc(count()))
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
      {
        userId: string;
        displayName: string | null;
        avatarUrl: string | null;
      }[],
    ];

    if (isAnonymous(c)) {
      return c.json({
        user: user
          ? { userId: user.userId, displayName: null, avatarUrl: null }
          : null,
        emojis,
      });
    }

    return c.json({ user: user ?? null, emojis });
  },
);
