import { getRedactionLength } from "@/lib/anonymous";
import { cn } from "@/lib/utils";

type AnonymousNameProps = {
  userId: string;
  className?: string;
};

export function AnonymousName({ userId, className }: AnonymousNameProps) {
  const length = getRedactionLength(userId);

  return (
    <span
      aria-label="Anonymous user"
      className={cn(
        "inline-block align-middle select-none rounded-sm",
        "bg-[length:4px_4px] bg-[image:repeating-linear-gradient(45deg,oklch(28%_0.02_280)_0,oklch(28%_0.02_280)_2px,oklch(52%_0.03_280)_2px,oklch(52%_0.03_280)_4px)]",
        className,
      )}
      style={{
        width: `${length}ch`,
        height: "0.95em",
        color: "transparent",
      }}
    >
      {"█".repeat(length)}
    </span>
  );
}
