import { createContext, type ReactNode, useContext, useState } from "react";
import { getCurrentFrcSeason } from "@/hooks/useFrcSeasons";
import type { ChartInterval } from "@/lib/utils";

type StatsFilterContextState = {
  frcSeason: number;
  setFrcSeason: (frcSeason: number) => void;
  chartInterval: ChartInterval;
  setChartInterval: (chartInterval: ChartInterval) => void;
};

const StatsFiltersContext = createContext<StatsFilterContextState | undefined>({
  frcSeason: getCurrentFrcSeason(),
  setFrcSeason: () => {},
  chartInterval: "week",
  setChartInterval: () => {},
});

export function StatsFiltersProvider({ children }: { children: ReactNode }) {
  const [frcSeason, setFrcSeason] = useState(getCurrentFrcSeason());
  const [chartInterval, setChartInterval] = useState<ChartInterval>("week");

  return (
    <StatsFiltersContext.Provider
      value={{
        frcSeason,
        setFrcSeason,
        chartInterval,
        setChartInterval,
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
