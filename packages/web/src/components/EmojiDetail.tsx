import { useCallback } from "react";
import { api } from "../api";
import { useQuery } from "../hooks/useQuery";
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
  const fetcher = useCallback(async () => {
    const res = await api.api.emojis[":emoji"].users.$get({
      param: { emoji },
    });
    return await res.json();
  }, [emoji]);
  const { data, loading, error } = useQuery(fetcher, {
    key: `emoji:${emoji}:users`,
  });

  return (
    <DetailView
      onBack={onBack}
      icon={<Emoji name={emoji} size={40} hideTooltip />}
      title={`:${emoji}:`}
      loading={loading}
      error={error}
      emptyMessage="No users found"
      isEmpty={!loading && (!data || data.length === 0)}
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
