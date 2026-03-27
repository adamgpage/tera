import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  const stripe = getStripe();
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object;
      const conversationId = pi.metadata?.conversation_id;
      if (conversationId) {
        await supabase
          .from("payments")
          .update({
            status: "captured",
            captured_at: new Date().toISOString(),
          } as Record<string, unknown>)
          .eq("stripe_payment_intent_id", pi.id);
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object;
      const conversationId = pi.metadata?.conversation_id;
      if (conversationId) {
        await supabase
          .from("payments")
          .update({ status: "failed" } as Record<string, unknown>)
          .eq("stripe_payment_intent_id", pi.id);
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object;
      const pi = charge.payment_intent;
      if (pi) {
        await supabase
          .from("payments")
          .update({
            status: "refunded",
            refunded_at: new Date().toISOString(),
          } as Record<string, unknown>)
          .eq("stripe_payment_intent_id", pi);
      }
      break;
    }

    case "account.updated": {
      // Connect account status change
      const account = event.data.object;
      if (account.charges_enabled && account.payouts_enabled) {
        await supabase
          .from("helper_profiles")
          .update({ paid_tier_active: true } as Record<string, unknown>)
          .eq("stripe_connect_account_id", account.id);
      }
      break;
    }

    default:
      // Unhandled event type
      break;
  }

  return NextResponse.json({ received: true });
}
