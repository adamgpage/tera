import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { capturePayment } from "@/lib/stripe/payments";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await request.json();

  // Get payment record
  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("status", "pending")
    .single();

  if (!payment) {
    return NextResponse.json({ error: "No pending payment found" }, { status: 404 });
  }

  const p = payment as Record<string, unknown>;

  // Verify user is a participant
  if (p.asker_user_id !== user.id && p.helper_user_id !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    await capturePayment(p.stripe_payment_intent_id as string);

    await supabase
      .from("payments")
      .update({
        status: "captured",
        captured_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq("id", p.id);

    // Notify both parties
    for (const userId of [p.asker_user_id as string, p.helper_user_id as string]) {
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "payment_captured",
        reference_id: conversationId,
        reference_type: "conversations",
        channel: "in_app",
        title: "Payment processed",
        body: `Payment of ${((p.amount_cents as number) / 100).toFixed(2)} ${p.currency} has been processed.`,
      } as Record<string, unknown>);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Payment capture error:", err);
    return NextResponse.json({ error: "Payment capture failed" }, { status: 500 });
  }
}
