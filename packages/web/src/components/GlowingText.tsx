export function GlowingText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="blur-md absolute">{text}</span>
      <div>{text}</div>
    </div>
  );
}
