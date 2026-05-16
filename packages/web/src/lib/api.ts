import type { ApiType } from "@catalyst/worker/api";
import { hc } from "hono/client";

const SESSION_TOKEN_KEY = "catalyst-token";
export const SESSION_AUTH_KEY = "catalyst-auth";

const FETCH_TIMEOUT_MS = 15_000;

const baseUrl = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : "/";

export class SessionExpiredError extends Error {
  constructor() {
    super("Session expired");
    this.name = "SessionExpiredError";
  }
}

export class ApiError extends Error {
  constructor(public readonly status: number) {
    super(`API error: ${status}`);
    this.name = "ApiError";
  }
}

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

  const timeoutSignal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;

  return fetch(input, { ...init, headers, signal });
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
      throw new SessionExpiredError();
    }
    throw new ApiError(response.status);
  }
  return response.json();
}
