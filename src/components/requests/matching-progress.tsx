"use client";

import { useRequestStatus } from "@/hooks/use-request-status";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { MATCH_SHORTLIST_SIZE } from "@/lib/utils/constants";

interface MatchingProgressProps {
  requestId: string;
}

function TierIndicator({ tier, currentTier, total }: { tier: number; currentTier: number; total: number }) {
  const isActive = tier === currentTier;
  const isPast = tier < currentTier;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
          isActive
            ? "bg-tera-600 text-white animate-pulse"
            : isPast
            ? "bg-tera-100 text-tera-600"
            : "bg-surface-secondary text-text-muted"
        }`}
      >
        {isPast ? (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          tier
        )}
      </div>
      {tier < total && (
        <div className={`h-0.5 w-6 ${isPast ? "bg-tera-300" : "bg-surface-secondary"}`} />
      )}
    </div>
  );
}

export function MatchingProgress({ requestId }: MatchingProgressProps) {
  const { status, matchAttempts, currentTier, loading } = useRequestStatus(requestId);

  if (loading) {
    return (
      <Card>
        <div className="flex justify-center py-6">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  if (status !== "matching" && status !== "confirmed") {
    return null;
  }

  const total = MATCH_SHORTLIST_SIZE;
  const hasNotifiedAnyone = matchAttempts.length > 0;

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tera-100">
            <LoadingSpinner size="sm" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              {hasNotifiedAnyone
                ? "Finding the right person for you"
                : "Preparing your match"}
            </p>
            <p className="text-xs text-text-muted">
              {hasNotifiedAnyone
                ? `Notifying match ${currentTier} of ${total}`
                : "Identifying the best-matched helpers..."}
            </p>
          </div>
        </div>

        {hasNotifiedAnyone && (
          <>
            <div className="flex items-center justify-center gap-0">
              {Array.from({ length: total }, (_, i) => (
                <TierIndicator
                  key={i + 1}
                  tier={i + 1}
                  currentTier={currentTier}
                  total={total}
                />
              ))}
            </div>

            <div className="rounded-lg bg-surface-secondary p-3">
              <p className="text-xs text-text-secondary text-center">
                {currentTier <= total
                  ? "We notify one matched helper at a time. If they don't respond within the timeout window, we move to the next best match."
                  : "All top matches have been contacted. Your request is now visible in the helper browse feed."}
              </p>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
