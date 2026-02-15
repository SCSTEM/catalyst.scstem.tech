import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Avatar } from "@/components/Avatar";
import { LeaderboardRow } from "@/components/stats/LeaderboardRow";
import { useUserRankings } from "@/hooks/queries";

export const Route = createFileRoute("/stats/users/")({
  component: UsersPage,
});

function UsersPage() {
  const navigate = useNavigate();
  const { data, isPending, error } = useUserRankings();

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
          onClick={() =>
            navigate({
              to: "/stats/users/$userId",
              params: { userId: entry.userId },
            })
          }
        />
      ))}
    </div>
  );
}
