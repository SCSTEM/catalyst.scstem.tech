import { createContext, type ReactNode, useContext, useState } from "react";
import { getCurrentFrcSeason } from "@/hooks/useFrcSeasons";

type ChartBucket = "day" | "week" | "month" | "year";

type StatsFilterContextState = {
  frcSeason: number;
  setFrcSeason: (frcSeason: number) => void;
  chartBucket: ChartBucket;
  setChartBucket: (chartBucket: ChartBucket) => void;
};

const StatsFiltersContext = createContext<StatsFilterContextState | undefined>({
  frcSeason: getCurrentFrcSeason(),
  chartBucket: "week",
  setFrcSeason: () => {},
  setChartBucket: () => {},
});

export function StatsFiltersProvider({ children }: { children: ReactNode }) {
  const [year, setYear] = useState(getCurrentFrcSeason());
  const [chartBucket, setChartBucket] = useState<ChartBucket>("week");

  return (
    <StatsFiltersContext.Provider
      value={{
        frcSeason: year,
        setFrcSeason: setYear,
        chartBucket,
        setChartBucket,
      }}
    >
      {children}
    </StatsFiltersContext.Provider>
  );
}

export const useStatsFilters = () => {
  const context = useContext(StatsFiltersContext);
  if (!context) {
    throw new Error(
      "useStatsFilters must be used within a StatsFiltersProvider",
    );
  }
  return context;
};
