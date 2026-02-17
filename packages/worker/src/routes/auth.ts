import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import z from "zod";
import { createSessionToken, timeSafeEqual } from "../lib/auth";

const verifyBody = z.object({
  password: z.string(),
  turnstileToken: z.string(),
});

export const authRoute = new Hono<{ Bindings: Env }>().post(
  "/verify",
  zValidator("json", verifyBody),
  async (c) => {
    const { password, turnstileToken } = c.req.valid("json");

    const turnstileRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: c.env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
          remoteip: c.req.header("CF-Connecting-IP"),
        }),
      },
    );

    const turnstileResult = await turnstileRes.json<{ success: boolean }>();

    if (!turnstileResult.success) {
      return c.json({ ok: false, error: "Turnstile verification failed" }, 403);
    }

    if (!timeSafeEqual(password, c.env.SITE_PASSWORD)) {
      return c.json({ ok: false, error: "Incorrect password" }, 401);
    }

    const ttl = Number(c.env.SESSION_TTL_HOURS) || 0;
    const token = await createSessionToken(c.env.SITE_PASSWORD, ttl);

    c.header("Cache-Control", "no-store");
    return c.json({ ok: true, token });
  },
);
