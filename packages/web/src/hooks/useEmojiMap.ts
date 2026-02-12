import { useCallback } from "react";
import { api } from "../api";
import { useQuery } from "./useQuery";

const fetchEmojiMap = async () => {
  const res = await api.api.emojis.$get();
  return await res.json();
};

type EmojiMap = Awaited<ReturnType<typeof fetchEmojiMap>>;

let cachedMap: EmojiMap | null = null;

export function useEmojiMap() {
  const fetcher = useCallback(async () => {
    if (cachedMap) {
      return cachedMap;
    }
    const data = await fetchEmojiMap();
    cachedMap = data;
    return data;
  }, []);

  const { data, loading } = useQuery(fetcher);

  return { map: data ?? ({} as EmojiMap), loading };
}
