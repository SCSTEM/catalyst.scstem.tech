import type { ReactNode } from "react";

export function LeaderboardRow({
  rank,
  left,
  label,
  count,
  onClick,
}: {
  rank: number;
  left: ReactNode;
  label: string;
  count: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-800/60"
    >
      <span className="w-8 text-right text-sm text-gray-500">{rank}</span>
      <span className="flex-shrink-0">{left}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="font-mono text-sm text-gray-400">
        {count.toLocaleString()}
      </span>
    </button>
  );
}
