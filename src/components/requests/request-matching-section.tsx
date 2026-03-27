"use client";

import { MatchingProgress } from "./matching-progress";
import { TopMatchPreview } from "./top-match-preview";

interface RequestMatchingSectionProps {
  requestId: string;
  status: string;
}

export function RequestMatchingSection({ requestId, status }: RequestMatchingSectionProps) {
  if (status !== "matching" && status !== "confirmed") return null;

  return (
    <div className="space-y-3">
      <MatchingProgress requestId={requestId} />
      <TopMatchPreview requestId={requestId} />
    </div>
  );
}
