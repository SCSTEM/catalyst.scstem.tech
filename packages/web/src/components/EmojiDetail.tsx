import { useQuery } from "@tanstack/react-query";
import { api, fetchJson } from "@/lib/api";
import { Avatar } from "./Avatar";
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
      return fetchJson(res);
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
            left={<Avatar url={entry.avatarUrl} name={entry.displayName} />}
            label={entry.displayName || entry.userId}
            count={entry.count}
            onClick={() => onSelectUser(entry.userId)}
          />
        ))}
      </div>
    </DetailView>
  );
}
