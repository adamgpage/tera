import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateHelperTags, generateEmbedding } from "@/lib/claude/client";

/**
 * Process a helper profile: generate expertise tags and embedding.
 * Called on helper onboarding and biography updates.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const validKeys = [
    process.env.INTERNAL_API_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ].filter(Boolean);
  const token = authHeader?.replace("Bearer ", "");
  if (!token || !validKeys.includes(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { helperProfileId } = await request.json();
  if (!helperProfileId) {
    return NextResponse.json({ error: "helperProfileId required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("helper_profiles")
    .select("*")
    .eq("id", helperProfileId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const p = profile as Record<string, unknown>;

  try {
    // 1. Generate expertise tags from biography
    const tagResult = await generateHelperTags(p.biography as string);

    // 2. Generate embedding from biography + tags
    const embeddingText = `${p.biography} ${tagResult.expertise_tags.join(" ")} ${tagResult.domains.join(" ")}`;
    const embeddingResult = await generateEmbedding(embeddingText);

    // 3. Update profile
    const embeddingStr = `[${embeddingResult.embedding.join(",")}]`;

    await supabase
      .from("helper_profiles")
      .update({
        expertise_tags: tagResult.expertise_tags,
        expertise_embedding: embeddingStr,
      })
      .eq("id", helperProfileId);

    // 4. Record AI job cost
    const totalTokens =
      tagResult.usage.input_tokens + tagResult.usage.output_tokens +
      embeddingResult.usage.input_tokens + embeddingResult.usage.output_tokens;
    const costUsd = ((tagResult.usage.input_tokens + embeddingResult.usage.input_tokens) * 3 +
      (tagResult.usage.output_tokens + embeddingResult.usage.output_tokens) * 15) / 1_000_000;

    await supabase.from("ai_jobs").insert({
      job_type: "helper_embed",
      priority: 4,
      status: "complete",
      entity_type: "helper_profile",
      entity_id: helperProfileId,
      completed_at: new Date().toISOString(),
      token_usage: totalTokens,
      cost_usd: costUsd,
    });

    return NextResponse.json({
      status: "embedded",
      expertise_tags: tagResult.expertise_tags,
    });
  } catch (err) {
    console.error("Helper embed error:", err);

    await supabase.from("ai_jobs").insert({
      job_type: "helper_embed",
      priority: 4,
      status: "failed",
      entity_type: "helper_profile",
      entity_id: helperProfileId,
      error_message: err instanceof Error ? err.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to process helper profile" }, { status: 500 });
  }
}
