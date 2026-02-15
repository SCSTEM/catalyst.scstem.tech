import { useQuery } from "@tanstack/react-query";
import { api, fetchJson } from "@/lib/api";

const fetchSlackCustomEmojis = async () => {
  const res = await api.api.emojis.$get();
  return fetchJson(res);
};

export function useSlackCustomEmojis() {
  const { data, isPending } = useQuery({
    queryKey: ["emojis", "map"],
    queryFn: fetchSlackCustomEmojis,
    staleTime: 5 * 60_000,
  });

  return { data, loading: isPending };
}
