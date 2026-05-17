import * as Sentry from "@sentry/cloudflare";
import { api } from "./api";
import { createSlackApp } from "./slack";

export { BackfillChannelWorkflow } from "./workflows/backfill-channel";

let slackApp: ReturnType<typeof createSlackApp>;

export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    enabled: !!env.SENTRY_DSN,
    // SENTRY_RELEASE is injected only by the deploy pipeline (`wrangler deploy
    // --var`); its absence means this is a local `wrangler dev` run, which must
    // report as `development` rather than the wrangler.jsonc production default.
    environment: env.SENTRY_RELEASE ? env.SENTRY_ENVIRONMENT : "development",
    release: env.SENTRY_RELEASE,
    tracesSampleRate: 0.25,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers.Authorization;
        delete event.request.headers.Cookie;
      }
      return event;
    },
  }),
  {
    async fetch(request, env, ctx): Promise<Response> {
      const url = new URL(request.url);

      if (url.pathname === "/api/slack/events") {
        slackApp ??= createSlackApp(env);
        return slackApp.run(request, ctx);
      }

      return api.fetch(request, env, ctx);
    },
  } satisfies ExportedHandler<Env>,
);
