import { TooltipProvider } from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { routeTree } from "./routeTree.gen";

import "./styles/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: true,
    },
  },
});

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

      const fromDepth = fromLocation.pathname.split("/").filter(Boolean).length;
      const toDepth = toLocation.pathname.split("/").filter(Boolean).length;
      if (toDepth > fromDepth) {
        return ["drill-down"];
      }
      if (toDepth < fromDepth) {
        return ["drill-up"];
      }
      return ["tab-switch"];
    },
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// biome-ignore lint/style/noNonNullAssertion: root element always exists
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
);
