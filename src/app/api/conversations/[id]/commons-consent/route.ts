import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  const { consent } = body;

  // Verify participant
  const { data: conversation } = await supabase
    .from("conversations")
    .select("asker_user_id, helper_user_id")
    .eq("id", id)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const conv = conversation as Record<string, unknown>;
  const isAsker = conv.asker_user_id === user.id;
  const isHelper = conv.helper_user_id === user.id;

  if (!isAsker && !isHelper) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // Check if entry exists
  const { data: existing } = await supabase
    .from("knowledge_commons_entries")
    .select("id, asker_consent, helper_consent")
    .eq("conversation_id", id)
    .single();

  if (existing) {
    // Update consent
    const updateField = isAsker ? "asker_consent" : "helper_consent";
    await supabase
      .from("knowledge_commons_entries")
      .update({ [updateField]: consent } as Record<string, unknown>)
      .eq("id", (existing as Record<string, unknown>).id);

    // Check if both consent — if so, publish
    const entry = existing as Record<string, unknown>;
    const otherConsent = isAsker ? entry.helper_consent : entry.asker_consent;

    if (consent && otherConsent) {
      // Get summary for the entry
      const { data: summary } = await supabase
        .from("conversation_summaries")
        .select("problem_as_stated, problem_as_understood, approach_provided, key_actions")
        .eq("conversation_id", id)
        .single();

      const { data: request } = await supabase
        .from("requests")
        .select("expertise_tags, geographic_context")
        .eq("id", (await supabase.from("conversations").select("request_id").eq("id", id).single()).data?.request_id)
        .single();

      const summaryText = summary
        ? [
            (summary as any).problem_as_stated,
            (summary as any).problem_as_understood,
            (summary as any).approach_provided,
            (summary as any).key_actions,
          ].filter(Boolean).join("\n\n")
        : "Summary unavailable";

      await supabase
        .from("knowledge_commons_entries")
        .update({
          published: true,
          published_at: new Date().toISOString(),
          anonymised_summary: summaryText,
          domain_tags: (request as any)?.expertise_tags || [],
          geographic_context_tags: Object.keys((request as any)?.geographic_context || {}),
          tera_verified: true,
        } as Record<string, unknown>)
        .eq("id", (existing as Record<string, unknown>).id);
    }

    return NextResponse.json({ success: true });
  }

  // Create new entry
  const consentField = isAsker
    ? { asker_consent: consent, helper_consent: false }
    : { asker_consent: false, helper_consent: consent };

  await supabase.from("knowledge_commons_entries").insert({
    conversation_id: id,
    ...consentField,
    published: false,
    tera_verified: false,
    anonymised_summary: "",
    domain_tags: [],
    geographic_context_tags: [],
  } as Record<string, unknown>);

  return NextResponse.json({ success: true });
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

  const { data: entry } = await supabase
    .from("knowledge_commons_entries")
    .select("asker_consent, helper_consent, published")
    .eq("conversation_id", id)
    .single();

  // Determine which consent belongs to this user
  const { data: conversation } = await supabase
    .from("conversations")
    .select("asker_user_id")
    .eq("id", id)
    .single();

  const isAsker = (conversation as Record<string, unknown>)?.asker_user_id === user.id;

  if (!entry) {
    return NextResponse.json({ myConsent: null, otherConsent: null, published: false });
  }

  const e = entry as Record<string, unknown>;
  return NextResponse.json({
    myConsent: isAsker ? e.asker_consent : e.helper_consent,
    otherConsent: isAsker ? e.helper_consent : e.asker_consent,
    published: e.published,
  });
}
