import { useEmojiMap } from "../hooks/useEmojiMap";
import { slackNameToUnicode } from "../slackEmoji";

export function Emoji({
  name,
  imageUrl,
  size = 24,
}: {
  name: string;
  imageUrl?: string | null;
  size?: number;
}) {
  const { map } = useEmojiMap();

  // 1. If we have a direct image URL (from DB join), use it
  const customUrl = imageUrl ?? map[name];
  if (customUrl) {
    return (
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

  // 2. Try standard emoji Unicode mapping
  const unicode = slackNameToUnicode(name);
  if (unicode) {
    return (
      <span title={`:${name}:`} style={{ fontSize: size }}>
        {unicode}
      </span>
    );
  }

  // 3. Fallback: text
  return (
    <span
      className="rounded bg-gray-800 px-1 text-sm text-gray-400"
      title={`:${name}:`}
    >
      :{name}:
    </span>
  );
}
