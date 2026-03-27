import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import icalGenerator from "ical-generator";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId, startTime, platform } = await request.json();

  if (!conversationId || !startTime) {
    return NextResponse.json(
      { error: "conversationId and startTime required" },
      { status: 400 }
    );
  }

  // Verify participation
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, asker_user_id, helper_user_id, status")
    .eq("id", conversationId)
    .single();

  if (!conv) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const c = conv as Record<string, unknown>;
  if (c.asker_user_id !== user.id && c.helper_user_id !== user.id) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // Get both users' info
  const { data: users } = await supabase
    .from("users")
    .select("id, name, email")
    .in("id", [c.asker_user_id as string, c.helper_user_id as string]);

  const asker = (users as Array<Record<string, unknown>>)?.find((u) => u.id === c.asker_user_id);
  const helper = (users as Array<Record<string, unknown>>)?.find((u) => u.id === c.helper_user_id);

  if (!asker || !helper) {
    return NextResponse.json({ error: "Users not found" }, { status: 404 });
  }

  const start = new Date(startTime);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour default
  const videoPlatform = platform || "native";

  // Update conversation with scheduled time and platform
  await supabase
    .from("conversations")
    .update({
      video_platform: videoPlatform,
      calendar_invite_sent: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  // Generate iCal
  const callUrl =
    videoPlatform === "native"
      ? `${process.env.NEXT_PUBLIC_APP_URL || "https://tera.com"}/conversations/${conversationId}/call`
      : undefined;

  const cal = icalGenerator({ name: "Tera Conversation" });
  cal.createEvent({
    start,
    end,
    summary: `Tera Conversation — ${(asker.name as string)} & ${(helper.name as string)}`,
    description: [
      "Your Tera conversation is scheduled.",
      "",
      videoPlatform === "native"
        ? `Join here: ${callUrl}`
        : `Platform: ${videoPlatform}. Meeting link will be generated before the call.`,
      "",
      "Please ensure you have a stable internet connection and a quiet environment.",
      videoPlatform !== "native"
        ? "IMPORTANT: Please enable transcription/recording on your platform so Tera can generate your conversation summary."
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    url: callUrl,
    organizer: {
      name: "Tera",
      email: "calls@tera.com",
    },
    attendees: [
      { name: asker.name as string, email: asker.email as string },
      { name: helper.name as string, email: helper.email as string },
    ],
  });

  const icalString = cal.toString();

  // Create notifications for both parties
  const otherUserId = user.id === c.asker_user_id ? c.helper_user_id : c.asker_user_id;
  await supabase.from("notifications").insert([
    {
      user_id: otherUserId,
      type: "call_scheduled",
      content: `A call has been scheduled for ${start.toLocaleString()}`,
      linked_entity_type: "conversation",
      linked_entity_id: conversationId,
    },
  ]);

  return NextResponse.json({
    scheduled: true,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    platform: videoPlatform,
    ical: icalString,
  });
}
