import { nameToEmoji } from "gemoji";

/** Slack names that differ from the gemoji standard */
export const SLACK_EMOJI_REMAP: Record<string, string> = {
  rolling_on_the_floor_laughing: "rofl",
  biohazard_sign: "biohazard",
  robot_face: "robot",
  thinking_face: "thinking",
};

/** Resolve a Slack emoji name to its unicode character, or undefined if custom/unknown. */
export function resolveEmojiUnicode(name: string): string | undefined {
  return nameToEmoji[SLACK_EMOJI_REMAP[name] ?? name];
}
