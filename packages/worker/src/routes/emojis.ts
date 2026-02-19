import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { emojiImages, userEmojiCounts, users } from "../db/schema";
import { limitQuery } from "./util";

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
  .get("/:emoji/users", zValidator("query", limitQuery), async (c) => {
    const db = drizzle(c.env.DB);
    const emoji = c.req.param("emoji");
    const { limit } = c.req.valid("query");

    const results = await db
      .select({
        userId: userEmojiCounts.userId,
        count: userEmojiCounts.count,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(userEmojiCounts)
      .leftJoin(users, eq(userEmojiCounts.userId, users.userId))
      .where(
        and(eq(userEmojiCounts.emoji, emoji), gt(userEmojiCounts.count, 0)),
      )
      .orderBy(desc(userEmojiCounts.count))
      .limit(limit);

    return c.json(results);
  });
