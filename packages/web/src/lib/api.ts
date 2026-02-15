import type { AppType } from "@catalyst/worker/app";
import { hc } from "hono/client";
import { createMockFetch } from "./mock-data";

const SESSION_TOKEN_KEY = "catalyst-token";

const baseUrl = import.meta.env.PROD ? "https://api.catalyst.scstem.org" : "/";

export const isPreview = import.meta.env.VITE_PREVIEW === "true";

export function getSessionToken(): string | null {
  return sessionStorage.getItem(SESSION_TOKEN_KEY);
}

export function setSessionToken(token: string): void {
  sessionStorage.setItem(SESSION_TOKEN_KEY, token);
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  sessionStorage.removeItem("catalyst-auth");
}

function authFetch(input: RequestInfo | URL, init?: RequestInit) {
  const token = getSessionToken();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}

export const api = hc<AppType>(baseUrl, {
  fetch: isPreview ? (createMockFetch() as typeof fetch) : authFetch,
});

export async function fetchJson<T>(
  response: Response & { json(): Promise<T> },
): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      window.location.reload();
    }
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}
