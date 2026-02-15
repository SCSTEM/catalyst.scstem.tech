import type { AppType } from "@catalyst/worker/app";
import { hc } from "hono/client";
import { createMockFetch } from "./mock-data";

const baseUrl = import.meta.env.PROD ? "https://api.catalyst.scstem.org" : "/";

export const isPreview = import.meta.env.VITE_PREVIEW === "true";

export const api = hc<AppType>(baseUrl, {
  ...(isPreview ? { fetch: createMockFetch() as typeof fetch } : {}),
});
