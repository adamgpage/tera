import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { indexCommonsEntry } from "@/lib/typesense/client";

/**
 * POST /api/knowledge/publish
 * Publishes a conversation to the Knowledge Commons when both parties consent.
 * Called after dual consent is confirmed.
 */
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

  // Get conversation with consent flags
  const { data: conv } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (!conv) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const c = conv as Record<string, unknown>;

  // Verify user is a participant
  if (c.asker_user_id !== user.id && c.helper_user_id !== user.id) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // Both must have consented
  if (!c.knowledge_commons_consent_asker || !c.knowledge_commons_consent_helper) {
    return NextResponse.json(
      { error: "Both parties must consent before publishing" },
      { status: 400 }
    );
  }

  // Check if already published
  const { data: existing } = await supabase
    .from("knowledge_commons_entries")
    .select("id")
    .eq("conversation_id", conversationId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Already published", entryId: (existing as Record<string, unknown>).id }, { status: 409 });
  }

  // Get request for domain/geographic tags
  const { data: req } = await supabase
    .from("requests")
    .select("expertise_tags, geographic_context")
    .eq("id", c.request_id)
    .single();

  const r = (req || {}) as Record<string, unknown>;
  const domainTags = (r.expertise_tags as string[]) || [];
  const geoContext = (r.geographic_context as string) || "";
  const geoTags = geoContext ? [geoContext] : [];

  // Generate SEO slug
  const slugBase = domainTags.slice(0, 2).join("-") + (geoTags.length ? `-${geoTags[0]}` : "");
  const slug = slugBase.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 80);
  const seoSlug = `${slug}-${conversationId.slice(0, 8)}`;

  // Create entry
  const { data: entry, error: insertError } = await supabase
    .from("knowledge_commons_entries")
    .insert({
      conversation_id: conversationId,
      domain_tags: domainTags,
      geographic_context_tags: geoTags,
      anonymised_summary: c.summary || "Summary pending.",
      tera_verified: true,
      seo_slug: seoSlug,
      page_views: 0,
    })
    .select()
    .single();

  if (insertError || !entry) {
    console.error("Commons insert error:", insertError);
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
  }

  const e = entry as Record<string, unknown>;

  // Index in Typesense
  try {
    await indexCommonsEntry({
      id: e.id as string,
      summary: e.anonymised_summary as string,
      domain_tags: domainTags,
      geographic_tags: geoTags,
      seo_slug: seoSlug,
      date_published: new Date(),
      tera_verified: true,
    });
  } catch (err) {
    console.error("Typesense indexing error (will retry):", err);
    // Non-blocking: entry exists in DB, indexing can be retried
  }

  return NextResponse.json({
    published: true,
    entryId: e.id,
    url: `/knowledge/${domainTags[0] || "general"}/${seoSlug}`,
  });
}
