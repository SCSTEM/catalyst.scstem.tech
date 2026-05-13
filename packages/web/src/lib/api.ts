import type { ApiType } from "@catalyst/worker/api";
import { hc } from "hono/client";

const SESSION_TOKEN_KEY = "catalyst-token";
export const SESSION_AUTH_KEY = "catalyst-auth";

const baseUrl = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : "/";

export function getSessionToken(): string | null {
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

export function setSessionToken(token: string): void {
  localStorage.setItem(SESSION_TOKEN_KEY, token);
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_AUTH_KEY);
}

let sessionExpiredCallback: (() => void) | null = null;

export function onSessionExpired(cb: () => void): () => void {
  sessionExpiredCallback = cb;
  return () => {
    sessionExpiredCallback = null;
  };
}

function authFetch(input: RequestInfo | URL, init?: RequestInit) {
  const token = getSessionToken();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}

export const api = hc<ApiType>(baseUrl, {
  fetch: authFetch,
});

export async function fetchJson<T>(
  response: Response & { json(): Promise<T> },
): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      sessionExpiredCallback?.();
      // Return a never-resolving promise so TanStack Query doesn't render an
      // error flash while the auth state change navigates to the login screen.
      return new Promise<never>(() => {});
    }
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}
