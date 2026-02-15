import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmojiDetail } from "./components/EmojiDetail";
import { EmojiLeaderboard } from "./components/EmojiLeaderboard";
import { Layout } from "./components/Layout";
import { Trends } from "./components/Trends";
import { UserDetail } from "./components/UserDetail";
import { UserLeaderboard } from "./components/UserLeaderboard";

export function App() {
  const [emojiDetail, setEmojiDetail] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const tabs: { value: string; label: string; content: ReactNode }[] = [
    {
      value: "emojis",
      label: "Top Emojis",
      content: emojiDetail ? (
        <EmojiDetail
          key={refreshKey}
          emoji={emojiDetail}
          onBack={() => setEmojiDetail(null)}
        />
      ) : (
        <EmojiLeaderboard key={refreshKey} onSelect={setEmojiDetail} />
      ),
    },
    {
      value: "users",
      label: "Top Reactors",
      content: userDetail ? (
        <UserDetail
          key={refreshKey}
          userId={userDetail}
          onBack={() => setUserDetail(null)}
        />
      ) : (
        <UserLeaderboard key={refreshKey} onSelect={setUserDetail} />
      ),
    },
    {
      value: "trends",
      label: "Trends",
      content: <Trends />,
    },
  ];

  return (
    <Layout title="Emoji Leaderboard 😎">
      <Tabs
        defaultValue="emojis"
        onValueChange={() => {
          setEmojiDetail(null);
          setUserDetail(null);
        }}
      >
        <div className="mb-6 flex items-center gap-2 h-14">
          <TabsList className="flex-1 h-full">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex-1 h-full"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="h-full py-1">
            <Button
              className="h-full"
              onClick={() => setRefreshKey((k) => k + 1)}
            >
              <RefreshCw />
            </Button>
          </div>
        </div>

        <Card className="p-4">
          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.content}
            </TabsContent>
          ))}
        </Card>
      </Tabs>
    </Layout>
  );
}
