import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Avatar } from "@/components/Avatar";
import { DetailView } from "@/components/stats/DetailView";
import { Emoji } from "@/components/stats/Emoji";
import { LeaderboardRow } from "@/components/stats/LeaderboardRow";
import { UserName } from "@/components/UserName";
import { useUserEmojis } from "@/hooks/queries";
import { useStatsFilters } from "@/hooks/useStatsFilter";
import { isAnonymousMode } from "@/lib/api";

export const Route = createFileRoute("/stats/users/$userId")({
  head: () => ({
    meta: [{ title: "Catalyst" }],
  }),
  component: UserDetailPage,
});

function UserDetailPage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const { frcSeason } = useStatsFilters();
  const { data, isPending, error } = useUserEmojis(userId, frcSeason);

  const displayName = data?.user?.displayName;
  useEffect(() => {
    if (displayName) {
      document.title = `${displayName} | Catalyst`;
    } else if (isAnonymousMode()) {
      document.title = "Anonymous Reactor | Catalyst";
    } else {
      document.title = "Catalyst";
    }
  }, [displayName]);

  const user = data?.user;
  const emojis = data?.emojis ?? [];

  return (
    <DetailView
      icon={
        <Avatar
          url={user?.avatarUrl}
          name={user?.displayName}
          userId={userId}
          size={40}
        />
      }
      title={<UserName userId={userId} displayName={user?.displayName} />}
      loading={isPending}
      error={error?.message}
      emptyMessage="No reactions found"
      isEmpty={!isPending && emojis.length === 0}
    >
      <div className="space-y-1">
        {emojis.map((entry, i) => (
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
    </DetailView>
  );
}
