"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { BrowseRequestCard } from "@/components/requests/browse-request-card";

interface BrowsableRequest {
  id: string;
  parsed_summary: string;
  expertise_tags: string[];
  urgency: string;
  preferred_format: string;
  geographic_context: Record<string, string | null>;
  created_at: string;
}

export default function HelperBrowsePage() {
  const supabase = createClient();
  const { authUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<BrowsableRequest[]>([]);
  const [helperProfileId, setHelperProfileId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!authUser) return;

    // Get helper profile
    const { data: hp } = await supabase
      .from("helper_profiles")
      .select("id, expertise_tags")
      .eq("user_id", authUser.id)
      .single();

    if (!hp) {
      setLoading(false);
      return;
    }

    setHelperProfileId((hp as Record<string, unknown>).id as string);

    // Get open requests (confirmed or matching, not yet matched to this helper)
    const { data: openRequests } = await supabase
      .from("requests")
      .select("id, parsed_summary, expertise_tags, urgency, preferred_format, geographic_context, created_at")
      .in("status", ["confirmed", "matching", "unmatched"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (openRequests) {
      setRequests(openRequests as unknown as BrowsableRequest[]);
    }

    setLoading(false);
  }, [authUser, supabase]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function handleSelfSelect(requestId: string) {
    if (!helperProfileId) return;

    const res = await fetch("/api/requests/self-select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, helperProfileId }),
    });

    if (res.ok) {
      // Remove from list
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!helperProfileId) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <div className="py-8 text-center">
            <p className="text-text-secondary">
              Complete your helper onboarding to browse open requests.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Browse Requests</h1>
        <p className="mt-1 text-sm text-text-muted">
          Open requests matching your expertise. Volunteer to help directly.
        </p>
      </div>

      {requests.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <p className="text-text-secondary">No open requests right now.</p>
            <p className="mt-1 text-sm text-text-muted">
              Check back later — new requests are submitted every day.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <BrowseRequestCard
              key={req.id}
              id={req.id}
              summary={req.parsed_summary}
              expertiseTags={req.expertise_tags}
              urgency={req.urgency}
              preferredFormat={req.preferred_format}
              createdAt={req.created_at}
              onVolunteer={handleSelfSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
