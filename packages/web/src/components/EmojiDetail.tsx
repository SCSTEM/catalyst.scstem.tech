import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { DetailView } from "./DetailView";
import { Emoji } from "./Emoji";
import { LeaderboardRow } from "./LeaderboardRow";

export function EmojiDetail({
  emoji,
  onBack,
  onSelectUser,
}: {
  emoji: string;
  onBack: () => void;
  onSelectUser: (userId: string) => void;
}) {
  const { data, isPending, error } = useQuery({
    queryKey: ["emojis", emoji, "users"],
    queryFn: async () => {
      const res = await api.api.emojis[":emoji"].users.$get({
        param: { emoji },
      });
      return await res.json();
    },
  });

  return (
    <DetailView
      onBack={onBack}
      icon={<Emoji name={emoji} size={40} hideTooltip />}
      title={`:${emoji}:`}
      loading={isPending}
      error={error?.message ?? null}
      emptyMessage="No users found"
      isEmpty={!isPending && (!data || data.length === 0)}
    >
      <div className="space-y-1">
        {data?.map((entry, i) => (
          <LeaderboardRow
            key={entry.userId}
            rank={i + 1}
            left={
              entry.avatarUrl ? (
                <img
                  src={entry.avatarUrl}
                  alt={entry.displayName ?? "User"}
                  className="h-7 w-7 rounded-full"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs">
                  ?
                </div>
              )
            }
            label={entry.displayName || entry.userId}
            count={entry.count}
            onClick={() => onSelectUser(entry.userId)}
          />
        ))}
      </div>
    </DetailView>
  );
}
