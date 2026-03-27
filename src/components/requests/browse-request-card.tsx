"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BrowseRequestCardProps {
  id: string;
  summary: string;
  expertiseTags: string[];
  urgency: string;
  preferredFormat: string;
  createdAt: string;
  onVolunteer: (requestId: string) => Promise<void>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Less than an hour ago";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function BrowseRequestCard({
  id,
  summary,
  expertiseTags,
  urgency,
  preferredFormat,
  createdAt,
  onVolunteer,
}: BrowseRequestCardProps) {
  const [volunteering, setVolunteering] = useState(false);

  async function handleVolunteer() {
    setVolunteering(true);
    try {
      await onVolunteer(id);
    } finally {
      setVolunteering(false);
    }
  }

  return (
    <Card>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-text-primary line-clamp-3">
            {summary || "Request pending parsing..."}
          </p>
          <Badge
            variant={
              urgency === "high" ? "danger" : urgency === "medium" ? "warning" : "default"
            }
          >
            {urgency}
          </Badge>
        </div>

        {expertiseTags.length > 0 && (
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
        )}

        <div className="flex items-center justify-between">
          <div className="flex gap-4 text-xs text-text-muted">
            <span>
              {preferredFormat === "synchronous"
                ? "Video call"
                : preferredFormat === "asynchronous"
                ? "Messages"
                : "No preference"}
            </span>
            <span>{timeAgo(createdAt)}</span>
          </div>

          <Button
            size="sm"
            onClick={handleVolunteer}
            loading={volunteering}
          >
            Volunteer
          </Button>
        </div>
      </div>
    </Card>
  );
}
