import { hc } from "hono/client";
import type { AppType } from "../../worker/src/app";

const baseUrl = import.meta.env.PROD ? "https://api.catalyst.scstem.org" : "/";

export const api = hc<AppType>(baseUrl);
