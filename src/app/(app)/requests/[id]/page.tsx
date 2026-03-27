import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/requests/status-badge";
import { formatDate } from "@/lib/utils/formatting";
import { RequestMatchingSection } from "@/components/requests/request-matching-section";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("requests")
    .select("*")
    .eq("id", id)
    .eq("asker_user_id", user.id)
    .single();

  if (!data) notFound();

  const req = data as {
    id: string;
    raw_text: string;
    parsed_summary: string | null;
    stated_problem: string | null;
    inferred_problem: string | null;
    expertise_tags: string[];
    geographic_context: Record<string, string | null>;
    urgency: string;
    preferred_format: string;
    status: string;
    matched_helper_id: string | null;
    created_at: string;
    updated_at: string;
  };

  // If matched, get conversation info
  let conversation: { id: string; format: string; status: string } | null = null;
  if (req.status === "matched" || req.status === "in_progress" || req.status === "resolved") {
    const { data: conv } = await supabase
      .from("conversations")
      .select("id, format, status")
      .eq("request_id", id)
      .single();
    if (conv) {
      const c = conv as Record<string, unknown>;
      conversation = { id: c.id as string, format: c.format as string, status: c.status as string };
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/requests"
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          &larr; Back to requests
        </Link>
        <StatusBadge status={req.status} />
      </div>

      <Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-medium text-text-muted">
              Your original request
            </h2>
            <p className="mt-1 text-text-primary">{req.raw_text}</p>
          </div>

          {req.parsed_summary && (
            <div>
              <h2 className="text-sm font-medium text-text-muted">
                Parsed summary
              </h2>
              <p className="mt-1 text-text-primary">{req.parsed_summary}</p>
            </div>
          )}

          {req.inferred_problem && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
              <p className="text-xs font-medium text-yellow-800">
                Deeper issue identified
              </p>
              <p className="mt-1 text-sm text-yellow-700">
                {req.inferred_problem}
              </p>
            </div>
          )}

          {req.expertise_tags.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-text-muted">
                Expertise tags
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {req.expertise_tags.map((tag) => (
                  <Badge key={tag} variant="info">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-text-muted">Urgency: </span>
              <Badge
                variant={
                  req.urgency === "high"
                    ? "danger"
                    : req.urgency === "medium"
                    ? "warning"
                    : "default"
                }
              >
                {req.urgency}
              </Badge>
            </div>
            <div>
              <span className="text-text-muted">Format: </span>
              <span className="font-medium text-text-primary">
                {req.preferred_format === "synchronous"
                  ? "Video call"
                  : req.preferred_format === "asynchronous"
                  ? "Messages"
                  : "No preference"}
              </span>
            </div>
          </div>

          <p className="text-xs text-text-muted">
            Submitted {formatDate(req.created_at)}
          </p>
        </div>
      </Card>

      {/* Live matching progress with cascade indicators */}
      <RequestMatchingSection requestId={req.id} status={req.status} />

      {req.status === "unmatched" && (
        <Card>
          <div className="py-4 text-center">
            <p className="font-medium text-text-primary">
              No match found yet
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              We haven&apos;t found someone with the right experience yet.
              We&apos;ll keep looking and notify you when someone becomes
              available.
            </p>
          </div>
        </Card>
      )}

      {conversation && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text-primary">
                Conversation {conversation.status === "completed" ? "completed" : "in progress"}
              </p>
              <p className="text-sm text-text-secondary">
                {conversation.format === "synchronous"
                  ? "Video call"
                  : "Message thread"}
              </p>
            </div>
            <Link
              href={`/conversations/${conversation.id}`}
              className="rounded-lg bg-tera-600 px-4 py-2 text-sm font-medium text-white hover:bg-tera-700 transition-colors"
            >
              {conversation.status === "completed"
                ? "View conversation"
                : "Go to conversation"}
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
