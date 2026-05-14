import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Avatar } from "@/components/Avatar";
import { DetailView } from "@/components/stats/DetailView";
import { Emoji } from "@/components/stats/Emoji";
import { LeaderboardRow } from "@/components/stats/LeaderboardRow";
import { UserName } from "@/components/UserName";
import { useEmojiUsers } from "@/hooks/queries";
import { useStatsFilters } from "@/hooks/useStatsFilter";
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
  const { frcSeason } = useStatsFilters();
  const { data, isPending, error } = useEmojiUsers(emoji, frcSeason);

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
            left={
              <Avatar
                url={entry.avatarUrl}
                name={entry.displayName}
                userId={entry.userId}
              />
            }
            label={
              <UserName userId={entry.userId} displayName={entry.displayName} />
            }
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
