import { createRootRoute, Outlet } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { AccessGate } from "@/components/AccessGate";
import { isPreview } from "@/lib/api";

const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import("@tanstack/react-router-devtools").then((m) => ({
        default: m.TanStackRouterDevtools,
      })),
    );

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => isPreview || sessionStorage.getItem("catalyst-auth") === "1",
  );

  if (!isAuthenticated) {
    return <AccessGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <>
      <Outlet />
      <Suspense>
        <TanStackRouterDevtools position="bottom-right" />
      </Suspense>
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
