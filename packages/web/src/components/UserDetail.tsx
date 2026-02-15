import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { DetailView } from "./DetailView";
import { Emoji } from "./Emoji";
import { LeaderboardRow } from "./LeaderboardRow";

export function UserDetail({
  userId,
  onBack,
  onSelectEmoji,
}: {
  userId: string;
  onBack: () => void;
  onSelectEmoji: (emoji: string) => void;
}) {
  const { data, isPending, error } = useQuery({
    queryKey: ["users", userId, "emojis"],
    queryFn: async () => {
      const res = await api.api.users[":userId"].emojis.$get({
        param: { userId },
      });
      return await res.json();
    },
  });

  const user = data?.user;
  const emojis = data?.emojis ?? [];

  const icon = user?.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt={user.displayName}
      className="h-10 w-10 rounded-full"
    />
  ) : (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
      ?
    </div>
  );

  return (
    <DetailView
      onBack={onBack}
      icon={icon}
      title={user?.displayName || userId}
      loading={isPending}
      error={error?.message ?? null}
      emptyMessage="No reactions found"
      isEmpty={!isPending && emojis.length === 0}
    >
      <div className="space-y-1">
        {emojis.map((entry, i) => (
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
            onClick={() => onSelectEmoji(entry.emoji)}
          />
        ))}
      </div>
    </DetailView>
  );
}
