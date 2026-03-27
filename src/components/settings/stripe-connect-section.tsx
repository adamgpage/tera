"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StripeConnectSetup } from "@/components/payments/stripe-connect-setup";

const CURRENCIES = [
  { value: "usd", label: "USD" },
  { value: "eur", label: "EUR" },
  { value: "gbp", label: "GBP" },
  { value: "aud", label: "AUD" },
  { value: "cad", label: "CAD" },
];

export function StripeConnectSection() {
  const supabase = createClient();
  const { authUser, profile } = useUser();
  const [hasAccount, setHasAccount] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [rateCents, setRateCents] = useState<number>(0);
  const [currency, setCurrency] = useState("usd");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!authUser || !profile?.is_helper) return;

    async function load() {
      const { data: hp } = await supabase
        .from("helper_profiles")
        .select("stripe_connect_account_id, paid_tier_active, session_rate_cents, session_rate_currency")
        .eq("user_id", authUser!.id)
        .single();

      if (hp) {
        const h = hp as Record<string, unknown>;
        setHasAccount(!!(h.stripe_connect_account_id));
        setIsActive(!!(h.paid_tier_active));
        setRateCents((h.session_rate_cents as number) || 0);
        setCurrency((h.session_rate_currency as string) || "usd");
      }
    }

    load();
  }, [authUser, profile, supabase]);

  if (!profile?.is_helper) return null;

  async function handleStartOnboarding(): Promise<string | null> {
    const res = await fetch("/api/stripe/connect", { method: "POST" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.url || null;
  }

  async function handleSaveRate() {
    if (!authUser) return;
    setSaving(true);

    await supabase
      .from("helper_profiles")
      .update({
        session_rate_cents: rateCents,
        session_rate_currency: currency,
      } as Record<string, unknown>)
      .eq("user_id", authUser.id);

    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-text-primary">Paid Consultations</h2>

      <StripeConnectSetup
        hasAccount={hasAccount}
        isActive={isActive}
        onStartOnboarding={handleStartOnboarding}
      />

      {isActive && (
        <Card>
          <div className="space-y-3">
            <p className="text-sm font-medium text-text-primary">Session Rate</p>
            <p className="text-xs text-text-muted">
              Set your per-conversation rate. Changes apply to new matches only.
            </p>

            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  id="rate"
                  label="Amount"
                  type="number"
                  min={0}
                  step={100}
                  value={rateCents ? (rateCents / 100).toString() : ""}
                  onChange={(e) => setRateCents(Math.round(parseFloat(e.target.value || "0") * 100))}
                  placeholder="0.00"
                />
              </div>
              <div className="w-28">
                <Select
                  id="currency"
                  label="Currency"
                  options={CURRENCIES}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button size="sm" onClick={handleSaveRate} loading={saving}>
                Save Rate
              </Button>
              {saved && <span className="text-xs text-green-600">Saved</span>}
              {rateCents === 0 && (
                <span className="text-xs text-text-muted">
                  Leave at 0 to offer free consultations
                </span>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
