import { useQuery } from "@tanstack/react-query";
import { api, fetchJson } from "@/lib/api";

export type Period = "day" | "week" | "month";

export function useEmojiRankings() {
  return useQuery({
    queryKey: ["stats", "rankings", "emojis"],
    queryFn: async () => {
      const res = await api.api.rankings.emojis.$get({ query: {} });
      return fetchJson(res);
    },
  });
}

export function useUserRankings() {
  return useQuery({
    queryKey: ["stats", "rankings", "users"],
    queryFn: async () => {
      const res = await api.api.rankings.users.$get({ query: { limit: "10" } });
      return fetchJson(res);
    },
  });
}

export function useEmojiUsers(emoji: string) {
  return useQuery({
    queryKey: ["stats", "emojis", emoji, "users"],
    queryFn: async () => {
      const res = await api.api.emojis[":emoji"].users.$get({
        param: { emoji },
        query: {},
      });
      return fetchJson(res);
    },
  });
}

export function useUserEmojis(userId: string) {
  return useQuery({
    queryKey: ["stats", "users", userId, "emojis"],
    queryFn: async () => {
      const res = await api.api.users[":userId"].emojis.$get({
        param: { userId },
        query: {},
      });
      return fetchJson(res);
    },
  });
}

export function useEmojiTrends(period: Period) {
  return useQuery({
    queryKey: ["stats", "analytics", "emoji-trends", period],
    queryFn: async () => {
      const res = await api.api.analytics["emoji-trends"].$get({
        query: { period },
      });
      return fetchJson(res);
    },
  });
}

export function useUserTrends(period: Period) {
  return useQuery({
    queryKey: ["stats", "analytics", "user-trends", period],
    queryFn: async () => {
      const res = await api.api.analytics["user-trends"].$get({
        query: { period },
      });
      return fetchJson(res);
    },
  });
}

export function useCategoryData() {
  return useQuery({
    queryKey: ["stats", "analytics", "categories"],
    queryFn: async () => {
      const res = await api.api.rankings.emojis.$get({
        query: { limit: "200" },
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
