import { useCallback } from "react";
import { api } from "../api";
import { useQuery } from "./useQuery";

const fetchEmojiMap = async () => {
  const res = await api.api.emojis.$get();
  return await res.json();
};

type EmojiMap = Awaited<ReturnType<typeof fetchEmojiMap>>;

export function useEmojiMap() {
  const fetcher = useCallback(fetchEmojiMap, []);
  const { data, loading } = useQuery(fetcher, { key: "emojis:map" });

  return { map: data ?? ({} as EmojiMap), loading };
}
