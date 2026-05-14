import { useMemo, useState } from "react";
import { flushSync } from "react-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { useMediaQuery } from "usehooks-ts";
import {
  useCategoryData,
  useEmojiTrends,
  useUserTrends,
} from "@/hooks/queries";
import { useStatsFilters } from "@/hooks/useStatsFilter";
import { categorizeEmojis } from "@/lib/emojiCategories";
import {
  type ChartInterval,
  capitalizeWord,
  chartIntervals,
} from "@/lib/utils";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import type { ChartConfig } from "../ui/chart";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Emoji } from "./Emoji";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

function ChartIntervalSelector() {
  const { chartInterval, setChartInterval } = useStatsFilters();
  return (
    <Tabs
      value={chartInterval}
      onValueChange={(v) => setChartInterval(v as ChartInterval)}
    >
      <TabsList className="w-full">
        {chartIntervals.map((p) => (
          <TabsTrigger key={p} value={p} className="w-full">
            {capitalizeWord(p)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

// --- Shared area chart shell ---

type TrendSeriesPoint = { period: string } & Record<string, number>;

interface TrendChartProps {
  title: string;
  description: string;
  series: TrendSeriesPoint[];
  keys: string[];
  config: ChartConfig;
  loading: boolean;
  error: string | null;
  stacked?: boolean;
}

function SortedTooltipContent(
  props: React.ComponentProps<typeof ChartTooltipContent>,
) {
  const sorted = props.payload
    ? [...props.payload].sort((a, b) => {
        const aVal = typeof a.value === "number" ? a.value : 0;
        const bVal = typeof b.value === "number" ? b.value : 0;
        if (bVal !== aVal) {
          return bVal - aVal;
        }
        return String(a.name ?? "").localeCompare(String(b.name ?? ""));
      })
    : undefined;
  return <ChartTooltipContent {...props} payload={sorted} />;
}

function TrendChart({
  title,
  description,
  series,
  keys,
  config,
  loading,
  error,
  stacked,
}: TrendChartProps) {
  const fillOpacity = stacked ? 0.6 : 0.15;
  return (
    <Card className="shadow-none! border-0 pb-0 md:-ml-3 md:-mr-2">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction className="hidden md:block">
          <ChartIntervalSelector />
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        {loading ? (
          <p className="py-12 text-center text-muted-foreground">Loading...</p>
        ) : error ? (
          <p className="py-12 text-center text-destructive">{error}</p>
        ) : series.length > 0 ? (
          <ChartContainer config={config} className="h-80 md:h-87.5 w-full">
            <AreaChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<SortedTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {keys.map((key, i) => (
                <Area
                  key={key}
                  dataKey={key}
                  type="monotone"
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  fillOpacity={fillOpacity}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  stackId={stacked ? "a" : undefined}
                />
              ))}
            </AreaChart>
          </ChartContainer>
        ) : (
          <p className="py-12 text-center text-muted-foreground">
            No data for this period
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// --- Concrete charts ---

function EmojiTrendsChart() {
  const { frcSeason, chartInterval } = useStatsFilters();
  const { data, isPending, error } = useEmojiTrends(frcSeason, chartInterval);

  const chartConfig = useMemo<ChartConfig>(() => {
    if (!data) {
      return {};
    }
    const config: ChartConfig = {};
    for (const [i, emoji] of data.emojis.entries()) {
      config[emoji] = {
        label: (
          <span className="inline-flex items-center gap-1">
            <Emoji name={emoji} size={14} />
          </span>
        ),
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    }
    return config;
  }, [data]);

  return (
    <TrendChart
      title="Emoji Trends"
      description="Top emoji usage over time"
      series={(data?.series ?? []) as TrendSeriesPoint[]}
      keys={data?.emojis ?? []}
      config={chartConfig}
      loading={isPending}
      error={error?.message ?? null}
      stacked
    />
  );
}

function UserTrendsChart() {
  const { chartInterval, frcSeason } = useStatsFilters();
  const { data, isPending, error } = useUserTrends(frcSeason, chartInterval);

  const userIds = data?.userIds ?? [];

  const chartConfig = useMemo<ChartConfig>(() => {
    if (!data) {
      return {};
    }
    const config: ChartConfig = {};
    for (const [i, userId] of data.userIds.entries()) {
      const user = data.users[userId];
      config[userId] = {
        label: (
          <span className="inline-flex items-center gap-1">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-3.5 w-3.5 rounded-full"
              />
            ) : null}
            {user?.name || userId}
          </span>
        ),
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    }
    return config;
  }, [data]);

  return (
    <TrendChart
      title="Top Reactors"
      description="Most active reactors over time"
      series={(data?.series ?? []) as TrendSeriesPoint[]}
      keys={userIds}
      config={chartConfig}
      loading={isPending}
      error={error?.message ?? null}
    />
  );
}

function CategoryChart() {
  // Read the match synchronously on first render so the pie doesn't flash
  // mobile-sized on desktop before re-rendering.
  const isDesktop = useMediaQuery("(min-width: 768px)", {
    initializeWithValue: true,
  });
  const pieInner = isDesktop ? 80 : 55;
  const pieOuter = isDesktop ? 140 : 95;
  const labelY1 = isDesktop ? -42 : -55;
  const labelY2 = isDesktop ? -12 : -35;

  const { frcSeason } = useStatsFilters();
  const { data, isPending, error } = useCategoryData(frcSeason);

  const categories = useMemo(() => {
    if (!data) {
      return [];
    }
    return categorizeEmojis(data);
  }, [data]);

  const totalCount = useMemo(
    () => categories.reduce((sum, c) => sum + c.count, 0),
    [categories],
  );

  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    for (const cat of categories) {
      config[cat.category] = {
        label: cat.category,
        color: cat.fill,
      };
    }
    return config;
  }, [categories]);

  return (
    <Card className="shadow-none! border-0 pb-0">
      <CardHeader>
        <CardTitle>Categories</CardTitle>
        <CardDescription>Reaction emoji usage by category</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <p className="py-12 text-center text-muted-foreground">Loading...</p>
        ) : error ? (
          <p className="py-12 text-center text-destructive">{error.message}</p>
        ) : categories.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="mx-auto h-96 md:h-87.5 w-full"
          >
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={categories}
                dataKey="count"
                nameKey="category"
                innerRadius={pieInner}
                outerRadius={pieOuter}
                strokeWidth={2}
              >
                {categories.map((cat) => (
                  <Cell key={cat.category} fill={cat.fill} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) + labelY1}
                            className="fill-foreground text-3xl font-bold"
                          >
                            {totalCount.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) + labelY2}
                            className="fill-muted-foreground text-sm"
                          >
                            reactions
                          </tspan>
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              </Pie>
              <ChartLegend
                content={<ChartLegendContent nameKey="category" />}
              />
            </PieChart>
          </ChartContainer>
        ) : null}
      </CardContent>
    </Card>
  );
}

const CHART_TABS = ["emoji-trends", "user-trends", "categories"] as const;
type ChartTab = (typeof CHART_TABS)[number];

export function Trends() {
  const [tab, setTab] = useState<ChartTab>("emoji-trends");

  const handleChange = (nextValue: string) => {
    const next = nextValue as ChartTab;
    if (next === tab) {
      return;
    }
    if (!document.startViewTransition) {
      setTab(next);
      return;
    }

    const fromIdx = CHART_TABS.indexOf(tab);
    const toIdx = CHART_TABS.indexOf(next);

    document.startViewTransition({
      update: () => {
        flushSync(() => setTab(next));
      },
      types: [toIdx > fromIdx ? "chart-forward" : "chart-back"],
    });
  };

  return (
    <Tabs value={tab} onValueChange={handleChange}>
      <TabsList className="w-full">
        <TabsTrigger value="emoji-trends" className="flex-1">
          Emojis
        </TabsTrigger>
        <TabsTrigger value="user-trends" className="flex-1">
          Reactors
        </TabsTrigger>
        <TabsTrigger value="categories" className="flex-1">
          Categories
        </TabsTrigger>
      </TabsList>
      <div style={{ viewTransitionName: "chart-body" }}>
        <TabsContent value="emoji-trends" className="animate-none!">
          <EmojiTrendsChart />
        </TabsContent>
        <TabsContent value="user-trends" className="animate-none!">
          <UserTrendsChart />
        </TabsContent>
        <TabsContent value="categories" className="animate-none!">
          <CategoryChart />
        </TabsContent>
      </div>
    </Tabs>
  );
}
