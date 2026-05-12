import { useQuery } from "@tanstack/react-query";
import { api, fetchJson } from "@/lib/api";

export type Interval = "day" | "week" | "month";

export function useEmojiRankings(season: number) {
  const seasonParam = season.toString();
  return useQuery({
    queryKey: ["stats", "rankings", "emojis", season],
    queryFn: async () => {
      const res = await api.api.rankings.emojis.$get({
        query: { season: seasonParam },
      });
      return fetchJson(res);
    },
  });
}

export function useUserRankings(season: number) {
  const seasonParam = season.toString();
  return useQuery({
    queryKey: ["stats", "rankings", "users", season],
    queryFn: async () => {
      const res = await api.api.rankings.users.$get({
        query: { limit: "10", season: seasonParam },
      });
      return fetchJson(res);
    },
  });
}

export function useEmojiUsers(emoji: string, season: number) {
  const seasonParam = season.toString();
  return useQuery({
    queryKey: ["stats", "emojis", emoji, "users", season],
    queryFn: async () => {
      const res = await api.api.emojis[":emoji"].users.$get({
        param: { emoji },
        query: { season: seasonParam },
      });
      return fetchJson(res);
    },
  });
}

export function useUserEmojis(userId: string, season: number) {
  const seasonParam = season.toString();
  return useQuery({
    queryKey: ["stats", "users", userId, "emojis", season],
    queryFn: async () => {
      const res = await api.api.users[":userId"].emojis.$get({
        param: { userId },
        query: { season: seasonParam },
      });
      return fetchJson(res);
    },
  });
}

export function useEmojiTrends(season: number, interval: Interval) {
  const seasonParam = season.toString();
  return useQuery({
    queryKey: ["stats", "analytics", "emoji-trends", season, interval],
    queryFn: async () => {
      const res = await api.api.analytics["emoji-trends"].$get({
        query: { period: interval, season: seasonParam },
      });
      return fetchJson(res);
    },
  });
}

export function useUserTrends(season: number, interval: Interval) {
  const seasonParam = season.toString();
  return useQuery({
    queryKey: ["stats", "analytics", "user-trends", season, interval],
    queryFn: async () => {
      const res = await api.api.analytics["user-trends"].$get({
        query: { period: interval, season: seasonParam },
      });
      return fetchJson(res);
    },
  });
}

export function useCategoryData(season: number) {
  const seasonParam = season.toString();
  return useQuery({
    queryKey: ["stats", "analytics", "categories", season],
    queryFn: async () => {
      const res = await api.api.rankings.emojis.$get({
        query: { limit: "200", season: seasonParam },
      });
      return fetchJson(res);
    },
  });
}

export function useSlackCustomEmojis() {
  return useQuery({
    queryKey: ["stats", "emojis", "map"],
    queryFn: async () => {
      const res = await api.api.emojis.$get();
      return fetchJson(res);
    },
    staleTime: 5 * 60_000,
  });
}

export function useMetadata() {
  return useQuery({
    queryKey: ["stats", "metadata"],
    queryFn: async () => {
      const res = await api.api.metadata.$get();
      return fetchJson(res);
    },
  });
}
