"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function CallPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { authUser } = useUser();
  const containerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callActive, setCallActive] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const callId = params.id as string;

  useEffect(() => {
    if (!authUser || !callId) return;

    async function loadCall() {
      // Get the scheduled call
      const { data: call } = await supabase
        .from("scheduled_calls")
        .select("*, conversations!inner(id, asker_user_id, helper_user_id, status)")
        .eq("id", callId)
        .single();

      if (!call) {
        setError("Call not found");
        setLoading(false);
        return;
      }

      const c = call as Record<string, unknown>;
      const conv = c.conversations as Record<string, unknown>;

      // Verify participant
      if (conv.asker_user_id !== authUser!.id && conv.helper_user_id !== authUser!.id) {
        setError("Not a participant");
        setLoading(false);
        return;
      }

      setConversationId(conv.id as string);

      // If no Daily room yet, create one
      let roomUrl = c.daily_room_url as string | null;
      if (!roomUrl) {
        try {
          const res = await fetch("/api/calls/create-room", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId: conv.id }),
          });

          if (!res.ok) throw new Error("Failed to create room");
          const data = await res.json();
          roomUrl = data.roomUrl;

          // Save room URL to the scheduled call
          await supabase
            .from("scheduled_calls")
            .update({ daily_room_url: roomUrl } as Record<string, unknown>)
            .eq("id", callId);
        } catch (err) {
          setError("Failed to create video room. Check that DAILY_API_KEY is configured.");
          setLoading(false);
          return;
        }
      }

      // Get meeting token
      try {
        const roomName = roomUrl!.split("/").pop()!;
        const tokenRes = await fetch("/api/calls/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName }),
        });

        if (!tokenRes.ok) throw new Error("Failed to get token");
        const { token } = await tokenRes.json();

        // Load Daily.co and join
        if (containerRef.current) {
          const { createDailyFrame } = await import("@/lib/daily/client");
          const frame = await createDailyFrame(containerRef.current, roomUrl!, token);

          frame.on("left-meeting", () => {
            setCallActive(false);
            setCallEnded(true);
          });

          // Mark call as started
          await supabase
            .from("scheduled_calls")
            .update({ call_started_at: new Date().toISOString() } as Record<string, unknown>)
            .eq("id", callId);

          setCallActive(true);
        }
      } catch (err) {
        setError("Failed to join video call");
      }

      setLoading(false);
    }

    loadCall();
  }, [authUser, callId, supabase]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm text-text-secondary">Setting up your call...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg py-20">
        <Card>
          <div className="py-8 text-center">
            <p className="text-red-600">{error}</p>
            <Button className="mt-4" onClick={() => router.back()}>
              Go back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (callEnded) {
    return (
      <div className="mx-auto max-w-lg py-20">
        <Card>
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-tera-100">
              <svg className="h-6 w-6 text-tera-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-text-primary">Call ended</h2>
            <p className="mt-1 text-sm text-text-secondary">
              A transcript is being generated. You can continue the conversation via messages.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              {conversationId && (
                <Button onClick={() => router.push(`/conversations/${conversationId}`)}>
                  Back to conversation
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h1 className="text-sm font-medium text-text-primary">Video Call</h1>
        {conversationId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/conversations/${conversationId}`)}
          >
            Back to messages
          </Button>
        )}
      </div>
      <div ref={containerRef} className="flex-1 bg-gray-900" />
    </div>
  );
}
