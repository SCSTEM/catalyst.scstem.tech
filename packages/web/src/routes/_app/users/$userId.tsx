import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { UserDetail } from "@/components/UserDetail";

export const Route = createFileRoute("/_app/users/$userId")({
  component: UserDetailPage,
});

function UserDetailPage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();

  return (
    <UserDetail
      userId={userId}
      onBack={() => navigate({ to: "/users" })}
      onSelectEmoji={(emoji) =>
        navigate({ to: "/emojis/$emoji", params: { emoji } })
      }
    />
  );
}
