import { AnonymousAvatar } from "@/components/AnonymousAvatar";
import { cn } from "@/lib/utils";

type AvatarProps = {
  url?: string | null;
  name?: string | null;
  userId?: string;
  size?: number;
};

export function Avatar({ url, name, userId, size = 28 }: AvatarProps) {
  const sizeClass = size === 40 ? "h-10 w-10" : "h-7 w-7";

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

  if (userId) {
    return <AnonymousAvatar userId={userId} size={size} />;
  }

  if (!name) {
    return null;
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
