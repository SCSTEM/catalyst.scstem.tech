const TOKEN_PAYLOAD = "catalyst-session-v1";

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

export async function createSessionToken(password: string): Promise<string> {
  return hmac(password, TOKEN_PAYLOAD);
}

export async function verifySessionToken(
  password: string,
  token: string,
): Promise<boolean> {
  const expected = await hmac(password, TOKEN_PAYLOAD);
  if (token.length !== expected.length) {
    return false;
  }
  // Constant-time comparison
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return mismatch === 0;
}
