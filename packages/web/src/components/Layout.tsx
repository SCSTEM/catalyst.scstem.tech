import type { ReactNode } from "react";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-8 text-center text-3xl font-bold">
          Emoji Leaderboard
        </h1>
        {children}
      </div>
    </div>
  );
}
