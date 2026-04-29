"use client";

import { useConvexUser } from "@/hooks/useConvexUser";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChatPage() {
  const { convexUserId, isLoading } = useConvexUser();

  if (isLoading || !convexUserId) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-4 h-full">
      <div>
        <h1 className="text-2xl font-bold">AI Chat</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Chat with your report history using AI.
        </p>
      </div>
      <ChatInterface userId={convexUserId} />
    </div>
  );
}
