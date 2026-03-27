"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface Message {
  id: string;
  text: string;
  user_id: string;
  user_name: string;
  created_at: string;
  attachments?: { name: string; url: string; type: string }[];
}

interface ChatContainerProps {
  conversationId: string;
  channelId: string | null;
  currentUserId: string;
  currentUserName: string;
}

// For MVP without Stream keys, we use Supabase realtime as a fallback chat system.
// When Stream keys are configured, this would use the Stream Chat SDK instead.
// This keeps the app fully functional for development.

export function ChatContainer({
  conversationId,
  channelId,
  currentUserId,
  currentUserName,
}: ChatContainerProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load existing messages
  useEffect(() => {
    async function loadMessages() {
      // For MVP, we store messages in a simple pattern using Supabase
      // In production, Stream Chat handles this entirely
      const { data } = await supabase
        .from("conversation_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (data) {
        setMessages(data as unknown as Message[]);
      }
      setLoading(false);
    }

    loadMessages();
  }, [conversationId, supabase]);

  // Subscribe to new messages via Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as unknown as Message;
          setMessages((prev) => [...prev, newMsg]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase, scrollToBottom]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function handleSendMessage(text: string) {
    if (!text.trim()) return;

    // Insert message
    await supabase.from("conversation_messages").insert({
      conversation_id: conversationId,
      user_id: currentUserId,
      user_name: currentUserName,
      text: text.trim(),
    } as Record<string, unknown>);

    // Update conversation last_activity_at
    await supabase
      .from("conversations")
      .update({ last_activity_at: new Date().toISOString() } as Record<string, unknown>)
      .eq("id", conversationId);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="rounded-full bg-tera-50 p-3">
              <svg className="h-6 w-6 text-tera-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-medium text-text-primary">Start the conversation</p>
            <p className="mt-1 text-xs text-text-muted">
              Say hello and describe what you need help with.
            </p>
          </div>
        ) : (
          <MessageList messages={messages} currentUserId={currentUserId} />
        )}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput onSend={handleSendMessage} />
    </div>
  );
}
