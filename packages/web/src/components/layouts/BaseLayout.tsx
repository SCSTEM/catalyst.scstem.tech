import type { ReactNode } from "react";
import { AnonymousBanner } from "@/components/AnonymousBanner";

type LayoutProps = {
  children: ReactNode;
};
export function BaseLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-dvh">
      {children}
      <AnonymousBanner />
    </div>
  );
}
