import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MIN_RATING_LENGTH } from "@/lib/utils/constants";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { narrative_text, resolved } = body;

  if (!narrative_text || narrative_text.length < MIN_RATING_LENGTH) {
    return NextResponse.json(
      { error: `Rating must be at least ${MIN_RATING_LENGTH} characters` },
      { status: 400 }
    );
  }

  // Verify user is a participant
  const { data: conversation } = await supabase
    .from("conversations")
    .select("asker_user_id, helper_user_id, status")
    .eq("id", id)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const conv = conversation as Record<string, unknown>;
  if (conv.asker_user_id !== user.id && conv.helper_user_id !== user.id) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // Check for existing rating from this user
  const { data: existingRating } = await supabase
    .from("ratings")
    .select("id")
    .eq("conversation_id", id)
    .eq("author_user_id", user.id)
    .single();

  if (existingRating) {
    return NextResponse.json({ error: "Already rated" }, { status: 400 });
  }

  const subjectUserId = user.id === conv.asker_user_id
    ? conv.helper_user_id
    : conv.asker_user_id;

  // Insert rating (visible = false until both have rated)
  await supabase.from("ratings").insert({
    conversation_id: id,
    author_user_id: user.id,
    subject_user_id: subjectUserId,
    narrative_text,
    resolved: resolved ?? null,
    visible: false,
  } as Record<string, unknown>);

  // Check if both parties have now rated
  const { count } = await supabase
    .from("ratings")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", id);

  if (count && count >= 2) {
    // Make both ratings visible
    await supabase
      .from("ratings")
      .update({ visible: true } as Record<string, unknown>)
      .eq("conversation_id", id);

    // Notify both parties
    for (const userId of [conv.asker_user_id as string, conv.helper_user_id as string]) {
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "ratings_visible",
        reference_id: id,
        reference_type: "conversations",
        channel: "in_app",
        title: "Ratings now visible",
        body: "Both parties have rated this conversation. Ratings are now visible.",
      } as Record<string, unknown>);
    }
  }

  return NextResponse.json({ success: true, bothRated: (count ?? 0) >= 2 });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get ratings for this conversation
  const { data: ratings } = await supabase
    .from("ratings")
    .select("*")
    .eq("conversation_id", id);

  // Check if current user has rated
  const myRating = (ratings as any[] ?? []).find((r) => r.author_user_id === user.id);
  const otherRating = (ratings as any[] ?? []).find((r) => r.author_user_id !== user.id);
  const bothRated = (ratings?.length ?? 0) >= 2;

  return NextResponse.json({
    myRating: myRating || null,
    otherRating: bothRated ? otherRating : null,
    bothRated,
  });
}
