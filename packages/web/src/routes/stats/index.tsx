import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/stats/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  return <Navigate to="/stats/emojis" />;
}
