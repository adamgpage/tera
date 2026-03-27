import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Helper responds to a match invitation (accept or decline).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { matchAttemptId, response: matchResponse } = await request.json();

  if (!matchAttemptId || !["accepted", "declined"].includes(matchResponse)) {
    return NextResponse.json({ error: "matchAttemptId and response (accepted/declined) required" }, { status: 400 });
  }

  // Get the match attempt and verify this helper owns it
  const { data: attempt } = await supabase
    .from("match_attempts")
    .select("*, helper_profiles!inner(user_id), requests!inner(asker_user_id, parsed_summary, preferred_format, status)")
    .eq("id", matchAttemptId)
    .single();

  if (!attempt) {
    return NextResponse.json({ error: "Match attempt not found" }, { status: 404 });
  }

  const a = attempt as Record<string, unknown>;
  const helperProfile = a.helper_profiles as Record<string, unknown>;
  const req = a.requests as Record<string, unknown>;

  if (helperProfile.user_id !== user.id) {
    return NextResponse.json({ error: "Not your match invitation" }, { status: 403 });
  }

  if (a.response !== "pending") {
    return NextResponse.json({ error: "Already responded" }, { status: 400 });
  }

  // Update the match attempt
  await supabase
    .from("match_attempts")
    .update({
      response: matchResponse,
      responded_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq("id", matchAttemptId);

  if (matchResponse === "accepted") {
    // Create conversation
    const format = req.preferred_format === "synchronous" ? "synchronous" : "asynchronous";

    const { data: conversation } = await supabase
      .from("conversations")
      .insert({
        request_id: a.request_id,
        asker_user_id: req.asker_user_id,
        helper_user_id: user.id,
        format,
        status: "active",
      } as Record<string, unknown>)
      .select("id")
      .single();

    if (!conversation) {
      return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
    }

    const conversationId = (conversation as Record<string, unknown>).id as string;

    // Update request status
    await supabase
      .from("requests")
      .update({
        status: "in_progress",
        matched_helper_id: a.helper_profile_id,
      } as Record<string, unknown>)
      .eq("id", a.request_id);

    // Notify asker
    await supabase.from("notifications").insert({
      user_id: req.asker_user_id,
      type: "match_confirmed",
      content: "A helper has accepted your request! Start your conversation now.",
      linked_entity_type: "conversation",
      linked_entity_id: conversationId,
    });

    return NextResponse.json({ conversationId });
  } else {
    // Declined — notify the next helper in the cascade
    // Find the next pending match attempt for this request
    const { data: nextAttempt } = await supabase
      .from("match_attempts")
      .select("id, helper_profile_id, helper_profiles!inner(user_id)")
      .eq("request_id", a.request_id)
      .eq("response", "pending")
      .order("rank", { ascending: true })
      .limit(1)
      .single();

    if (nextAttempt) {
      const next = nextAttempt as Record<string, unknown>;
      const nextHelper = next.helper_profiles as Record<string, unknown>;

      await supabase.from("notifications").insert({
        user_id: nextHelper.user_id,
        type: "match_invitation",
        content: `New request matching your expertise: ${(req.parsed_summary as string || "").slice(0, 100)}...`,
        linked_entity_type: "request",
        linked_entity_id: a.request_id,
      });

      // Notify asker about cascade
      await supabase.from("notifications").insert({
        user_id: req.asker_user_id,
        type: "match_cascading",
        content: "The first helper wasn't available. We've notified the next best match.",
        linked_entity_type: "request",
        linked_entity_id: a.request_id,
      });
    } else {
      // No more candidates — mark unmatched
      await supabase
        .from("requests")
        .update({ status: "unmatched" } as Record<string, unknown>)
        .eq("id", a.request_id);

      await supabase.from("notifications").insert({
        user_id: req.asker_user_id,
        type: "match_exhausted",
        content: "We haven't found a match yet. Your request is visible to helpers who can browse and volunteer.",
        linked_entity_type: "request",
        linked_entity_id: a.request_id,
      });
    }

    return NextResponse.json({ status: "declined" });
  }
}
