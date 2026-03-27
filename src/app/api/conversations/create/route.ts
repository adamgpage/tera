import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createStreamChannel } from "@/lib/stream/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { requestId, matchAttemptId } = body;

  if (!requestId || !matchAttemptId) {
    return NextResponse.json({ error: "Missing requestId or matchAttemptId" }, { status: 400 });
  }

  // Get request details
  const { data: requestData, error: reqError } = await supabase
    .from("requests")
    .select("asker_user_id, preferred_format, parsed_summary")
    .eq("id", requestId)
    .single();

  if (reqError || !requestData) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  // Get helper profile from match attempt
  const { data: matchData } = await supabase
    .from("match_attempts")
    .select("helper_profile_id")
    .eq("id", matchAttemptId)
    .single();

  if (!matchData) {
    return NextResponse.json({ error: "Match attempt not found" }, { status: 404 });
  }

  const { data: helperProfile } = await supabase
    .from("helper_profiles")
    .select("user_id")
    .eq("id", (matchData as Record<string, unknown>).helper_profile_id)
    .single();

  if (!helperProfile) {
    return NextResponse.json({ error: "Helper profile not found" }, { status: 404 });
  }

  const askerUserId = (requestData as Record<string, unknown>).asker_user_id as string;
  const helperUserId = (helperProfile as Record<string, unknown>).user_id as string;
  const format = (requestData as Record<string, unknown>).preferred_format === "synchronous"
    ? "synchronous" : "asynchronous";

  // Create conversation in database
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .insert({
      request_id: requestId,
      asker_user_id: askerUserId,
      helper_user_id: helperUserId,
      format,
      status: "active",
    } as Record<string, unknown>)
    .select("id")
    .single();

  if (convError || !conversation) {
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }

  const conversationId = (conversation as Record<string, unknown>).id as string;

  // Create Stream Chat channel
  const channelId = `conv-${conversationId}`;
  try {
    await createStreamChannel(channelId, [askerUserId, helperUserId], {
      name: ((requestData as Record<string, unknown>).parsed_summary as string)?.slice(0, 60) || "Tera Conversation",
      conversationId,
    });

    // Update conversation with stream channel ID
    await supabase
      .from("conversations")
      .update({ stream_channel_id: channelId } as Record<string, unknown>)
      .eq("id", conversationId);
  } catch (err) {
    console.error("Failed to create Stream channel:", err);
    // Continue — conversation exists in DB even if Stream fails
  }

  // Update match attempt
  await supabase
    .from("match_attempts")
    .update({
      response: "accepted",
      responded_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq("id", matchAttemptId);

  // Update request status
  await supabase
    .from("requests")
    .update({
      status: "in_progress",
      matched_helper_id: (matchData as Record<string, unknown>).helper_profile_id,
    } as Record<string, unknown>)
    .eq("id", requestId);

  // Notify the asker
  await supabase.from("notifications").insert({
    user_id: askerUserId,
    type: "match_confirmed",
    reference_id: conversationId,
    reference_type: "conversations",
    channel: "in_app",
    title: "You've been matched!",
    body: "Someone with relevant experience has accepted your request. Start your conversation now.",
  } as Record<string, unknown>);

  return NextResponse.json({ conversationId, channelId });
}
