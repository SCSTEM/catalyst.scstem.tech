import { AnonymousName } from "@/components/AnonymousName";

type UserNameProps = {
  userId: string;
  displayName?: string | null;
  className?: string;
};

export function UserName({ userId, displayName, className }: UserNameProps) {
  if (displayName) {
    return <span className={className}>{displayName}</span>;
  }
  return <AnonymousName userId={userId} className={className} />;
}
