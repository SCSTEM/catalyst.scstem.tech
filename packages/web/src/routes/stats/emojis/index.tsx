import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Emoji } from "@/components/stats/Emoji";
import { LeaderboardRow } from "@/components/stats/LeaderboardRow";
import { api, fetchJson } from "@/lib/api";

export const Route = createFileRoute("/stats/emojis/")({
  component: EmojisPage,
});

function EmojisPage() {
  const navigate = useNavigate();

  const { data, isPending, error } = useQuery({
    queryKey: ["rankings", "emojis"],
    queryFn: async () => {
      const res = await api.api.rankings.emojis.$get();
      return fetchJson(res);
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
          left={<Emoji name={entry.emoji} size={28} hideTooltip />}
          label={`:${entry.emoji}:`}
          count={entry.count}
          onClick={() =>
            navigate({
              to: "/stats/emojis/$emoji",
              params: { emoji: entry.emoji },
            })
          }
        />
      ))}
    </div>
  );
}
