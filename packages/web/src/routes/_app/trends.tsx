import { createFileRoute } from "@tanstack/react-router";
import { Trends } from "@/components/Trends";

export const Route = createFileRoute("/_app/trends")({
  component: TrendsPage,
});

function TrendsPage() {
  return <Trends />;
}
