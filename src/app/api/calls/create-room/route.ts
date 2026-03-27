import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRoom } from "@/lib/daily/server";

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

  // Verify user is a participant
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

  if (c.status !== "active") {
    return NextResponse.json({ error: "Conversation is not active" }, { status: 400 });
  }

  try {
    const room = await createRoom(conversationId);

    return NextResponse.json({
      roomUrl: room.url,
      roomName: room.name,
    });
  } catch (err) {
    console.error("Create room error:", err);
    return NextResponse.json(
      { error: "Failed to create video room. Ensure DAILY_API_KEY is configured." },
      { status: 500 }
    );
  }
}
