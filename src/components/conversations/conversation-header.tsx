"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface ConversationHeaderProps {
  otherUserName: string;
  summary: string;
  status: string;
  format: string;
  isAsker: boolean;
}

export function ConversationHeader({
  otherUserName,
  summary,
  status,
  format,
  isAsker,
}: ConversationHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/conversations"
          className="shrink-0 rounded-lg p-1 text-text-muted hover:bg-surface-secondary hover:text-text-primary transition-colors"
          aria-label="Back to conversations"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tera-100 text-sm font-semibold text-tera-700">
          {otherUserName.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-text-primary truncate">
              {otherUserName}
            </p>
            <span className="text-xs text-text-muted">
              {isAsker ? "Helper" : "Asker"}
            </span>
          </div>
          <p className="text-xs text-text-muted truncate">{summary}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Badge
          variant={status === "active" ? "success" : status === "completed" ? "default" : "warning"}
        >
          {status}
        </Badge>
      </div>
    </div>
  );
}
