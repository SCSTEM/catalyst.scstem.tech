import { useQuery } from "@tanstack/react-query";
import DataLoader from "dataloader";
import type { InferResponseType } from "hono/client";
import { apiClient, fetchJson } from "@/lib/api";

export type Interval = "day" | "week" | "month";

export function useEmojiRankings(season: number) {
  const seasonParam = season.toString();
  return useQuery({
    queryKey: ["stats", "rankings", "emojis", season],
    queryFn: async () => {
      const res = await apiClient.api.rankings.emojis.$get({
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
      const res = await apiClient.api.rankings.users.$get({
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
      const res = await apiClient.api.emojis.users.$get({
        query: { ids: emoji, season: seasonParam },
      });
      const byEmoji = await fetchJson(res);
      return byEmoji[emoji] ?? [];
    },
  });
}

export function useUserEmojis(userId: string, season: number) {
  const seasonParam = season.toString();
  return useQuery({
    queryKey: ["stats", "users", userId, "emojis", season],
    queryFn: async () => {
      const res = await apiClient.api.users.emojis.$get({
        query: { ids: userId, season: seasonParam },
      });
      const byUser = await fetchJson(res);
      return byUser[userId] ?? { user: null, emojis: [] };
    },
  });
}

export function useEmojiTrends(season: number, interval: Interval) {
  const seasonParam = season.toString();
  return useQuery({
    queryKey: ["stats", "analytics", "emoji-trends", season, interval],
    queryFn: async () => {
      const res = await apiClient.api.analytics["emoji-trends"].$get({
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
      const res = await apiClient.api.analytics["user-trends"].$get({
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
      const res = await apiClient.api.rankings.emojis.$get({
        query: { limit: "200", season: seasonParam },
      });
      return fetchJson(res);
    },
  });
}

export function useParrotEmojis() {
  return useQuery({
    queryKey: ["stats", "emojis", "parrots"],
    queryFn: async () => {
      const res = await apiClient.api.emojis.parrots.$get();
      return fetchJson(res);
    },
    staleTime: 5 * 60_000,
  });
}

export type EmojiProfile = InferResponseType<
  typeof apiClient.api.emojis.profiles.$get
>[string];

const profileLoader = new DataLoader<string, EmojiProfile>(
  async (ids) => {
    const res = await apiClient.api.emojis.profiles.$get({
      query: { ids: ids.join(",") },
    });
    const byId = await fetchJson(res);
    return ids.map(
      (id) => byId[id] ?? new Error(`No profile for emoji "${id}"`),
    );
  },
  // DataLoader only coalesces same-tick loads; TanStack Query owns caching.
  { cache: false },
);

export function useEmojiProfile(id: string) {
  return useQuery({
    queryKey: ["stats", "emojis", "profile", id],
    queryFn: () => profileLoader.load(id),
  });
}

export function useSlackCustomEmojis() {
  return useQuery({
    queryKey: ["stats", "emojis", "map"],
    queryFn: async () => {
      const res = await apiClient.api.emojis.$get();
      return fetchJson(res);
    },
    staleTime: 5 * 60_000,
  });
}

export function useMetadata() {
  return useQuery({
    queryKey: ["stats", "metadata"],
    queryFn: async () => {
      const res = await apiClient.api.metadata.$get();
      return fetchJson(res);
    },
  });
}
