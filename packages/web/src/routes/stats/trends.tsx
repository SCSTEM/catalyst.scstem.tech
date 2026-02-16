import { createFileRoute } from "@tanstack/react-router";
import { Trends } from "@/components/stats/Trends";

export const Route = createFileRoute("/stats/trends")({
  head: () => ({
    meta: [{ title: "Trends | Catalyst" }],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return <Trends />;
}
