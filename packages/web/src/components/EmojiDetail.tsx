import { useCallback } from "react";
import { api } from "../api";
import { useQuery } from "../hooks/useQuery";
import { Emoji } from "./Emoji";
import { LeaderboardRow } from "./LeaderboardRow";

export function EmojiDetail({
  emoji,
  onBack,
}: {
  emoji: string;
  onBack: () => void;
}) {
  const fetcher = useCallback(async () => {
    const res = await api.api.leaderboard.emojis[":emoji"].$get({
      param: { emoji },
    });
    return await res.json();
  }, [emoji]);
  const { data, loading, error } = useQuery(fetcher);

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm text-gray-400 hover:text-gray-200"
      >
        &larr; Back
      </button>
      <div className="mb-6 flex items-center gap-3">
        <Emoji name={emoji} size={40} />
        <h2 className="text-xl font-semibold">:{emoji}:</h2>
      </div>

      {loading && <p className="text-center text-gray-500">Loading...</p>}
      {error && <p className="text-center text-red-400">{error}</p>}
      {data && !data.length && (
        <p className="text-center text-gray-500">No users found</p>
      )}

      {data && data.length > 0 && (
        <div className="space-y-1">
          {data.map((entry, i) => (
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
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-700 text-xs">
                    ?
                  </div>
                )
              }
              label={entry.displayName || entry.userId}
              count={entry.count}
            />
          ))}
        </div>
      )}
    </div>
  );
}
