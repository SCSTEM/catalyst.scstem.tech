import { SelectLabel } from "@radix-ui/react-select";
import { useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { useMediaQuery } from "usehooks-ts";
import { StatsLayout } from "@/components/layouts/StatsLayout";
import { Emoji } from "@/components/stats/Emoji";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSlackCustomEmojis } from "@/hooks/queries";
import { useFrcSeasons } from "@/hooks/useFrcSeasons";
import { StatsFiltersProvider, useStatsFilters } from "@/hooks/useStatsFilter";
import { capitalizeWord, chartIntervals, cn } from "@/lib/utils";

export const Route = createFileRoute("/stats")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <StatsFiltersProvider>
      <StatsRoute />
    </StatsFiltersProvider>
  );
}

const tabs = [
  { value: "emojis", to: "/stats/emojis", label: "Top Reactions" },
  { value: "users", to: "/stats/users", label: "Top Reactors" },
  { value: "trends", to: "/stats/trends", label: "Trends" },
] as const;

function getActiveTab(pathname: string): (typeof tabs)[number]["value"] {
  if (pathname.startsWith("/stats/users")) {
    return "users";
  }
  if (pathname.startsWith("/stats/trends")) {
    return "trends";
  }
  return "emojis";
}

function StatsRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);

  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isMobile = useMediaQuery("(max-width: 768px)");
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [tabsFade, setTabsFade] = useState({ left: 0, right: 0 });

  const { frcSeason, setFrcSeason, chartInterval, setChartInterval } =
    useStatsFilters();
  const seasons = useFrcSeasons();
  // Warm the shared emoji image map so it loads in parallel with page data
  // rather than only after <Emoji> children mount.
  useSlackCustomEmojis();

  useLayoutEffect(() => {
    const el = tabsScrollRef.current;
    if (!el) {
      return;
    }

    let maxFade =
      2 * parseFloat(getComputedStyle(document.documentElement).fontSize);

    const update = () => {
      const left = Math.min(maxFade, Math.max(0, el.scrollLeft));
      const right = Math.min(
        maxFade,
        Math.max(0, el.scrollWidth - el.clientWidth - el.scrollLeft),
      );
      setTabsFade({ left, right });
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(() => {
      maxFade =
        2 * parseFloat(getComputedStyle(document.documentElement).fontSize);
      update();
    });
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: We need activeTab as a dependency to force the layout effect to re-run
  useLayoutEffect(() => {
    const el = tabsScrollRef.current;
    if (!el) {
      return;
    }
    const active = el.querySelector<HTMLElement>('[data-state="active"]');
    if (!active) {
      return;
    }
    const elRect = el.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const activeLeft = activeRect.left - elRect.left + el.scrollLeft;
    const target = activeLeft + activeRect.width / 2 - el.clientWidth / 2;
    el.scrollTo({ left: target, behavior: "smooth" });
  }, [activeTab]);

  const tabsMaskImage =
    tabsFade.left > 0 || tabsFade.right > 0
      ? `linear-gradient(to right, transparent 0, black ${tabsFade.left}px, black calc(100% - ${tabsFade.right}px), transparent 100%)`
      : undefined;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.refetchQueries({ type: "active" }),
      new Promise((r) => setTimeout(r, 500)),
    ]);
    setIsRefreshing(false);
  };

  return (
    <StatsLayout title="Emoji Leaderboard 😎">
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
        <div
          className="h-14 flex md:gap-4 gap-2"
          style={{ viewTransitionName: "tabs-bar" }}
        >
          <TabsList className="h-full flex-1 min-w-0">
            <div
              ref={tabsScrollRef}
              className="flex h-full w-full overflow-x-auto [scrollbar-width:none] md:overflow-visible [&::-webkit-scrollbar]:hidden"
              style={{
                maskImage: tabsMaskImage,
                WebkitMaskImage: tabsMaskImage,
              }}
            >
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="h-full flex-1"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </div>
          </TabsList>
          <Button
            asChild
            size="icon"
            className="size-13 shrink-0 my-auto p-0"
            style={{ viewTransitionName: "parrot-button" }}
          >
            <Link to="/stats/parrots">
              <Emoji name={"60fps_parrot"} size={55} hideTooltip />
            </Link>
          </Button>
        </div>
        <Card
          className={cn("p-0", isMobile && "mb-12")}
          style={{ viewTransitionName: "stats-card" }}
        >
          <div
            className="p-2 md:p-4"
            style={{ viewTransitionName: "stats-card-body" }}
          >
            <Outlet />
          </div>
        </Card>
      </Tabs>

      <div className="fixed bottom-2 right-2 md:bottom-6 md:right-6 z-50 flex gap-2 h-10">
        {isMobile && (activeTab === "users" || activeTab === "trends") ? (
          <Select value={chartInterval} onValueChange={setChartInterval}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Chart Interval</SelectLabel>
                {chartIntervals.map((interval) => (
                  <SelectItem key={interval} value={interval}>
                    {capitalizeWord(interval)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : null}

        {seasons.length > 1 ? (
          <Select
            value={frcSeason.toString()}
            onValueChange={(v) => setFrcSeason(Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>FRC Season</SelectLabel>
                {seasons.map((season) => (
                  <SelectItem key={season} value={season.toString()}>
                    {season}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : null}

        <Button
          size="icon"
          className="shrink-0"
          style={{ viewTransitionName: "refresh-btn" }}
          disabled={isRefreshing}
          onClick={handleRefresh}
        >
          <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
        </Button>
      </div>
    </StatsLayout>
  );
}
