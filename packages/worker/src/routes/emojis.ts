import { zValidator } from "@hono/zod-validator";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { emojiImages, reactions, reactionTotals, users } from "../db/schema";
import type { AppEnv } from "../lib/types";
import { isAnonymous } from "../lib/types";
import { limitSeasonQuery, optionalSeasonQuery, seasonCondition } from "./util";

export const emojisRoute = new Hono<AppEnv>()
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
  .get("/parrots", async (c) => {
    const db = drizzle(c.env.DB);

    const rows = await db
      .select({
        name: emojiImages.name,
        imageUrl: emojiImages.imageUrl,
        count: sql<number>`coalesce(${reactionTotals.count}, 0)`,
      })
      .from(emojiImages)
      .leftJoin(reactionTotals, eq(reactionTotals.emoji, emojiImages.name))
      .where(eq(emojiImages.isParrot, true))
      .orderBy(desc(reactionTotals.count), emojiImages.name);

    return c.json(rows);
  })
  .get(
    "/:emoji/profile",
    zValidator("query", optionalSeasonQuery),
    async (c) => {
      const db = drizzle(c.env.DB);
      const emoji = c.req.param("emoji");
      const { season } = c.req.valid("query");

      const whereClause =
        season !== undefined
          ? and(eq(reactions.emoji, emoji), seasonCondition(season))
          : eq(reactions.emoji, emoji);

      const [totalRow] = await db
        .select({ totalCount: count() })
        .from(reactions)
        .where(whereClause);

      const [firstRow] = await db
        .select({
          userId: reactions.userId,
          createdAt: reactions.createdAt,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(reactions)
        .leftJoin(users, eq(reactions.userId, users.userId))
        .where(whereClause)
        .orderBy(asc(reactions.createdAt))
        .limit(1);

      const [topRow] = await db
        .select({
          userId: reactions.userId,
          count: count(),
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(reactions)
        .leftJoin(users, eq(reactions.userId, users.userId))
        .where(whereClause)
        .groupBy(reactions.userId)
        .orderBy(desc(count()))
        .limit(1);

      const anon = isAnonymous(c);

      return c.json({
        totalCount: totalRow?.totalCount ?? 0,
        firstUsedAt: firstRow?.createdAt ?? null,
        firstUser: firstRow
          ? {
              userId: firstRow.userId,
              displayName: anon ? "" : (firstRow.displayName ?? ""),
              avatarUrl: anon ? "" : (firstRow.avatarUrl ?? ""),
            }
          : null,
        topUser: topRow
          ? {
              userId: topRow.userId,
              displayName: anon ? "" : (topRow.displayName ?? ""),
              avatarUrl: anon ? "" : (topRow.avatarUrl ?? ""),
              count: topRow.count,
            }
          : null,
      });
    },
  )
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

    if (isAnonymous(c)) {
      return c.json(
        results.map((r) => ({
          ...r,
          displayName: null,
          avatarUrl: null,
        })),
      );
    }

    return c.json(results);
  });
