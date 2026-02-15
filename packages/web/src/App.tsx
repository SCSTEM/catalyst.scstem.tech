import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { AccessGate } from "@/components/AccessGate";
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
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem("catalyst-auth") === "1",
  );
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
      label: "Top Emojis",
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

  if (!isAuthenticated) {
    return <AccessGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <Layout title="Emoji Leaderboard 😎">
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          setEmojiDetail(null);
          setUserDetail(null);
        }}
      >
        <div className="mb-6 h-14">
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
        <Button
          size="icon"
          className="fixed bottom-6 right-6 z-50 size-12"
          onClick={() => queryClient.invalidateQueries()}
        >
          <RefreshCw />
        </Button>

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
