import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createMeetingToken } from "@/lib/daily/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomName } = await request.json();

  if (!roomName) {
    return NextResponse.json({ error: "roomName required" }, { status: 400 });
  }

  // Get user name
  const { data: userData } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single();

  const userName = (userData as Record<string, unknown>)?.name as string || "User";

  try {
    const token = await createMeetingToken(roomName, user.id, userName);
    return NextResponse.json({ token });
  } catch (err) {
    console.error("Create token error:", err);
    return NextResponse.json(
      { error: "Failed to create meeting token" },
      { status: 500 }
    );
  }
}
