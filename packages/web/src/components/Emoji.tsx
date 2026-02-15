import { nameToEmoji } from "gemoji";
import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEmojiMap } from "@/hooks/useEmojiMap";

export function Emoji({
  name,
  imageUrl,
  hideTooltip = false,
  size = 24,
}: {
  name: string;
  imageUrl?: string | null;
  hideTooltip?: boolean;
  size?: number;
}) {
  const { map } = useEmojiMap();

  // Default to showing the emoji name if we can't find an image
  let element: ReactNode = (
    <span
      className="rounded bg-muted px-1 text-sm text-muted-foreground"
      title={`:${name}:`}
    >
      :{name}:
    </span>
  );

  // Try standard emoji Unicode mapping
  const unicode = nameToEmoji[remapName(name)];
  if (unicode) {
    element = (
      <span title={`:${name}:`} style={{ fontSize: size }}>
        {unicode}
      </span>
    );
  }

  // If we have a direct image URL (from DB join), use it
  const customUrl = imageUrl ?? map[name];
  if (customUrl) {
    element = (
      <img
        src={customUrl}
        alt={`:${name}:`}
        title={`:${name}:`}
        width={size}
        height={size}
        className="inline-block"
        loading="lazy"
      />
    );
  }

  if (hideTooltip) {
    return element;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{element}</TooltipTrigger>
      <TooltipContent>{`:${name}:`}</TooltipContent>
    </Tooltip>
  );
}

function remapName(name: string): string {
  switch (name) {
    case "rolling_on_the_floor_laughing":
      return "rofl";
    case "biohazard_sign":
      return "biohazard";
    case "robot_face":
      return "robot";
    default:
      return name;
  }
}
