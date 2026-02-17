import honoApp from "./app";
import { createSlackApp } from "./slack";

let slackApp: ReturnType<typeof createSlackApp>;

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/slack/events") {
      slackApp ??= createSlackApp(env);
      return slackApp.run(request, ctx);
    }

    return honoApp.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
