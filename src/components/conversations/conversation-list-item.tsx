"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface ConversationListItemProps {
  id: string;
  otherUserName: string;
  summary: string;
  expertiseTags: string[];
  status: string;
  format: string;
  lastActivityAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function ConversationListItem({
  id,
  otherUserName,
  summary,
  expertiseTags,
  status,
  format,
  lastActivityAt,
}: ConversationListItemProps) {
  return (
    <Link
      href={`/conversations/${id}`}
      className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-secondary"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tera-100 text-sm font-semibold text-tera-700">
              {otherUserName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">
                {otherUserName}
              </p>
              <p className="text-xs text-text-muted">{timeAgo(lastActivityAt)}</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-text-secondary line-clamp-2">
            {summary}
          </p>
          {expertiseTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {expertiseTags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-block rounded-full bg-tera-50 px-2 py-0.5 text-xs text-tera-700"
                >
                  {tag}
                </span>
              ))}
              {expertiseTags.length > 3 && (
                <span className="text-xs text-text-muted">
                  +{expertiseTags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <Badge
            variant={
              status === "active"
                ? "success"
                : status === "completed"
                ? "default"
                : "warning"
            }
          >
            {status}
          </Badge>
          <span className="text-xs text-text-muted">
            {format === "synchronous" ? "Video" : "Messages"}
          </span>
        </div>
      </div>
    </Link>
  );
}
