"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CommonsConsentProps {
  conversationId: string;
}

export function CommonsConsent({ conversationId }: CommonsConsentProps) {
  const [myConsent, setMyConsent] = useState<boolean | null>(null);
  const [published, setPublished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/conversations/${conversationId}/commons-consent`);
      if (res.ok) {
        const data = await res.json();
        setMyConsent(data.myConsent);
        setPublished(data.published);
      }
      setLoaded(true);
    }
    load();
  }, [conversationId]);

  async function handleConsent(consent: boolean) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/commons-consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent }),
      });
      if (res.ok) {
        setMyConsent(consent);
        // Re-fetch to check if published
        const checkRes = await fetch(`/api/conversations/${conversationId}/commons-consent`);
        if (checkRes.ok) {
          const data = await checkRes.json();
          setPublished(data.published);
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) return null;

  if (published) {
    return (
      <Card>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tera-100">
            <svg className="h-5 w-5 text-tera-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              Published to Knowledge Commons
            </p>
            <p className="text-xs text-text-muted">
              An anonymised summary is now publicly available to help others.
            </p>
          </div>
          <Badge variant="success">Published</Badge>
        </div>
      </Card>
    );
  }

  if (myConsent !== null) {
    return (
      <Card>
        <div className="py-4 text-center">
          <p className="text-sm text-text-secondary">
            {myConsent
              ? "You consented. Waiting for the other party to respond."
              : "You declined. This conversation will remain private."}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-tera-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
          <h2 className="text-base font-semibold text-text-primary">Knowledge Commons</h2>
        </div>

        <p className="text-sm text-text-secondary">
          Would you like to contribute an anonymised summary of this conversation to the
          Knowledge Commons? Both parties must consent. Only the AI summary is published —
          not the full transcript. All identifying information is removed.
        </p>

        <div className="flex gap-2">
          <Button size="sm" onClick={() => handleConsent(true)} loading={submitting}>
            Yes, contribute
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleConsent(false)}
            loading={submitting}
          >
            No, keep private
          </Button>
        </div>
      </div>
    </Card>
  );
}
