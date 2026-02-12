import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { emojiImages } from "../db/schema";

type Bindings = {
  DB: D1Database;
};

export const emojisRoute = new Hono<{ Bindings: Bindings }>().get(
  "/",
  async (c) => {
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

    return c.json(map);
  },
);
