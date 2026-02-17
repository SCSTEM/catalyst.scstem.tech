import { env } from "cloudflare:workers";
import honoApp from "./app";
import { createSlackApp } from "./slack";

const slackApp = createSlackApp(env);

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/slack/events") {
      return slackApp.run(request, ctx);
    }

    return honoApp.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
