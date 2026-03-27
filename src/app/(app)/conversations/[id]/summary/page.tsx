"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SummaryCard } from "@/components/conversations/summary-card";

interface Summary {
  id: string;
  conversation_id: string;
  problem_as_stated: string | null;
  problem_as_understood: string | null;
  approach_provided: string | null;
  key_actions: string | null;
  follow_up_required: string | null;
  high_risk_disclaimer: boolean;
  generation_status: string;
}

export default function SummaryPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { authUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    if (!authUser || !params.id) return;

    async function load() {
      const { data } = await supabase
        .from("conversation_summaries")
        .select("*")
        .eq("conversation_id", params.id as string)
        .single();

      setSummary(data as unknown as Summary | null);
      setLoading(false);
    }

    load();

    // Poll for completion if pending
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("conversation_summaries")
        .select("generation_status")
        .eq("conversation_id", params.id as string)
        .single();

      if (data && (data as Record<string, unknown>).generation_status === "completed") {
        load();
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [authUser, params.id, supabase]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <div className="py-12 text-center">
            <p className="text-text-secondary">Summary not found.</p>
          </div>
        </Card>
      </div>
    );
  }

  const isPending = summary.generation_status === "pending";
  const isFailed = summary.generation_status === "failed";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/conversations/${params.id}`)}
            className="rounded-lg p-1 text-text-muted hover:bg-surface-secondary hover:text-text-primary transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-text-primary">Conversation Summary</h1>
        </div>
        <Badge variant={isPending ? "warning" : isFailed ? "danger" : "success"}>
          {isPending ? "Generating..." : isFailed ? "Failed" : "Complete"}
        </Badge>
      </div>

      {isPending ? (
        <Card>
          <div className="flex flex-col items-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-sm text-text-secondary">
              AI is generating your conversation summary...
            </p>
            <p className="mt-1 text-xs text-text-muted">
              This usually takes less than a minute.
            </p>
          </div>
        </Card>
      ) : isFailed ? (
        <Card>
          <div className="py-12 text-center">
            <p className="text-text-secondary">Summary generation failed.</p>
            <p className="mt-1 text-sm text-text-muted">
              We&apos;ll retry automatically. You can still rate this conversation.
            </p>
          </div>
        </Card>
      ) : (
        <SummaryCard summary={summary} />
      )}

      <div className="flex gap-3">
        <Button onClick={() => router.push(`/conversations/${params.id}/rate`)}>
          Rate this conversation
        </Button>
        <Button
          variant="secondary"
          onClick={() => router.push(`/conversations/${params.id}`)}
        >
          Back to conversation
        </Button>
      </div>
    </div>
  );
}
