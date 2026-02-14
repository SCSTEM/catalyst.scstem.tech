import { useCallback } from "react";
import { api } from "../api";
import { useQuery } from "../hooks/useQuery";
import { Emoji } from "./Emoji";
import { LeaderboardRow } from "./LeaderboardRow";

export function EmojiLeaderboard({
  onSelect,
  pollingInterval,
}: {
  onSelect: (emoji: string) => void;
  pollingInterval?: number;
}) {
  const fetcher = useCallback(async () => {
    const res = await api.api.rankings.emojis.$get();
    return await res.json();
  }, []);
  const { data, loading, error } = useQuery(fetcher, { pollingInterval });

  if (loading) {
    return <p className="text-center text-gray-500">Loading...</p>;
  }
  if (error) {
    return <p className="text-center text-red-400">{error}</p>;
  }
  if (!data?.length) {
    return <p className="text-center text-gray-500">No reactions yet</p>;
  }

  return (
    <div className="space-y-1">
      {data.map((entry, i) => (
        <LeaderboardRow
          key={entry.emoji}
          rank={i + 1}
          left={
            <Emoji name={entry.emoji} imageUrl={entry.imageUrl} size={28} />
          }
          label={`:${entry.emoji}:`}
          count={entry.count}
          onClick={() => onSelect(entry.emoji)}
        />
      ))}
    </div>
  );
}
