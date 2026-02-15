import { useQuery } from "@tanstack/react-query";
import { api, fetchJson } from "@/lib/api";
import { Avatar } from "./Avatar";
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
      return fetchJson(res);
    },
  });

  const user = data?.user;
  const emojis = data?.emojis ?? [];

  return (
    <DetailView
      onBack={onBack}
      icon={
        <Avatar
          url={user?.avatarUrl ?? null}
          name={user?.displayName ?? null}
          size={40}
        />
      }
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
