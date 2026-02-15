export function Avatar({
  url,
  name,
  size = 28,
}: {
  url: string | null;
  name: string | null;
  size?: number;
}) {
  const sizeClass =
    size === 40 ? "h-10 w-10" : size === 28 ? "h-7 w-7" : "h-7 w-7";

  if (url) {
    return (
      <img
        src={url}
        alt={name ?? "User"}
        className={`${sizeClass} rounded-full`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`flex ${sizeClass} items-center justify-center rounded-full bg-muted text-xs`}
    >
      ?
    </div>
  );
}
