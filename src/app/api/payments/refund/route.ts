import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { refundPayment } from "@/lib/stripe/payments";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId, amountCents } = await request.json();

  // Get payment record
  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("status", "captured")
    .single();

  if (!payment) {
    return NextResponse.json({ error: "No captured payment found" }, { status: 404 });
  }

  const p = payment as Record<string, unknown>;

  // Only asker can request refund
  if (p.asker_user_id !== user.id) {
    return NextResponse.json({ error: "Only the asker can request a refund" }, { status: 403 });
  }

  // Check 48-hour window
  const capturedAt = new Date(p.captured_at as string);
  const hoursSinceCapture = (Date.now() - capturedAt.getTime()) / 3600000;
  if (hoursSinceCapture > 48) {
    return NextResponse.json(
      { error: "Refund window has expired (48 hours after payment)" },
      { status: 400 }
    );
  }

  try {
    await refundPayment(p.stripe_payment_intent_id as string, amountCents);

    await supabase
      .from("payments")
      .update({
        status: "refunded",
        refunded_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq("id", p.id);

    // Notify both parties
    for (const userId of [p.asker_user_id as string, p.helper_user_id as string]) {
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "payment_refunded",
        reference_id: conversationId,
        reference_type: "conversations",
        channel: "in_app",
        title: "Payment refunded",
        body: "The payment for this conversation has been refunded.",
      } as Record<string, unknown>);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Refund error:", err);
    return NextResponse.json({ error: "Refund failed" }, { status: 500 });
  }
}
