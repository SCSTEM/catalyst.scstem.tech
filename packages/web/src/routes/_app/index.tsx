import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  return <Navigate to="/emojis" />;
}
