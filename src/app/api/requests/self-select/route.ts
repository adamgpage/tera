import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId, helperProfileId } = await request.json();

  if (!requestId || !helperProfileId) {
    return NextResponse.json({ error: "Missing requestId or helperProfileId" }, { status: 400 });
  }

  // Verify helper profile belongs to user
  const { data: hp } = await supabase
    .from("helper_profiles")
    .select("id, user_id")
    .eq("id", helperProfileId)
    .single();

  if (!hp || (hp as Record<string, unknown>).user_id !== user.id) {
    return NextResponse.json({ error: "Invalid helper profile" }, { status: 403 });
  }

  // Get request
  const { data: req } = await supabase
    .from("requests")
    .select("id, status, asker_user_id, preferred_format, parsed_summary")
    .eq("id", requestId)
    .single();

  if (!req) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const r = req as Record<string, unknown>;
  if (!["confirmed", "matching", "unmatched"].includes(r.status as string)) {
    return NextResponse.json({ error: "Request is no longer open" }, { status: 400 });
  }

  // Can't help yourself
  if (r.asker_user_id === user.id) {
    return NextResponse.json({ error: "Cannot volunteer for your own request" }, { status: 400 });
  }

  // Create a match attempt record
  await supabase.from("match_attempts").insert({
    request_id: requestId,
    helper_profile_id: helperProfileId,
    match_score: 0, // Self-selected, no vector score
    rank: 0,
    notified_at: new Date().toISOString(),
    response: "accepted",
    responded_at: new Date().toISOString(),
  } as Record<string, unknown>);

  // Create conversation
  const format = r.preferred_format === "synchronous" ? "synchronous" : "asynchronous";

  const { data: conversation } = await supabase
    .from("conversations")
    .insert({
      request_id: requestId,
      asker_user_id: r.asker_user_id,
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

  // Update request
  await supabase
    .from("requests")
    .update({
      status: "in_progress",
      matched_helper_id: helperProfileId,
    } as Record<string, unknown>)
    .eq("id", requestId);

  // Notify asker
  await supabase.from("notifications").insert({
    user_id: r.asker_user_id,
    type: "match_confirmed",
    reference_id: conversationId,
    reference_type: "conversations",
    channel: "in_app",
    title: "You've been matched!",
    body: "A helper has volunteered to help with your request. Start your conversation now.",
  } as Record<string, unknown>);

  return NextResponse.json({ conversationId });
}
