import { min } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { reactions } from "../db/schema";

export const metadataRoute = new Hono<{ Bindings: Env }>().get(
  "/",
  async (c) => {
    const db = drizzle(c.env.DB);

    const result = (
      await db
        .select({ firstReactionDate: min(reactions.createdAt) })
        .from(reactions)
    )[0];

    const date = result?.firstReactionDate
      ? new Date(result.firstReactionDate)
      : null;

    return c.json({ firstReactionDate: date });
  },
);
