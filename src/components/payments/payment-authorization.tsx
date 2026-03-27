"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface PaymentAuthorizationProps {
  helperName: string;
  rateCents: number;
  currency: string;
  conversationId: string;
  onAuthorized: () => void;
  onSkip?: () => void;
}

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function PaymentAuthorization({
  helperName,
  rateCents,
  currency,
  conversationId,
  onAuthorized,
  onSkip,
}: PaymentAuthorizationProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAuthorize() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/payments/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Authorization failed");
        return;
      }

      onAuthorized();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const fee = Math.round(rateCents * 0.15);

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tera-100">
            <svg className="h-5 w-5 text-tera-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Paid Consultation</p>
            <p className="text-xs text-text-muted">
              {helperName} charges {formatAmount(rateCents, currency)} per conversation
            </p>
          </div>
        </div>

        <Alert variant="info">
          You will not be charged until the conversation is complete. A hold will be placed on
          your payment method.
        </Alert>

        <div className="rounded-lg bg-surface-secondary p-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Session rate</span>
            <span className="font-medium text-text-primary">{formatAmount(rateCents, currency)}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <Button onClick={handleAuthorize} loading={loading}>
            Authorize Payment
          </Button>
          {onSkip && (
            <Button variant="ghost" onClick={onSkip}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
