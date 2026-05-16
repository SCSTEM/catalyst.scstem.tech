import { TooltipProvider } from "@radix-ui/react-tooltip";
import * as Sentry from "@sentry/react";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ApiError, SessionExpiredError } from "./lib/api";
import { captureInitialPassParam } from "./lib/initialPass";
import { routeTree } from "./routeTree.gen";

import "./styles/index.css";

// Must run before the router mounts so that redirect-based routes (e.g. `/` → `/stats/emojis`)
// don't strip `?pass=...` from the URL before AccessGate can read it.
captureInitialPassParam();

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        if (error instanceof SessionExpiredError) {
          return false;
        }
        if (error instanceof ApiError && error.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (error instanceof SessionExpiredError) {
        return;
      }
      if (SENTRY_DSN) {
        Sentry.captureException(error, {
          tags: { queryKey: JSON.stringify(query.queryKey) },
        });
      }
    },
  }),
});

const statsTabOrder = ["/stats/emojis", "/stats/users", "/stats/trends"];

const router = createRouter({
  routeTree,
  defaultViewTransition: {
    types: ({ fromLocation, toLocation, pathChanged }) => {
      if (!pathChanged || !fromLocation) {
        return false;
      }

      if (
        toLocation.pathname.startsWith("/stats/parrots") ||
        fromLocation.pathname.startsWith("/stats/parrots")
      ) {
        return ["parrot-fade"];
      }

      const fromTabIdx = statsTabOrder.findIndex((t) =>
        fromLocation.pathname.startsWith(t),
      );
      const toTabIdx = statsTabOrder.findIndex((t) =>
        toLocation.pathname.startsWith(t),
      );
      if (fromTabIdx !== -1 && toTabIdx !== -1 && fromTabIdx !== toTabIdx) {
        return toTabIdx > fromTabIdx ? ["drill-down"] : ["drill-up"];
      }

      const fromDepth = fromLocation.pathname.split("/").filter(Boolean).length;
      const toDepth = toLocation.pathname.split("/").filter(Boolean).length;
      if (toDepth > fromDepth) {
        return ["drill-down"];
      }
      if (toDepth < fromDepth) {
        return ["drill-up"];
      }
      return false;
    },
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment:
      import.meta.env.CF_PAGES_BRANCH === "main" ? "production" : "staging",
    release: import.meta.env.CF_PAGES_COMMIT_SHA || undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
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

function ErrorFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="text-center">
        <p className="text-lg font-semibold">Something went wrong</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Try reloading the page.
        </p>
      </div>
    </div>
  );
}

// biome-ignore lint/style/noNonNullAssertion: root element always exists
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RouterProvider router={router} />
        </TooltipProvider>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
