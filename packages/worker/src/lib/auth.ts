const TOKEN_PREFIX = "catalyst-session-v1";
const ANON_TOKEN_PREFIX = "catalyst-anon-v1";

export type SessionMode = "full" | "anonymous";

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
  const encoder = new TextEncoder();
  const aBuf = encoder.encode(a);
  const bBuf = encoder.encode(b);
  if (aBuf.byteLength !== bBuf.byteLength) {
    // Compare against self to burn the same time as a real comparison,
    // avoiding length-leaking via early return.
    crypto.subtle.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.subtle.timingSafeEqual(aBuf, bBuf);
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
  return verifyTokenWithPrefix(password, token, ttlHours, TOKEN_PREFIX);
}

/**
 * Create an anonymous session token. Uses a distinct prefix from the
 * password-backed session token so the two can be distinguished at verify
 * time, and so anonymous tokens can be revoked independently if needed.
 */
export async function createAnonymousSessionToken(
  password: string,
  ttlHours = 0,
): Promise<string> {
  if (ttlHours <= 0) {
    return hmac(password, ANON_TOKEN_PREFIX);
  }
  const window = currentWindow(ttlHours);
  return hmac(password, `${ANON_TOKEN_PREFIX}:${window}`);
}

export async function verifyAnonymousSessionToken(
  password: string,
  token: string,
  ttlHours = 0,
): Promise<boolean> {
  return verifyTokenWithPrefix(password, token, ttlHours, ANON_TOKEN_PREFIX);
}

async function verifyTokenWithPrefix(
  password: string,
  token: string,
  ttlHours: number,
  prefix: string,
): Promise<boolean> {
  if (ttlHours <= 0) {
    const expected = await hmac(password, prefix);
    return timeSafeEqual(token, expected);
  }
  const window = currentWindow(ttlHours);
  const [current, previous] = await Promise.all([
    hmac(password, `${prefix}:${window}`),
    hmac(password, `${prefix}:${window - 1}`),
  ]);
  return timeSafeEqual(token, current) || timeSafeEqual(token, previous);
}

/**
 * Verify either a full or anonymous session token. Always runs both checks
 * so the response time doesn't leak which kind of token was attempted.
 */
export async function verifyAnySessionToken(
  password: string,
  token: string,
  ttlHours = 0,
): Promise<SessionMode | null> {
  const [full, anon] = await Promise.all([
    verifySessionToken(password, token, ttlHours),
    verifyAnonymousSessionToken(password, token, ttlHours),
  ]);
  if (full) {
    return "full";
  }
  if (anon) {
    return "anonymous";
  }
  return null;
}
