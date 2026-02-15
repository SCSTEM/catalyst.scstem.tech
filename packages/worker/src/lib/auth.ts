const TOKEN_PREFIX = "catalyst-session-v1";
const WINDOW_MS = 24 * 60 * 60 * 1000;

function currentWindow(now: number = Date.now()): number {
  return Math.floor(now / WINDOW_MS);
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

function timeSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function createSessionToken(password: string): Promise<string> {
  const window = currentWindow();
  return hmac(password, `${TOKEN_PREFIX}:${window}`);
}

export async function verifySessionToken(
  password: string,
  token: string,
): Promise<boolean> {
  const window = currentWindow();
  // Accept tokens from the current window and the previous one,
  // giving an effective lifetime of 24-48 hours.
  const [current, previous] = await Promise.all([
    hmac(password, `${TOKEN_PREFIX}:${window}`),
    hmac(password, `${TOKEN_PREFIX}:${window - 1}`),
  ]);
  return timeSafeEqual(token, current) || timeSafeEqual(token, previous);
}
