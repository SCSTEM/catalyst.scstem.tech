import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { LeaderboardRow } from "./LeaderboardRow";

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? "User"}
        className="h-7 w-7 rounded-full"
        loading="lazy"
      />
    );
  }
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs">
      ?
    </div>
  );
}

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
