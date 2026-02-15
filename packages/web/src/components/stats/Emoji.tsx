import { nameToEmoji } from "gemoji";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSlackCustomEmojis } from "@/hooks/queries";

const REMAP: Record<string, string> = {
  rolling_on_the_floor_laughing: "rofl",
  biohazard_sign: "biohazard",
  robot_face: "robot",
  thinking_face: "thinking",
};

type EmojiProps = {
  name: string;
  hideTooltip?: boolean;
  size?: number;
};

export function Emoji({ name, hideTooltip = false, size = 24 }: EmojiProps) {
  const { data: emojiMap } = useSlackCustomEmojis();
  const customUrl = emojiMap?.[name];
  const unicode = !customUrl ? nameToEmoji[REMAP[name] ?? name] : undefined;

  const element = customUrl ? (
    <img
      src={customUrl}
      width={size}
      height={size}
      className="inline-block"
      loading="lazy"
    />
  ) : unicode ? (
    <span style={{ fontSize: size }}>{unicode}</span>
  ) : (
    <span className="rounded bg-muted px-1 text-sm text-muted-foreground">
      :{name}:
    </span>
  );

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
