"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MIN_RATING_LENGTH } from "@/lib/utils/constants";

interface RatingFormProps {
  onSubmit: (narrativeText: string, resolved: boolean) => Promise<void>;
}

export function RatingForm({ onSubmit }: RatingFormProps) {
  const [text, setText] = useState("");
  const [resolved, setResolved] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (text.length < MIN_RATING_LENGTH) {
      setError(`Please write at least ${MIN_RATING_LENGTH} characters.`);
      return;
    }
    if (resolved === null) {
      setError("Please indicate whether the problem was resolved.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await onSubmit(text, resolved);
    } catch {
      setError("Failed to submit rating. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Describe what happened
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            Your rating will be visible on the other person&apos;s profile once both parties have rated.
            Be honest and specific.
          </p>
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe your experience — what was helpful, what could improve, what happened..."
          rows={5}
          minLength={MIN_RATING_LENGTH}
        />
        <p className="text-xs text-text-muted">
          {text.length}/{MIN_RATING_LENGTH} minimum characters
        </p>

        <div>
          <p className="text-sm font-medium text-text-primary mb-2">
            Was the problem resolved?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setResolved(true)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                resolved === true
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-border text-text-secondary hover:bg-surface-secondary"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Yes, resolved
            </button>
            <button
              type="button"
              onClick={() => setResolved(false)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                resolved === false
                  ? "border-red-500 bg-red-50 text-red-700"
                  : "border-border text-text-secondary hover:bg-surface-secondary"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Not resolved
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" loading={submitting} disabled={text.length < MIN_RATING_LENGTH || resolved === null}>
          Submit Rating
        </Button>
      </form>
    </Card>
  );
}
