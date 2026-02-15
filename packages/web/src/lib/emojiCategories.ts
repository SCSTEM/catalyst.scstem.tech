import { gemoji } from "gemoji";

const CATEGORY_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#f97316",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#6366f1",
];

// Build name → category lookup from gemoji
const nameToCategory = new Map<string, string>();
for (const entry of gemoji) {
  for (const name of entry.names) {
    nameToCategory.set(name, entry.category);
  }
}

export function categorizeEmojis(
  emojis: Array<{ emoji: string; count: number }>,
): Array<{ category: string; count: number; fill: string }> {
  const categoryTotals = new Map<string, number>();

  for (const { emoji, count } of emojis) {
    const category = nameToCategory.get(emoji) ?? "Custom";
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + count);
  }

  return [...categoryTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, count], i) => ({
      category,
      count,
      fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length] ?? "var(--chart-1)",
    }));
}
