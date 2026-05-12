import { zValidator } from "@hono/zod-validator";
import { and, count, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { emojiImages, reactions, users } from "../db/schema";
import { limitSeasonQuery, seasonCondition } from "./util";

export const emojisRoute = new Hono<{ Bindings: Env }>()
  .get("/", async (c) => {
    const db = drizzle(c.env.DB);

    const rows = await db
      .select({
        name: emojiImages.name,
        imageUrl: emojiImages.imageUrl,
      })
      .from(emojiImages);

    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.name] = row.imageUrl;
    }

    c.header("Cache-Control", "public, max-age=3600");
    return c.json(map);
  })
  .get("/:emoji/users", zValidator("query", limitSeasonQuery), async (c) => {
    const db = drizzle(c.env.DB);
    const emoji = c.req.param("emoji");
    const { limit, season } = c.req.valid("query");

    const results = await db
      .select({
        userId: reactions.userId,
        count: count(),
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(reactions)
      .leftJoin(users, eq(reactions.userId, users.userId))
      .where(and(eq(reactions.emoji, emoji), seasonCondition(season)))
      .groupBy(reactions.userId)
      .orderBy(desc(count()))
      .limit(limit);

    return c.json(results);
  });
