import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { UserLeaderboard } from "@/components/UserLeaderboard";

export const Route = createFileRoute("/_app/users/")({
  component: UsersPage,
});

function UsersPage() {
  const navigate = useNavigate();

  return (
    <UserLeaderboard
      onSelect={(userId) =>
        navigate({ to: "/users/$userId", params: { userId } })
      }
    />
  );
}
