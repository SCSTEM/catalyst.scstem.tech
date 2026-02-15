import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EmojiDetail } from "@/components/EmojiDetail";

export const Route = createFileRoute("/_app/emojis/$emoji")({
  component: EmojiDetailPage,
});

function EmojiDetailPage() {
  const { emoji } = Route.useParams();
  const navigate = useNavigate();

  return (
    <EmojiDetail
      emoji={emoji}
      onBack={() => navigate({ to: "/emojis" })}
      onSelectUser={(userId) =>
        navigate({ to: "/users/$userId", params: { userId } })
      }
    />
  );
}
