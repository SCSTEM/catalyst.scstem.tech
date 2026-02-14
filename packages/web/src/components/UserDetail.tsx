import { useCallback } from "react";
import { api } from "../api";
import { useQuery } from "../hooks/useQuery";
import { Emoji } from "./Emoji";
import { LeaderboardRow } from "./LeaderboardRow";

export function UserDetail({
  userId,
  onBack,
}: {
  userId: string;
  onBack: () => void;
}) {
  const fetcher = useCallback(async () => {
    const res = await api.api.users[":userId"].emojis.$get({
      param: { userId },
    });
    return await res.json();
  }, [userId]);
  const { data, loading, error } = useQuery(fetcher);

  const user = data?.user;
  const emojis = data?.emojis ?? [];

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm text-gray-400 hover:text-gray-200"
      >
        &larr; Back
      </button>

      {user && (
        <div className="mb-6 flex items-center gap-3">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className="h-10 w-10 rounded-full"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700">
              ?
            </div>
          )}
          <h2 className="text-xl font-semibold">
            {user.displayName || userId}
          </h2>
        </div>
      )}
      {!user && !loading && (
        <h2 className="mb-6 text-xl font-semibold">{userId}</h2>
      )}

      {loading && <p className="text-center text-gray-500">Loading...</p>}
      {error && <p className="text-center text-red-400">{error}</p>}
      {!loading && !emojis.length && (
        <p className="text-center text-gray-500">No reactions found</p>
      )}

      {emojis.length > 0 && (
        <div className="space-y-1">
          {emojis.map((entry, i) => (
            <LeaderboardRow
              key={entry.emoji}
              rank={i + 1}
              left={
                <Emoji name={entry.emoji} imageUrl={entry.imageUrl} size={28} />
              }
              label={`:${entry.emoji}:`}
              count={entry.count}
            />
          ))}
        </div>
      )}
    </div>
  );
}
