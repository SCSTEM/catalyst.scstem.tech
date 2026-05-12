import { useMetadata } from "@/hooks/queries";

/**
 * FRC seasons start in July. A date in July of year N belongs to season N+1.
 */
export function getCurrentFrcSeason(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 7 ? year + 1 : year;
}

export function useFrcSeasons(): string[] {
  const { data } = useMetadata();

  if (!data?.firstReactionDate) {
    return [];
  }

  const firstReactionDate = new Date(data.firstReactionDate);
  const lastSeason = getCurrentFrcSeason();
  const seasons: string[] = [];

  for (let year = firstReactionDate.getFullYear(); year <= lastSeason; year++) {
    seasons.push(year.toString());
  }

  return seasons;
}
