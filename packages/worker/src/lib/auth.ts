const TOKEN_PREFIX = "catalyst-session-v1";

function currentWindow(ttlHours: number): number {
  return Math.floor(Date.now() / (ttlHours * 60 * 60 * 1000));
}

async function hmac(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function timeSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Create a session token. When `ttlHours` is 0 the token never expires.
 * Otherwise the token is scoped to a time window of `ttlHours`.
 */
export async function createSessionToken(
  password: string,
  ttlHours = 0,
): Promise<string> {
  if (ttlHours <= 0) {
    return hmac(password, TOKEN_PREFIX);
  }
  const window = currentWindow(ttlHours);
  return hmac(password, `${TOKEN_PREFIX}:${window}`);
}

/**
 * Verify a session token. When `ttlHours` is 0 the token is treated as
 * non-expiring. Otherwise the current and previous time windows are
 * accepted, giving an effective lifetime of 1-2x `ttlHours`.
 */
export async function verifySessionToken(
  password: string,
  token: string,
  ttlHours = 0,
): Promise<boolean> {
  if (ttlHours <= 0) {
    const expected = await hmac(password, TOKEN_PREFIX);
    return timeSafeEqual(token, expected);
  }
  const window = currentWindow(ttlHours);
  const [current, previous] = await Promise.all([
    hmac(password, `${TOKEN_PREFIX}:${window}`),
    hmac(password, `${TOKEN_PREFIX}:${window - 1}`),
  ]);
  return timeSafeEqual(token, current) || timeSafeEqual(token, previous);
}
