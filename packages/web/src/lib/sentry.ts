import * as Sentry from "@sentry/react";
import type { AnyRouter } from "@tanstack/react-router";

export const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export const sentryEnabled = !!SENTRY_DSN;

export function initSentry(router: AnyRouter) {
  if (sentryEnabled) {
    Sentry.init({
      enabled: sentryEnabled,
      dsn: SENTRY_DSN,
      environment: getEnvironment(),
      release: import.meta.env.CF_PAGES_COMMIT_SHA || undefined,
      sendDefaultPii: true,
      tracesSampleRate: 0.25,
      integrations: [
        Sentry.tanstackRouterBrowserTracingIntegration(router),
        Sentry.extraErrorDataIntegration(),
      ],
      beforeSend(event) {
        if (event.request?.headers) {
          delete event.request.headers.Authorization;
        }
        if (event.request?.url) {
          event.request.url = event.request.url.replace(
            /[?&](pass|token|password)=[^&]*/gi,
            "",
          );
        }
        return event;
      },
    });
  }
}

function getEnvironment(): string {
  switch (import.meta.env.CF_PAGES_BRANCH) {
    case undefined:
      return "development";
    case "main":
      return "production";
    default:
      return "staging";
  }
}
