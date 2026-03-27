import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPaymentIntent } from "@/lib/stripe/payments";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await request.json();

  if (!conversationId) {
    return NextResponse.json({ error: "conversationId required" }, { status: 400 });
  }

  // Get conversation
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, asker_user_id, helper_user_id")
    .eq("id", conversationId)
    .single();

  if (!conv || (conv as Record<string, unknown>).asker_user_id !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const c = conv as Record<string, unknown>;

  // Get helper's Stripe account and rate
  const { data: helperProfile } = await supabase
    .from("helper_profiles")
    .select("stripe_connect_account_id, session_rate_cents, session_rate_currency, paid_tier_active")
    .eq("user_id", c.helper_user_id)
    .single();

  if (!helperProfile) {
    return NextResponse.json({ error: "Helper profile not found" }, { status: 404 });
  }

  const hp = helperProfile as Record<string, unknown>;

  if (!hp.paid_tier_active || !hp.stripe_connect_account_id || !hp.session_rate_cents) {
    return NextResponse.json({ error: "Helper does not have paid tier active" }, { status: 400 });
  }

  // Get asker email
  const { data: askerData } = await supabase
    .from("users")
    .select("email")
    .eq("id", user.id)
    .single();

  try {
    const result = await createPaymentIntent({
      amountCents: hp.session_rate_cents as number,
      currency: (hp.session_rate_currency as string) || "usd",
      helperStripeAccountId: hp.stripe_connect_account_id as string,
      conversationId,
      askerEmail: (askerData as Record<string, unknown>)?.email as string || "",
    });

    // Create payment record
    await supabase.from("payments").insert({
      conversation_id: conversationId,
      asker_user_id: user.id,
      helper_user_id: c.helper_user_id,
      amount_cents: hp.session_rate_cents,
      currency: (hp.session_rate_currency as string) || "usd",
      tera_fee_cents: result.feeCents,
      helper_payout_cents: result.helperPayoutCents,
      stripe_payment_intent_id: result.paymentIntentId,
      status: "pending",
    } as Record<string, unknown>);

    return NextResponse.json({
      clientSecret: result.clientSecret,
      amountCents: hp.session_rate_cents,
      currency: hp.session_rate_currency || "usd",
      feeCents: result.feeCents,
    });
  } catch (err) {
    console.error("Payment authorization error:", err);
    return NextResponse.json({ error: "Payment authorization failed" }, { status: 500 });
  }
}
