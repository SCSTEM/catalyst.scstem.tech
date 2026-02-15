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
      className="cursor-pointer flex w-full items-center gap-6 rounded-lg text-left transition-colors hover:bg-main hover:text-background h-10 pr-2"
    >
      <span className="w-6 text-right text-base md:text-xl">{rank}</span>
      <span className="shrink-0">{left}</span>
      <span className="min-w-0 flex-1 truncate text-sm md:text-inherit">
        {label}
      </span>
      <span className="font-mono">{count.toLocaleString()}</span>
    </button>
  );
}
