"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";

interface TopMatchPreviewProps {
  requestId: string;
}

interface MatchPreview {
  expertise_tags: string[];
  reputation_score: number;
  total_conversations: number;
  resolved_rate: number;
}

export function TopMatchPreview({ requestId }: TopMatchPreviewProps) {
  const supabase = createClient();
  const [preview, setPreview] = useState<MatchPreview | null>(null);

  useEffect(() => {
    async function load() {
      // Get top match attempt for this request
      const { data: attempt } = await supabase
        .from("match_attempts")
        .select("helper_profile_id")
        .eq("request_id", requestId)
        .order("rank", { ascending: true })
        .limit(1)
        .single();

      if (!attempt) return;

      const hpId = (attempt as Record<string, unknown>).helper_profile_id;

      const { data: profile } = await supabase
        .from("helper_profiles")
        .select("expertise_tags, reputation_score, total_conversations, resolved_rate")
        .eq("id", hpId)
        .single();

      if (profile) {
        setPreview(profile as unknown as MatchPreview);
      }
    }

    load();
  }, [requestId, supabase]);

  if (!preview) return null;

  return (
    <Card padding="sm">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-tera-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <p className="text-xs font-semibold text-text-primary">Top Match Preview</p>
        </div>

        <div className="flex flex-wrap gap-1">
          {preview.expertise_tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="inline-block rounded-full bg-tera-50 px-2 py-0.5 text-[11px] text-tera-700"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex gap-4 text-[11px] text-text-muted">
          <span>{preview.total_conversations} conversations</span>
          <span>{(preview.resolved_rate * 100).toFixed(0)}% resolved</span>
        </div>

        <p className="text-[10px] text-text-muted italic">
          Name and photo shown after they accept
        </p>
      </div>
    </Card>
  );
}
