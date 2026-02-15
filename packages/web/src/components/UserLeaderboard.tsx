import { useQuery } from "@tanstack/react-query";
import { api, fetchJson } from "@/lib/api";
import { Avatar } from "./Avatar";
import { LeaderboardRow } from "./LeaderboardRow";

export function UserLeaderboard({
  onSelect,
}: {
  onSelect: (userId: string) => void;
}) {
  const { data, isPending, error } = useQuery({
    queryKey: ["rankings", "users"],
    queryFn: async () => {
      const res = await api.api.rankings.users.$get({
        query: { limit: "10" },
      });
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
    return <p className="text-center text-muted-foreground">No reactors yet</p>;
  }

  return (
    <div className="space-y-1">
      {data.map((entry, i) => (
        <LeaderboardRow
          key={entry.userId}
          rank={i + 1}
          left={<Avatar url={entry.avatarUrl} name={entry.displayName} />}
          label={entry.displayName || entry.userId}
          count={entry.totalCount}
          onClick={() => onSelect(entry.userId)}
        />
      ))}
    </div>
  );
}
