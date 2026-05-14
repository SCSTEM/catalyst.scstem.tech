import { getIdenticonSeed } from "@/lib/anonymous";
import { cn } from "@/lib/utils";

type AnonymousAvatarProps = {
  userId: string;
  size?: number;
};

const GRID = 5;

export function AnonymousAvatar({ userId, size = 28 }: AnonymousAvatarProps) {
  const { cells, hue } = getIdenticonSeed(userId);
  const fg = `oklch(70% 0.18 ${hue})`;
  const bg = `oklch(22% 0.05 ${hue})`;

  return (
    <svg
      aria-label="Anonymous user avatar"
      role="img"
      viewBox={`0 0 ${GRID} ${GRID}`}
      shapeRendering="crispEdges"
      width={size}
      height={size}
      className={cn("rounded-full")}
      style={{ background: bg }}
    >
      {cells.map((on, i) => {
        if (!on) {
          return null;
        }
        const col = i % 3;
        const row = Math.floor(i / 3);
        const key = `${row}-${col}`;
        return (
          <g key={key}>
            <rect x={col} y={row} width={1} height={1} fill={fg} />
            <rect x={GRID - 1 - col} y={row} width={1} height={1} fill={fg} />
          </g>
        );
      })}
    </svg>
  );
}
