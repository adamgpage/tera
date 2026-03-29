"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await fetch("/api/helper/invitations");
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
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
