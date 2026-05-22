import { Emoji } from "@/components/stats/Emoji";
import { Card } from "@/components/ui/card";
import { useEmojiProfile } from "@/hooks/queries";

const DASH = "—";

export function ParrotProfileCard({ emoji }: { emoji: string }) {
  const { data: profile } = useEmojiProfile(emoji);

  const firstUsedAt = formatMonthYear(profile?.firstUsedAt) ?? DASH;
  const firstUser = userLabel(profile?.firstUser) ?? DASH;
  const topUser = userLabel(profile?.topUser) ?? DASH;
  const totalCount = profile ? profile.totalCount.toLocaleString() : DASH;

  return (
    <Card className="relative gap-5 p-3 md:p-4 bg-parrot-card-bg backdrop-blur-sm border-parrot shadow-none!">
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-3 w-40 md:w-70 my-auto">
          <Emoji name={emoji} size={160} hideTooltip />
          <div className="font-mono text-md md:text-2xl text-main-foreground bg-main w-full md:px-3 py-1 rounded-base border-2 border-border shadow-shadow text-center truncate text-ellipsis">
            :{emoji}:
          </div>
        </div>
        <dl className="grid md:grid-cols-2 gap-3 md:gap-6 m-auto">
          <Stat label="First used" value={firstUsedAt} />
          <Stat label="Total reactions" value={totalCount} />
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

function userLabel(
  user: { displayName: string; userId: string } | null | undefined,
): string | null {
  if (!user) {
    return null;
  }
  return user.displayName || user.userId;
}

function formatMonthYear(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  // DB stores either "YYYY-MM-DD HH:MM:SS" (live) or ISO 8601 (backfill).
  const normalized = raw.includes("T") ? raw : `${raw.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
}
