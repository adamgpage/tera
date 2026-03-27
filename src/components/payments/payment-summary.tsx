"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";

interface PaymentSummaryProps {
  conversationId: string;
}

interface PaymentData {
  id: string;
  amount_cents: number;
  currency: string;
  tera_fee_cents: number;
  helper_payout_cents: number;
  status: string;
  captured_at: string | null;
  refunded_at: string | null;
  asker_user_id: string;
}

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function PaymentSummary({ conversationId }: PaymentSummaryProps) {
  const supabase = createClient();
  const { authUser } = useUser();
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("conversation_id", conversationId)
        .single();

      if (data) {
        setPayment(data as unknown as PaymentData);
      }
    }
    load();
  }, [conversationId, supabase]);

  if (!payment) return null;

  const isAsker = authUser?.id === payment.asker_user_id;
  const canRefund =
    isAsker &&
    payment.status === "captured" &&
    payment.captured_at &&
    (Date.now() - new Date(payment.captured_at).getTime()) < 48 * 3600000;

  async function handleRefund() {
    setRefunding(true);
    try {
      await fetch("/api/payments/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      // Refresh payment data
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("conversation_id", conversationId)
        .single();
      if (data) setPayment(data as unknown as PaymentData);
    } finally {
      setRefunding(false);
    }
  }

  const statusVariant: Record<string, "default" | "success" | "warning" | "danger"> = {
    pending: "warning",
    captured: "success",
    failed: "danger",
    refunded: "default",
  };

  return (
    <Card>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Payment</h3>
          <Badge variant={statusVariant[payment.status] || "default"}>
            {payment.status}
          </Badge>
        </div>

        <div className="rounded-lg bg-surface-secondary p-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Amount</span>
            <span className="font-medium text-text-primary">
              {formatAmount(payment.amount_cents, payment.currency)}
            </span>
          </div>
          {isAsker && (
            <>
              <div className="flex justify-between text-xs text-text-muted">
                <span>Platform fee (15%)</span>
                <span>{formatAmount(payment.tera_fee_cents, payment.currency)}</span>
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>Helper receives</span>
                <span>{formatAmount(payment.helper_payout_cents, payment.currency)}</span>
              </div>
            </>
          )}
        </div>

        {canRefund && (
          <div className="space-y-2">
            <p className="text-xs text-text-muted">
              You have 48 hours from payment to request a refund.
            </p>
            <Button variant="secondary" size="sm" onClick={handleRefund} loading={refunding}>
              Request Refund
            </Button>
          </div>
        )}

        {payment.status === "refunded" && (
          <p className="text-xs text-text-muted">
            Refunded on {new Date(payment.refunded_at!).toLocaleDateString()}
          </p>
        )}
      </div>
    </Card>
  );
}
