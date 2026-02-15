import { useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("emojis");
  const [emojiDetail, setEmojiDetail] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<string | null>(null);

  function handleSelectUser(userId: string) {
    setEmojiDetail(null);
    setUserDetail(userId);
    setActiveTab("users");
  }

  function handleSelectEmoji(emoji: string) {
    setUserDetail(null);
    setEmojiDetail(emoji);
    setActiveTab("emojis");
  }

  const tabs: { value: string; label: string; content: ReactNode }[] = [
    {
      value: "emojis",
      label: "Top Reactions",
      content: emojiDetail ? (
        <EmojiDetail
          emoji={emojiDetail}
          onBack={() => setEmojiDetail(null)}
          onSelectUser={handleSelectUser}
        />
      ) : (
        <EmojiLeaderboard onSelect={setEmojiDetail} />
      ),
    },
    {
      value: "users",
      label: "Top Reactors",
      content: userDetail ? (
        <UserDetail
          userId={userDetail}
          onBack={() => setUserDetail(null)}
          onSelectEmoji={handleSelectEmoji}
        />
      ) : (
        <UserLeaderboard onSelect={setUserDetail} />
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
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          setEmojiDetail(null);
          setUserDetail(null);
        }}
        className="flex flex-col gap-4 md:gap-6"
      >
        <div className="h-14">
          <TabsList className="size-full">
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
        </div>
        <Card className="p-2 md:p-4">
          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.content}
            </TabsContent>
          ))}
        </Card>
      </Tabs>

      <Button
        size="icon"
        className="fixed bottom-6 right-6 z-50 size-12"
        onClick={() => queryClient.invalidateQueries()}
      >
        <RefreshCw />
      </Button>
    </Layout>
  );
}
