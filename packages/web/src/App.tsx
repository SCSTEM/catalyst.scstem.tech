import { useState } from "react";
import { EmojiDetail } from "./components/EmojiDetail";
import { EmojiLeaderboard } from "./components/EmojiLeaderboard";
import { Layout } from "./components/Layout";
import { UserDetail } from "./components/UserDetail";
import { UserLeaderboard } from "./components/UserLeaderboard";

type View =
  | { kind: "emojis" }
  | { kind: "users" }
  | { kind: "emoji-detail"; emoji: string }
  | { kind: "user-detail"; userId: string };

const tabs = [
  { kind: "emojis" as const, label: "Top Emojis" },
  { kind: "users" as const, label: "Top Reactors" },
];

export function App() {
  const [view, setView] = useState<View>({ kind: "emojis" });

  const activeTab =
    view.kind === "emojis" || view.kind === "emoji-detail" ? "emojis" : "users";

  return (
    <Layout>
      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-900 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.kind}
            type="button"
            onClick={() => setView({ kind: tab.kind })}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.kind
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {view.kind === "emojis" && (
        <EmojiLeaderboard
          onSelect={(emoji) => setView({ kind: "emoji-detail", emoji })}
        />
      )}
      {view.kind === "users" && (
        <UserLeaderboard
          onSelect={(userId) => setView({ kind: "user-detail", userId })}
        />
      )}
      {view.kind === "emoji-detail" && (
        <EmojiDetail
          emoji={view.emoji}
          onBack={() => setView({ kind: "emojis" })}
        />
      )}
      {view.kind === "user-detail" && (
        <UserDetail
          userId={view.userId}
          onBack={() => setView({ kind: "users" })}
        />
      )}
    </Layout>
  );
}
