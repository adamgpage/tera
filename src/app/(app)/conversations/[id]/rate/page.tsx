"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert } from "@/components/ui/alert";
import { RatingForm } from "@/components/conversations/rating-form";
import { RatingDisplay } from "@/components/conversations/rating-display";
import { CommonsConsent } from "@/components/conversations/commons-consent";

interface RatingData {
  id: string;
  narrative_text: string;
  resolved: boolean | null;
  author_user_id: string;
  visible: boolean;
}

export default function RatePage() {
  const params = useParams();
  const router = useRouter();
  const { authUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [myRating, setMyRating] = useState<RatingData | null>(null);
  const [otherRating, setOtherRating] = useState<RatingData | null>(null);
  const [bothRated, setBothRated] = useState(false);
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    if (!authUser) return;
    fetchRatings();
  }, [authUser]);

  async function fetchRatings() {
    const res = await fetch(`/api/conversations/${params.id}/rate`);
    if (res.ok) {
      const data = await res.json();
      setMyRating(data.myRating);
      setOtherRating(data.otherRating);
      setBothRated(data.bothRated);
    }
    setLoading(false);
  }

  async function handleSubmitRating(narrativeText: string, resolved: boolean) {
    const res = await fetch(`/api/conversations/${params.id}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ narrative_text: narrativeText, resolved }),
    });

    if (res.ok) {
      const data = await res.json();
      setBothRated(data.bothRated);
      await fetchRatings();
      if (data.bothRated) {
        setShowConsent(true);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/conversations/${params.id}`)}
          className="rounded-lg p-1 text-text-muted hover:bg-surface-secondary hover:text-text-primary transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-text-primary">Rate Conversation</h1>
      </div>

      {!myRating ? (
        <RatingForm onSubmit={handleSubmitRating} />
      ) : !bothRated ? (
        <Card>
          <div className="py-8 text-center">
            <svg className="mx-auto h-10 w-10 text-tera-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-3 text-sm font-medium text-text-primary">
              Your rating has been submitted
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Waiting for the other party to rate. Both ratings will become visible once submitted.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <Alert variant="success">
            Both ratings are now visible. Thank you for your feedback.
          </Alert>
          {myRating && (
            <RatingDisplay
              label="Your rating"
              narrativeText={myRating.narrative_text}
              resolved={myRating.resolved}
            />
          )}
          {otherRating && (
            <RatingDisplay
              label="Their rating"
              narrativeText={otherRating.narrative_text}
              resolved={otherRating.resolved}
            />
          )}
        </>
      )}

      {(bothRated || showConsent) && (
        <CommonsConsent conversationId={params.id as string} />
      )}
    </div>
  );
}
