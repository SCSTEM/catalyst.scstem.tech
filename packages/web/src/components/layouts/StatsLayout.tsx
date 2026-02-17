import type { ReactNode } from "react";
import { BaseLayout } from "@/components/layouts/BaseLayout";

type LayoutProps = {
  title?: string;
  children: ReactNode;
};
export function StatsLayout({ children, title }: LayoutProps) {
  return (
    <BaseLayout>
      <div className="mx-auto max-w-2xl p-4 md:py-8">
        {title ? (
          <h1
            className="mb-4 md:mb-8 text-center text-2xl md:text-3xl font-bold text-main"
            style={{ viewTransitionName: "page-title" }}
          >
            {title}
          </h1>
        ) : null}
        {children}
      </div>
    </BaseLayout>
  );
}
