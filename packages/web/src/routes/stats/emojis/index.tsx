import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Emoji } from "@/components/stats/Emoji";
import { LeaderboardRow } from "@/components/stats/LeaderboardRow";
import { useEmojiRankings } from "@/hooks/queries";

export const Route = createFileRoute("/stats/emojis/")({
  head: () => ({
    meta: [{ title: "Top Reactions | Catalyst" }],
  }),
  component: EmojisPage,
});

function EmojisPage() {
  const navigate = useNavigate();
  const { data, isPending, error } = useEmojiRankings();

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
