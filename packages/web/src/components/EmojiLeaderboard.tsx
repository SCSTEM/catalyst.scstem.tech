import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Emoji } from "./Emoji";
import { LeaderboardRow } from "./LeaderboardRow";

export function EmojiLeaderboard({
  onSelect,
}: {
  onSelect: (emoji: string) => void;
}) {
  const { data, isPending, error } = useQuery({
    queryKey: ["rankings", "emojis"],
    queryFn: async () => {
      const res = await api.api.rankings.emojis.$get();
      return await res.json();
    },
  });

  if (isPending) {
    return <p className="text-center text-muted-foreground">Loading...</p>;
  }
  if (error) {
    return <p className="text-center text-red-400">{error.message}</p>;
  }
  if (!data?.length) {
    return (
      <p className="text-center text-muted-foreground">No reactions yet</p>
    );
  }

  return (
    <div className="space-y-1">
      {data.map((entry, i) => (
        <LeaderboardRow
          key={entry.emoji}
          rank={i + 1}
          left={
            <Emoji
              name={entry.emoji}
              imageUrl={entry.imageUrl}
              size={28}
              hideTooltip
            />
          }
          label={`:${entry.emoji}:`}
          count={entry.count}
          onClick={() => onSelect(entry.emoji)}
        />
      ))}
    </div>
  );
}
