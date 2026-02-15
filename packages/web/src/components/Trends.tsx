import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { api, fetchJson } from "@/lib/api";
import { categorizeEmojis } from "@/lib/emojiCategories";
import { Emoji } from "./Emoji";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import type { ChartConfig } from "./ui/chart";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "./ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#f97316",
  "#a855f7",
  "#ec4899",
];

type Period = "day" | "week" | "month";

function PeriodSelector({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as Period)}>
      <TabsList className="w-full">
        {(["day", "week", "month"] as const).map((p) => (
          <TabsTrigger key={p} value={p} className="w-full">
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

// --- Shared area chart shell ---

interface TrendChartProps {
  title: string;
  description: string;
  series: Record<string, unknown>[];
  keys: string[];
  config: ChartConfig;
  loading: boolean;
  error: string | null;
  stacked?: boolean;
  period: Period;
  onPeriodChange: (p: Period) => void;
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
  period,
  onPeriodChange,
}: TrendChartProps) {
  return (
    <Card className="shadow-none! border-0 md:py-6 py-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction className="hidden md:block">
          <PeriodSelector value={period} onChange={onPeriodChange} />
        </CardAction>
      </CardHeader>
      <CardContent className="md:px-6 px-2">
        {loading && (
          <p className="py-12 text-center text-muted-foreground">Loading...</p>
        )}
        {error && <p className="py-12 text-center text-red-400">{error}</p>}
        {!loading && !error && series.length > 0 && (
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
                  fillOpacity={0.15}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  stackId={stacked ? "a" : undefined}
                />
              ))}
            </AreaChart>
          </ChartContainer>
        )}
        {!loading && !error && series.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">
            No data for this period
          </p>
        )}
      </CardContent>
      <div className="px-6 md:hidden">
        <PeriodSelector value={period} onChange={onPeriodChange} />
      </div>
    </Card>
  );
}

// --- Concrete charts ---

function EmojiTrendsChart() {
  const [period, setPeriod] = useState<Period>("week");

  const { data, isPending, error } = useQuery({
    queryKey: ["analytics", "emoji-trends", period],
    queryFn: async () => {
      const res = await api.api.analytics["emoji-trends"].$get({
        query: { period },
      });
      return fetchJson(res);
    },
  });

  const chartConfig = useMemo<ChartConfig>(() => {
    if (!data) {
      return {};
    }
    const config: ChartConfig = {
      total: { label: "Total", color: "var(--chart-active-dot)" },
    };
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
      series={data?.series ?? []}
      keys={data?.emojis ?? []}
      config={chartConfig}
      loading={isPending}
      error={error?.message ?? null}
      stacked
      period={period}
      onPeriodChange={setPeriod}
    />
  );
}

function UserTrendsChart() {
  const [period, setPeriod] = useState<Period>("week");

  const { data, isPending, error } = useQuery({
    queryKey: ["analytics", "user-trends", period],
    queryFn: async () => {
      const res = await api.api.analytics["user-trends"].$get({
        query: { period },
      });
      return fetchJson(res);
    },
  });

  const userIds = useMemo(() => {
    if (!data?.series.length) {
      return [];
    }
    const ids = new Set<string>();
    for (const point of data.series) {
      for (const key of Object.keys(point)) {
        if (key !== "period") {
          ids.add(key);
        }
      }
    }
    return [...ids];
  }, [data]);

  const chartConfig = useMemo<ChartConfig>(() => {
    if (!data) {
      return {};
    }
    const config: ChartConfig = {};
    for (const [i, userId] of userIds.entries()) {
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
  }, [data, userIds]);

  return (
    <TrendChart
      title="Top Reactors"
      description="Most active reactors over time"
      series={data?.series ?? []}
      keys={userIds}
      config={chartConfig}
      loading={isPending}
      error={error?.message ?? null}
      period={period}
      onPeriodChange={setPeriod}
    />
  );
}

function CategoryChart() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const pieInner = isDesktop ? 80 : 55;
  const pieOuter = isDesktop ? 140 : 95;
  const labelY1 = isDesktop ? -42 : -72;
  const labelY2 = isDesktop ? -12 : -48;

  const { data, isPending, error } = useQuery({
    queryKey: ["analytics", "categories"],
    queryFn: async () => {
      const res = await api.api.rankings.emojis.$get({
        query: { limit: "200" },
      });
      return fetchJson(res);
    },
  });

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
    <Card className="shadow-none! border-0">
      <CardHeader>
        <CardTitle>Categories</CardTitle>
        <CardDescription>Reaction emoji usage by category</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending && (
          <p className="py-12 text-center text-muted-foreground">Loading...</p>
        )}
        {error && (
          <p className="py-12 text-center text-red-400">{error.message}</p>
        )}
        {categories.length > 0 && (
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
        )}
      </CardContent>
    </Card>
  );
}

export function Trends() {
  return (
    <Tabs defaultValue="emoji-trends">
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
      <TabsContent value="emoji-trends">
        <EmojiTrendsChart />
      </TabsContent>
      <TabsContent value="user-trends">
        <UserTrendsChart />
      </TabsContent>
      <TabsContent value="categories">
        <CategoryChart />
      </TabsContent>
    </Tabs>
  );
}
