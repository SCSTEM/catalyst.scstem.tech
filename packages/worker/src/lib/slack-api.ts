const MAX_RETRIES = 5;

type SlackResponse = { ok: boolean; error?: string };

/**
 * Rate-limited Slack API helper for Worker runtime.
 * Adapted from scripts/backfill.ts — retries on 429 with Retry-After.
 */
export async function slackApi<T>(
  token: string,
  method: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`https://slack.com/api/${method}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("Retry-After") ?? "5");
      console.warn(
        `Rate limited on ${method}, retrying in ${retryAfter}s (attempt ${attempt + 1}/${MAX_RETRIES})`,
      );
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      continue;
    }

    if (!res.ok) {
      throw new Error(`Slack API ${method} HTTP ${res.status}`);
    }
    const data = (await res.json()) as T & SlackResponse;
    if (!data.ok) {
      throw new Error(`Slack API ${method}: ${data.error}`);
    }
    return data;
  }

  throw new Error(
    `Slack API ${method}: rate limited after ${MAX_RETRIES} retries`,
  );
}
