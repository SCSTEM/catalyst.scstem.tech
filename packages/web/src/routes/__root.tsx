import { createRootRoute, HeadContent, Outlet } from "@tanstack/react-router";
import { lazy, useEffect, useState } from "react";
import { AccessGate } from "@/components/AccessGate";
import { onSessionExpired, SESSION_AUTH_KEY } from "@/lib/api";
import { hasInitialPassParam } from "@/lib/initialPass";

const DevTools = import.meta.env.PROD
  ? () => null
  : lazy(() => import("@/components/DevTools"));

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { title: "Catalyst" },
      {
        name: "description",
        content: "Slack bot (and more) that gets the whole team moving!",
      },
    ],
  }),
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (hasInitialPassParam()) {
      return false;
    }
    return localStorage.getItem(SESSION_AUTH_KEY) === "1";
  });

  useEffect(() => {
    return onSessionExpired(() => setIsAuthenticated(false));
  }, []);

  if (!isAuthenticated) {
    return <AccessGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <>
      <HeadContent />
      <Outlet />
      <DevTools />
    </>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <p className="text-muted-foreground">Page not found</p>
    </div>
  );
}
