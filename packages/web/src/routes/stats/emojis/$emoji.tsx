import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Avatar } from "@/components/Avatar";
import { DetailView } from "@/components/stats/DetailView";
import { Emoji } from "@/components/stats/Emoji";
import { LeaderboardRow } from "@/components/stats/LeaderboardRow";
import { useEmojiUsers } from "@/hooks/queries";
import { resolveEmojiUnicode } from "@/lib/emoji";

function emojiTitle(name: string): string {
  const unicode = resolveEmojiUnicode(name);
  return unicode ? `${unicode} | Catalyst` : `:${name}: | Catalyst`;
}

export const Route = createFileRoute("/stats/emojis/$emoji")({
  head: ({ params }) => ({
    meta: [{ title: emojiTitle(params.emoji) }],
  }),
  component: EmojiDetailPage,
});

function EmojiDetailPage() {
  const { emoji } = Route.useParams();
  const navigate = useNavigate();
  const { data, isPending, error } = useEmojiUsers(emoji);

  return (
    <DetailView
      icon={<Emoji name={emoji} size={40} hideTooltip />}
      title={`:${emoji}:`}
      loading={isPending}
      error={error?.message}
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
            onClick={() =>
              navigate({
                to: "/stats/users/$userId",
                params: { userId: entry.userId },
              })
            }
          />
        ))}
      </div>
    </DetailView>
  );
}
