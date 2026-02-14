import type { AppType } from "@catalyst/worker/app";
import { hc } from "hono/client";

const baseUrl = import.meta.env.PROD ? "https://api.catalyst.scstem.org" : "/";

export const api = hc<AppType>(baseUrl);
