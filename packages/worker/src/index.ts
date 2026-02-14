import honoApp from "./app";
import { createSlackApp } from "./slack";

let slackApp: ReturnType<typeof createSlackApp> | null = null;

export default {
  async fetch(
    request: Request,
    env: Record<string, unknown>,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/slack/events") {
      if (!slackApp) {
        slackApp = createSlackApp(
          env as {
            SLACK_SIGNING_SECRET: string;
            SLACK_BOT_TOKEN: string;
            DB: D1Database;
          },
        );
      }
      return slackApp.run(request, ctx);
    }

    return honoApp.fetch(request, env, ctx);
  },
};
