import { useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

const tabs = [
  { value: "emojis", to: "/emojis", label: "Top Reactions" },
  { value: "users", to: "/users", label: "Top Reactors" },
  { value: "trends", to: "/trends", label: "Trends" },
] as const;

function getActiveTab(pathname: string): string {
  if (pathname.startsWith("/users")) {
    return "users";
  }
  if (pathname.startsWith("/trends")) {
    return "trends";
  }
  return "emojis";
}

function AppLayout() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);

  return (
    <Layout title="Emoji Leaderboard 😎">
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const tab = tabs.find((t) => t.value === value);
          if (tab) {
            navigate({ to: tab.to });
          }
        }}
        className="flex flex-col gap-4 md:gap-6"
      >
        <div className="h-14">
          <TabsList className="size-full">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="h-full flex-1"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <Card className="p-2 md:p-4">
          <Outlet />
        </Card>
      </Tabs>

      <Button
        size="icon"
        className="fixed bottom-6 right-6 z-50 size-12"
        onClick={() => queryClient.invalidateQueries()}
      >
        <RefreshCw />
      </Button>
    </Layout>
  );
}
