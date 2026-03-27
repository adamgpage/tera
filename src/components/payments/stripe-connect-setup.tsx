"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface StripeConnectSetupProps {
  hasAccount: boolean;
  isActive: boolean;
  onStartOnboarding: () => Promise<string | null>;
}

export function StripeConnectSetup({
  hasAccount,
  isActive,
  onStartOnboarding,
}: StripeConnectSetupProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSetup() {
    setLoading(true);
    setError("");
    try {
      const url = await onStartOnboarding();
      if (url) {
        window.location.href = url;
      } else {
        setError("Failed to create onboarding link. Check that Stripe keys are configured.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (isActive) {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Stripe Connected</p>
              <p className="text-xs text-text-muted">Your account is active and can receive payments</p>
            </div>
          </div>
          <Badge variant="success">Active</Badge>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-secondary">
            <svg className="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              {hasAccount ? "Complete Stripe Setup" : "Set Up Paid Consultations"}
            </p>
            <p className="text-xs text-text-muted">
              Connect your Stripe account to charge for your expertise. Tera takes a 15% platform fee.
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button size="sm" onClick={handleSetup} loading={loading}>
          {hasAccount ? "Complete Setup" : "Connect Stripe"}
        </Button>
      </div>
    </Card>
  );
}
