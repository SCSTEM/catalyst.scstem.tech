import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

const fetchEmojiMap = async () => {
  const res = await api.api.emojis.$get();
  return await res.json();
};

type EmojiMap = Awaited<ReturnType<typeof fetchEmojiMap>>;

export function useEmojiMap() {
  const { data, isPending } = useQuery({
    queryKey: ["emojis", "map"],
    queryFn: fetchEmojiMap,
    staleTime: 5 * 60_000,
  });

  return { map: data ?? ({} as EmojiMap), loading: isPending };
}
