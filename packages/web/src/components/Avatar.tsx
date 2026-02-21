import { cn } from "@/lib/utils";

type AvatarProps = {
  url?: string | null;
  name?: string | null;
  size?: number;
};

export function Avatar({ url, name, size = 28 }: AvatarProps) {
  const sizeClass = size === 40 ? "h-10 w-10" : "h-7 w-7";

  if (!url && !name) {
    return null;
  }

  if (url) {
    return (
      <img
        src={url}
        alt={name ?? "User"}
        className={cn(sizeClass, "rounded-full")}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-muted text-xs",
        sizeClass,
      )}
    >
      ?
    </div>
  );
}
