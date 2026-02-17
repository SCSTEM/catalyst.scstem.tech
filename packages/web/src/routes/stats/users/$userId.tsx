import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Avatar } from "@/components/Avatar";
import { DetailView } from "@/components/stats/DetailView";
import { Emoji } from "@/components/stats/Emoji";
import { LeaderboardRow } from "@/components/stats/LeaderboardRow";
import { useUserEmojis } from "@/hooks/queries";

export const Route = createFileRoute("/stats/users/$userId")({
  head: () => ({
    meta: [{ title: "Catalyst" }],
  }),
  component: UserDetailPage,
});

function UserDetailPage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const { data, isPending, error } = useUserEmojis(userId);

  const displayName = data?.user?.displayName;
  useEffect(() => {
    document.title = displayName ? `${displayName} | Catalyst` : "Catalyst";
  }, [displayName]);

  const user = data?.user;
  const emojis = data?.emojis ?? [];

  return (
    <DetailView
      icon={<Avatar url={user?.avatarUrl} name={user?.displayName} size={40} />}
      title={user?.displayName || userId}
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
