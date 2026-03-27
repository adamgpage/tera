"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ConversationActionsProps {
  conversationId: string;
  status: string;
  format: string;
  onComplete: () => void;
}

export function ConversationActions({
  conversationId,
  status,
  format,
  onComplete,
}: ConversationActionsProps) {
  const [confirming, setConfirming] = useState(false);
  const [completing, setCompleting] = useState(false);

  async function handleComplete() {
    setCompleting(true);
    try {
      onComplete();
    } finally {
      setCompleting(false);
      setConfirming(false);
    }
  }

  if (status !== "active") return null;

  return (
    <div className="flex items-center justify-between border-t border-border bg-surface px-4 py-3">
      <div className="flex gap-2">
        {format === "asynchronous" && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              // Phase 5: open call scheduler modal
              alert("Video calls coming in a future update!");
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Schedule Call
          </Button>
        )}
      </div>

      <div>
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">Mark as complete?</span>
            <Button size="sm" onClick={handleComplete} loading={completing}>
              Confirm
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setConfirming(true)}>
            Complete Conversation
          </Button>
        )}
      </div>
    </div>
  );
}
