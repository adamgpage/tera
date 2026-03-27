"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface MatchInvitationCardProps {
  matchAttemptId: string;
  requestId: string;
  parsedSummary: string;
  expertiseTags: string[];
  urgency: string;
  preferredFormat: string;
  matchScore: number;
  paidRequired: boolean;
  sessionRate: string | null;
  onResponded: () => void;
}

export function MatchInvitationCard({
  matchAttemptId,
  requestId,
  parsedSummary,
  expertiseTags,
  urgency,
  preferredFormat,
  matchScore,
  paidRequired,
  sessionRate,
  onResponded,
}: MatchInvitationCardProps) {
  const supabase = createClient();
  const router = useRouter();
  const [responding, setResponding] = useState<"accept" | "decline" | null>(null);

  async function handleResponse(response: "accepted" | "declined") {
    setResponding(response === "accepted" ? "accept" : "decline");

    try {
      const res = await fetch("/api/matches/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchAttemptId, response }),
      });

      if (res.ok) {
        const data = await res.json();
        onResponded();
        if (response === "accepted" && data.conversationId) {
          router.push(`/conversations/${data.conversationId}`);
        }
      }
    } finally {
      setResponding(null);
    }
  }

  return (
    <Card>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-text-primary line-clamp-3">
            {parsedSummary}
          </p>
          <Badge
            variant={
              urgency === "high" ? "danger" : urgency === "medium" ? "warning" : "default"
            }
          >
            {urgency}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-1">
          {expertiseTags.map((tag) => (
            <span
              key={tag}
              className="inline-block rounded-full bg-tera-50 px-2 py-0.5 text-xs text-tera-700"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex gap-4 text-xs text-text-muted">
          <span>
            Format:{" "}
            {preferredFormat === "synchronous"
              ? "Video call"
              : preferredFormat === "asynchronous"
              ? "Messages"
              : "No preference"}
          </span>
          <span>Match: {(matchScore * 100).toFixed(0)}%</span>
          {paidRequired && sessionRate && (
            <span className="text-tera-600">Paid: {sessionRate}</span>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => handleResponse("accepted")}
            loading={responding === "accept"}
            disabled={responding !== null}
          >
            Accept
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleResponse("declined")}
            loading={responding === "decline"}
            disabled={responding !== null}
          >
            Decline
          </Button>
        </div>
      </div>
    </Card>
  );
}
