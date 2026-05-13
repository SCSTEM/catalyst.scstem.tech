import type { ReactNode } from "react";
import { Emoji } from "@/components/stats/Emoji";
import { Card } from "@/components/ui/card";

export type ParrotProfile = {
  emoji: string;
  prose: ReactNode;
  firstUsedAt: string;
  firstUser: string;
  topUser: string;
  totalCount: number;
};

export function ParrotProfileCard({
  emoji,
  firstUsedAt,
  firstUser,
  topUser,
  totalCount,
}: ParrotProfile) {
  return (
    <Card className="relative gap-5 p-4 bg-[oklch(14%_0.05_290/0.5)] backdrop-blur-sm border-parrot shadow-none!">
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-3">
          <div className="parrot-emoji-hero">
            <Emoji name={emoji} size={160} hideTooltip />
          </div>
          <div className="font-mono text-xl md:text-2xl text-main-foreground bg-main px-3 py-1 rounded-base border-2 border-border shadow-shadow">
            :{emoji}:
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 md:gap-6 m-auto">
          <Stat label="First used" value={firstUsedAt} />
          <Stat label="Total reactions" value={totalCount.toLocaleString()} />
          <Stat label="First reactor" value={firstUser} />
          <Stat label="Top reactor" value={topUser} />
        </dl>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wider text-parrot">{label}</dt>
      <dd className="font-heading text-base md:text-lg">{value}</dd>
    </div>
  );
}
