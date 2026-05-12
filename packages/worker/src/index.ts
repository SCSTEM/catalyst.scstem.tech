import { api } from "./api";
import { createSlackApp } from "./slack";

export { BackfillChannelWorkflow } from "./workflows/backfill-channel";

let slackApp: ReturnType<typeof createSlackApp>;

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/slack/events") {
      slackApp ??= createSlackApp(env);
      return slackApp.run(request, ctx);
    }

    return api.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
