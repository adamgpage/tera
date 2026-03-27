"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface MatchAttemptInfo {
  rank: number;
  response: string;
  notified_at: string;
}

interface RequestStatusState {
  status: string;
  matchAttempts: MatchAttemptInfo[];
  currentTier: number;
  loading: boolean;
}

export function useRequestStatus(requestId: string): RequestStatusState {
  const supabase = createClient();
  const [status, setStatus] = useState<string>("");
  const [matchAttempts, setMatchAttempts] = useState<MatchAttemptInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    const { data: req } = await supabase
      .from("requests")
      .select("status")
      .eq("id", requestId)
      .single();

    if (req) {
      setStatus((req as Record<string, unknown>).status as string);
    }

    // Get match attempts for this request
    const { data: attempts } = await supabase
      .from("match_attempts")
      .select("rank, response, notified_at")
      .eq("request_id", requestId)
      .order("rank", { ascending: true });

    if (attempts) {
      setMatchAttempts(attempts as unknown as MatchAttemptInfo[]);
    }

    setLoading(false);
  }, [requestId, supabase]);

  useEffect(() => {
    fetchStatus();

    // Subscribe to request status changes
    const reqChannel = supabase
      .channel(`request-status:${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "requests",
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          setStatus((payload.new as Record<string, unknown>).status as string);
        }
      )
      .subscribe();

    // Subscribe to match attempt changes
    const matchChannel = supabase
      .channel(`match-attempts:${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_attempts",
          filter: `request_id=eq.${requestId}`,
        },
        () => {
          fetchStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reqChannel);
      supabase.removeChannel(matchChannel);
    };
  }, [requestId, supabase, fetchStatus]);

  // Calculate current tier based on latest active attempt
  const pendingAttempts = matchAttempts.filter((a) => a.response === "pending");
  const declinedOrTimedOut = matchAttempts.filter(
    (a) => a.response === "declined" || a.response === "timed_out"
  );
  const currentTier = pendingAttempts.length > 0
    ? pendingAttempts[0].rank
    : declinedOrTimedOut.length + 1;

  return { status, matchAttempts, currentTier, loading };
}
