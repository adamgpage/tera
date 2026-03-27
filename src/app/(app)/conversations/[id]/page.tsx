"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ChatContainer } from "@/components/conversations/chat-container";
import { ConversationHeader } from "@/components/conversations/conversation-header";
import { ConversationActions } from "@/components/conversations/conversation-actions";
import { PaymentSummary } from "@/components/payments/payment-summary";

interface ConversationDetail {
  id: string;
  request_id: string;
  asker_user_id: string;
  helper_user_id: string;
  format: string;
  status: string;
  stream_channel_id: string | null;
  created_at: string;
  last_activity_at: string;
}

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { authUser, profile } = useUser();

  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [otherUser, setOtherUser] = useState<{ name: string; id: string } | null>(null);
  const [requestSummary, setRequestSummary] = useState<string>("");

  useEffect(() => {
    if (!authUser || !params.id) return;

    async function load() {
      const { data: conv } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", params.id as string)
        .single();

      if (!conv) {
        setLoading(false);
        return;
      }

      const c = conv as Record<string, unknown>;

      // Verify participant
      if (c.asker_user_id !== authUser!.id && c.helper_user_id !== authUser!.id) {
        router.push("/conversations");
        return;
      }

      setConversation(conv as unknown as ConversationDetail);

      // Get other user
      const otherId = c.asker_user_id === authUser!.id ? c.helper_user_id : c.asker_user_id;
      const { data: otherUserData } = await supabase
        .from("users")
        .select("id, name")
        .eq("id", otherId)
        .single();

      if (otherUserData) {
        setOtherUser(otherUserData as unknown as { name: string; id: string });
      }

      // Get request summary
      const { data: req } = await supabase
        .from("requests")
        .select("parsed_summary")
        .eq("id", c.request_id)
        .single();

      if (req) {
        setRequestSummary((req as Record<string, unknown>).parsed_summary as string || "");
      }

      setLoading(false);
    }

    load();
  }, [authUser, params.id, supabase, router]);

  async function handleComplete() {
    if (!conversation) return;

    const res = await fetch(`/api/conversations/${conversation.id}/complete`, {
      method: "POST",
    });

    if (res.ok) {
      setConversation({ ...conversation, status: "completed" });
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <Card>
        <div className="py-12 text-center">
          <p className="text-text-secondary">Conversation not found.</p>
        </div>
      </Card>
    );
  }

  const isAsker = conversation.asker_user_id === authUser?.id;

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-4xl flex-col">
      <ConversationHeader
        otherUserName={otherUser?.name || "Unknown"}
        summary={requestSummary}
        status={conversation.status}
        format={conversation.format}
        isAsker={isAsker}
      />

      {conversation.status === "completed" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <div className="rounded-full bg-tera-100 p-4">
            <svg className="h-8 w-8 text-tera-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-text-primary">Conversation Complete</h2>
          <p className="text-sm text-text-secondary text-center max-w-md">
            A summary is being generated. You&apos;ll be able to rate this conversation and optionally contribute to the Knowledge Commons.
          </p>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => router.push(`/conversations/${conversation.id}/summary`)}
              className="rounded-lg bg-tera-600 px-4 py-2 text-sm font-medium text-white hover:bg-tera-700 transition-colors"
            >
              View Summary
            </button>
            <button
              onClick={() => router.push(`/conversations/${conversation.id}/rate`)}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors"
            >
              Rate Conversation
            </button>
          </div>
          <div className="mt-4 w-full max-w-md">
            <PaymentSummary conversationId={conversation.id} />
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-hidden">
            <ChatContainer
              conversationId={conversation.id}
              channelId={conversation.stream_channel_id}
              currentUserId={authUser?.id || ""}
              currentUserName={profile?.name || ""}
            />
          </div>

          <ConversationActions
            conversationId={conversation.id}
            status={conversation.status}
            format={conversation.format}
            onComplete={handleComplete}
          />
        </>
      )}
    </div>
  );
}
