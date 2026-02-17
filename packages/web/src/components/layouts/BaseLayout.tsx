import type { ReactNode } from "react";

type LayoutProps = {
  children: ReactNode;
};
export function BaseLayout({ children }: LayoutProps) {
  return <div className="min-h-dvh">{children}</div>;
}
