import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import z from "zod";
import {
  createAnonymousSessionToken,
  createSessionToken,
  timeSafeEqual,
} from "../lib/auth";

const verifyBody = z.object({
  password: z.string(),
  turnstileToken: z.string(),
});

const anonymousBody = z.object({
  turnstileToken: z.string(),
});

async function verifyTurnstile(
  secret: string,
  token: string,
  remoteIp: string | undefined,
): Promise<boolean> {
  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: remoteIp,
      }),
    },
  );
  const result = await res.json<{ success: boolean }>();
  return result.success;
}

export const authRoute = new Hono<{ Bindings: Env }>()
  .post("/verify", zValidator("json", verifyBody), async (c) => {
    const { password, turnstileToken } = c.req.valid("json");

    const turnstileOk = await verifyTurnstile(
      c.env.TURNSTILE_SECRET_KEY,
      turnstileToken,
      c.req.header("CF-Connecting-IP"),
    );

    if (!turnstileOk) {
      c.header("Cache-Control", "no-store");
      return c.json({ ok: false, error: "Turnstile verification failed" }, 403);
    }

    if (!timeSafeEqual(password, c.env.SITE_PASSWORD)) {
      c.header("Cache-Control", "no-store");
      return c.json({ ok: false, error: "Incorrect password" }, 401);
    }

    const ttl = Number(c.env.SESSION_TTL_HOURS) || 0;
    const token = await createSessionToken(c.env.SITE_PASSWORD, ttl);

    c.header("Cache-Control", "no-store");
    return c.json({ ok: true, token });
  })
  .post("/anonymous", zValidator("json", anonymousBody), async (c) => {
    const { turnstileToken } = c.req.valid("json");

    const turnstileOk = await verifyTurnstile(
      c.env.TURNSTILE_SECRET_KEY,
      turnstileToken,
      c.req.header("CF-Connecting-IP"),
    );

    if (!turnstileOk) {
      c.header("Cache-Control", "no-store");
      return c.json({ ok: false, error: "Turnstile verification failed" }, 403);
    }

    const ttl = Number(c.env.SESSION_TTL_HOURS) || 0;
    const token = await createAnonymousSessionToken(c.env.SITE_PASSWORD, ttl);

    c.header("Cache-Control", "no-store");
    return c.json({ ok: true, token });
  });
