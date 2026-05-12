import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const chartIntervals = ["day", "week", "month"] as const;

export type ChartInterval = (typeof chartIntervals)[number];

export function capitalizeWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
