import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user is a participant
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, asker_user_id, helper_user_id, request_id, status")
    .eq("id", id)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const conv = conversation as Record<string, unknown>;
  if (conv.asker_user_id !== user.id && conv.helper_user_id !== user.id) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  if (conv.status === "completed") {
    return NextResponse.json({ error: "Already completed" }, { status: 400 });
  }

  // Mark conversation complete
  const now = new Date().toISOString();
  await supabase
    .from("conversations")
    .update({
      status: "completed",
      end_at: now,
    } as Record<string, unknown>)
    .eq("id", id);

  // Update request status
  await supabase
    .from("requests")
    .update({ status: "resolved" } as Record<string, unknown>)
    .eq("id", conv.request_id);

  // Create pending summary record
  await supabase.from("conversation_summaries").insert({
    conversation_id: id,
    generation_status: "pending",
    high_risk_disclaimer: false,
  } as Record<string, unknown>);

  // Capture pending payment if one exists
  const { data: pendingPayment } = await supabase
    .from("payments")
    .select("id, stripe_payment_intent_id")
    .eq("conversation_id", id)
    .eq("status", "pending")
    .single();

  if (pendingPayment) {
    try {
      const { capturePayment } = await import("@/lib/stripe/payments");
      await capturePayment((pendingPayment as Record<string, unknown>).stripe_payment_intent_id as string);
      await supabase
        .from("payments")
        .update({ status: "captured", captured_at: now } as Record<string, unknown>)
        .eq("id", (pendingPayment as Record<string, unknown>).id);
    } catch (err) {
      console.error("Payment capture on completion failed:", err);
      // Don't block conversation completion if payment capture fails
    }
  }

  // Notify both parties
  const otherUserId = user.id === conv.asker_user_id
    ? conv.helper_user_id
    : conv.asker_user_id;

  await supabase.from("notifications").insert([
    {
      user_id: otherUserId,
      type: "conversation_completed",
      reference_id: id,
      reference_type: "conversations",
      channel: "in_app",
      title: "Conversation completed",
      body: "The conversation has been marked as complete. A summary is being generated.",
    },
    {
      user_id: user.id,
      type: "conversation_completed",
      reference_id: id,
      reference_type: "conversations",
      channel: "in_app",
      title: "Conversation completed",
      body: "You marked this conversation as complete. A summary is being generated.",
    },
  ] as Record<string, unknown>[]);

  // Trigger AI summary generation (fire and forget)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  fetch(`${baseUrl}/api/jobs/generate-summary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ conversationId: id }),
  }).catch((err) => console.error("Failed to trigger summary generation:", err));

  return NextResponse.json({ success: true });
}
