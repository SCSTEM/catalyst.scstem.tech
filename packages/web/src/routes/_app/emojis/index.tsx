import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EmojiLeaderboard } from "@/components/EmojiLeaderboard";

export const Route = createFileRoute("/_app/emojis/")({
  component: EmojisPage,
});

function EmojisPage() {
  const navigate = useNavigate();

  return (
    <EmojiLeaderboard
      onSelect={(emoji) =>
        navigate({ to: "/emojis/$emoji", params: { emoji } })
      }
    />
  );
}
