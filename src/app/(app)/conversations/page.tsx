"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ConversationListItem } from "@/components/conversations/conversation-list-item";

interface ConversationWithUsers {
  id: string;
  request_id: string;
  asker_user_id: string;
  helper_user_id: string;
  format: string;
  status: string;
  stream_channel_id: string | null;
  last_activity_at: string;
  created_at: string;
  other_user_name: string;
  request_summary: string;
  expertise_tags: string[];
}

export default function ConversationsPage() {
  const supabase = createClient();
  const { authUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationWithUsers[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  useEffect(() => {
    if (!authUser) return;

    async function fetchConversations() {
      // Get conversations where user is asker or helper
      const { data: convs } = await supabase
        .from("conversations")
        .select("id, request_id, asker_user_id, helper_user_id, format, status, stream_channel_id, last_activity_at, created_at")
        .or(`asker_user_id.eq.${authUser!.id},helper_user_id.eq.${authUser!.id}`)
        .order("last_activity_at", { ascending: false });

      if (!convs || convs.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get other user names and request summaries
      const otherUserIds = (convs as any[]).map((c) =>
        c.asker_user_id === authUser!.id ? c.helper_user_id : c.asker_user_id
      );
      const requestIds = (convs as any[]).map((c) => c.request_id);

      const [{ data: users }, { data: requests }] = await Promise.all([
        supabase.from("users").select("id, name").in("id", otherUserIds),
        supabase.from("requests").select("id, parsed_summary, expertise_tags").in("id", requestIds),
      ]);

      const userMap = new Map((users as any[] ?? []).map((u) => [u.id, u.name]));
      const requestMap = new Map((requests as any[] ?? []).map((r) => [r.id, r]));

      const enriched = (convs as any[]).map((c) => {
        const otherId = c.asker_user_id === authUser!.id ? c.helper_user_id : c.asker_user_id;
        const req = requestMap.get(c.request_id);
        return {
          ...c,
          other_user_name: userMap.get(otherId) || "Unknown",
          request_summary: req?.parsed_summary || "Conversation",
          expertise_tags: req?.expertise_tags || [],
        };
      });

      setConversations(enriched);
      setLoading(false);
    }

    fetchConversations();
  }, [authUser, supabase]);

  const filtered = filter === "all"
    ? conversations
    : conversations.filter((c) => c.status === filter);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Conversations</h1>
        <div className="flex gap-1">
          {(["all", "active", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-tera-100 text-tera-700"
                  : "text-text-secondary hover:bg-surface-secondary"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
              />
            </svg>
            <p className="mt-4 text-text-secondary">No conversations yet.</p>
            <p className="mt-1 text-sm text-text-muted">
              Submit a request or accept an invitation to start a conversation.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((conv) => (
            <ConversationListItem
              key={conv.id}
              id={conv.id}
              otherUserName={conv.other_user_name}
              summary={conv.request_summary}
              expertiseTags={conv.expertise_tags}
              status={conv.status}
              format={conv.format}
              lastActivityAt={conv.last_activity_at}
            />
          ))}
        </div>
      )}
    </div>
  );
}
