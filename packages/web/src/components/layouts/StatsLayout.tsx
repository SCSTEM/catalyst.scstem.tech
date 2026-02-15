import type { ReactNode } from "react";

type LayoutProps = {
  title?: string;
  children: ReactNode;
};
export function StatsLayout({ children, title }: LayoutProps) {
  return (
    <div className="min-h-dvh bg-background bg-[linear-gradient(to_right,#80808033_1px,transparent_1px),linear-gradient(to_bottom,#80808033_1px,transparent_1px)] bg-size-[70px_70px]">
      <div className="mx-auto max-w-2xl p-4 md:py-8">
        {title ? (
          <h1 className="mb-4 md:mb-8 text-center text-2xl md:text-3xl font-bold">
            {title}
          </h1>
        ) : null}
        {children}
      </div>
    </div>
  );
}
