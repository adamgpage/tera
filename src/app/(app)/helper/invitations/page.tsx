"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { MatchInvitationCard } from "@/components/requests/match-invitation-card";

interface Invitation {
  id: string;
  request_id: string;
  match_score: number;
  rank: number;
  request: {
    parsed_summary: string;
    raw_text: string;
    expertise_tags: string[];
    urgency: string;
    preferred_format: string;
  };
}

export default function InvitationsPage() {
  const supabase = createClient();
  const { authUser } = useUser();

  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const fetchInvitations = useCallback(async () => {
    if (!authUser) return;

    // Get helper profile ID
    const { data: helperProfile } = await supabase
      .from("helper_profiles")
      .select("id")
      .eq("user_id", authUser.id)
      .single();

    if (!helperProfile) {
      setLoading(false);
      return;
    }

    const hpId = (helperProfile as Record<string, unknown>).id as string;

    // Get pending match attempts for this helper
    const { data: attempts } = await supabase
      .from("match_attempts")
      .select("id, request_id, match_score, rank")
      .eq("helper_profile_id", hpId)
      .eq("response", "pending")
      .order("created_at", { ascending: false });

    if (!attempts || attempts.length === 0) {
      setInvitations([]);
      setLoading(false);
      return;
    }

    // Fetch request details for each attempt
    const requestIds = (attempts as any[]).map((a) => a.request_id);
    const { data: requests } = await supabase
      .from("requests")
      .select("id, parsed_summary, raw_text, expertise_tags, urgency, preferred_format")
      .in("id", requestIds);

    const requestMap = new Map(
      (requests as any[] ?? []).map((r) => [r.id, r])
    );

    const mapped = (attempts as any[])
      .map((a) => ({
        id: a.id,
        request_id: a.request_id,
        match_score: a.match_score,
        rank: a.rank,
        request: requestMap.get(a.request_id),
      }))
      .filter((a) => a.request) as Invitation[];

    setInvitations(mapped);
    setLoading(false);
  }, [authUser, supabase]);

  useEffect(() => {
    fetchInvitations();
    // Poll every 30s so new invitations appear without a manual refresh
    const interval = setInterval(fetchInvitations, 30_000);
    return () => clearInterval(interval);
  }, [fetchInvitations]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Invitations</h1>
        <button
          onClick={fetchInvitations}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Refresh
        </button>
      </div>

      {invitations.length === 0 ? (
        <Card>
          <div className="py-8 text-center">
            <p className="text-text-secondary">
              No pending invitations right now.
            </p>
            <p className="mt-1 text-sm text-text-muted">
              When someone needs your expertise, you&apos;ll see their request
              here.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {invitations.map((inv) => (
            <MatchInvitationCard
              key={inv.id}
              matchAttemptId={inv.id}
              requestId={inv.request_id}
              parsedSummary={inv.request.parsed_summary || inv.request.raw_text}
              expertiseTags={inv.request.expertise_tags}
              urgency={inv.request.urgency}
              preferredFormat={inv.request.preferred_format}
              matchScore={inv.match_score}
              paidRequired={false}
              sessionRate={null}
              onResponded={fetchInvitations}
            />
          ))}
        </div>
      )}
    </div>
  );
}
