import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Run the vector-based matching engine for a confirmed request.
 * Finds the top 5 candidate helpers and notifies the best match.
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

  const { requestId } = await request.json();
  if (!requestId) {
    return NextResponse.json({ error: "requestId required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get the request with its embedding
  const { data: req, error: fetchErr } = await supabase
    .from("requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchErr || !req) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const r = req as Record<string, unknown>;

  if (!r.request_embedding) {
    return NextResponse.json({ error: "Request has no embedding yet" }, { status: 400 });
  }

  try {
    // Update status to matching
    await supabase
      .from("requests")
      .update({ status: "matching" })
      .eq("id", requestId);

    // Notify asker that matching has started
    await supabase.from("notifications").insert({
      user_id: r.asker_user_id,
      type: "match_cascading",
      content: "We're finding the best match for your request...",
      linked_entity_type: "request",
      linked_entity_id: requestId,
    });

    // Run vector similarity search via the match_helpers function
    const { data: candidates, error: matchErr } = await supabase
      .rpc("match_helpers", {
        query_embedding: r.request_embedding,
        match_threshold: 0.2,
        match_count: 20,
      });

    if (matchErr) {
      console.error("Match RPC error:", matchErr);
      // Fall back to tag-based matching
      return await fallbackTagMatch(supabase, r, requestId);
    }

    if (!candidates || candidates.length === 0) {
      // No vector matches — try tag-based fallback
      return await fallbackTagMatch(supabase, r, requestId);
    }

    // Filter out blocked users and helpers at capacity
    const askerBlocked: string[] = [];
    const { data: askerUser } = await supabase
      .from("users")
      .select("blocked_user_ids")
      .eq("id", r.asker_user_id)
      .single();
    if (askerUser) {
      const u = askerUser as Record<string, unknown>;
      if (Array.isArray(u.blocked_user_ids)) {
        askerBlocked.push(...(u.blocked_user_ids as string[]));
      }
    }

    // Get helper details for filtering
    const candidateIds = (candidates as Array<{ helper_profile_id: string }>).map(
      (c) => c.helper_profile_id
    );

    const { data: helperProfiles } = await supabase
      .from("helper_profiles")
      .select("id, user_id, availability_status, total_conversations, reputation_score, paid_tier_active, session_rate_cents")
      .in("id", candidateIds);

    if (!helperProfiles || helperProfiles.length === 0) {
      return await markUnmatched(supabase, r, requestId);
    }

    // Score and rank candidates
    const ranked = (candidates as Array<{ helper_profile_id: string; similarity: number }>)
      .map((c) => {
        const profile = (helperProfiles as Array<Record<string, unknown>>).find(
          (p) => p.id === c.helper_profile_id
        );
        if (!profile) return null;
        if (askerBlocked.includes(profile.user_id as string)) return null;
        if (profile.availability_status === "unavailable") return null;

        // Free helpers get a ranking boost over paid (spec requirement)
        const paidPenalty = profile.paid_tier_active ? -0.05 : 0;
        const reputationBoost = (profile.reputation_score as number || 0.5) * 0.1;

        return {
          helper_profile_id: c.helper_profile_id,
          user_id: profile.user_id as string,
          score: c.similarity + reputationBoost + paidPenalty,
          similarity: c.similarity,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score)
      .slice(0, 5);

    if (ranked.length === 0) {
      return await markUnmatched(supabase, r, requestId);
    }

    // Create match attempts for top 5
    const matchAttempts = ranked.map((c, i) => ({
      request_id: requestId,
      helper_profile_id: c!.helper_profile_id,
      match_score: c!.score,
      rank: i + 1,
      response: "pending",
    }));

    await supabase.from("match_attempts").insert(matchAttempts);

    // Notify the top-ranked helper (Priority 1)
    const topMatch = ranked[0]!;

    await supabase.from("notifications").insert({
      user_id: topMatch.user_id,
      type: "match_invitation",
      content: `New request matching your expertise: ${(r.parsed_summary as string || "").slice(0, 100)}...`,
      linked_entity_type: "request",
      linked_entity_id: requestId,
    });

    // Update asker with match progress
    await supabase.from("notifications").insert({
      user_id: r.asker_user_id as string,
      type: "match_cascading",
      content: "We've found a potential match and notified them. Waiting for their response...",
      linked_entity_type: "request",
      linked_entity_id: requestId,
    });

    // Record AI job
    await supabase.from("ai_jobs").insert({
      job_type: "match_notify",
      priority: 1,
      status: "complete",
      entity_type: "request",
      entity_id: requestId,
      completed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      status: "matching",
      candidates_found: ranked.length,
      top_match_notified: true,
    });
  } catch (err) {
    console.error("Matching error:", err);
    return NextResponse.json({ error: "Matching failed" }, { status: 500 });
  }
}

/**
 * Fallback: match by overlapping expertise tags when vector search fails or returns nothing.
 */
async function fallbackTagMatch(
  supabase: ReturnType<typeof createAdminClient>,
  r: Record<string, unknown>,
  requestId: string
) {
  const tags = r.expertise_tags as string[] || [];

  if (tags.length === 0) {
    return await markUnmatched(supabase, r, requestId);
  }

  const { data: helpers } = await supabase
    .from("helper_profiles")
    .select("id, user_id, expertise_tags, reputation_score, paid_tier_active")
    .eq("availability_status", "available")
    .limit(50);

  if (!helpers || helpers.length === 0) {
    return await markUnmatched(supabase, r, requestId);
  }

  // Score by tag overlap
  const scored = (helpers as Array<Record<string, unknown>>)
    .map((h) => {
      const helperTags = (h.expertise_tags as string[] || []).map((t: string) => t.toLowerCase());
      const overlap = tags.filter((t) => helperTags.some((ht: string) => ht.includes(t.toLowerCase()) || t.toLowerCase().includes(ht)));
      const paidPenalty = h.paid_tier_active ? -0.05 : 0;
      return {
        helper_profile_id: h.id as string,
        user_id: h.user_id as string,
        score: (overlap.length / tags.length) + paidPenalty,
      };
    })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (scored.length === 0) {
    return await markUnmatched(supabase, r, requestId);
  }

  // Create match attempts and notify top
  const matchAttempts = scored.map((c, i) => ({
    request_id: requestId,
    helper_profile_id: c.helper_profile_id,
    match_score: c.score,
    rank: i + 1,
    response: "pending",
  }));

  await supabase.from("match_attempts").insert(matchAttempts);

  await supabase.from("notifications").insert({
    user_id: scored[0].user_id,
    type: "match_invitation",
    content: `New request matching your expertise: ${(r.parsed_summary as string || "").slice(0, 100)}...`,
    linked_entity_type: "request",
    linked_entity_id: requestId,
  });

  return NextResponse.json({
    status: "matching",
    candidates_found: scored.length,
    match_method: "tag_fallback",
  });
}

async function markUnmatched(
  supabase: ReturnType<typeof createAdminClient>,
  r: Record<string, unknown>,
  requestId: string
) {
  await supabase
    .from("requests")
    .update({ status: "unmatched" })
    .eq("id", requestId);

  await supabase.from("notifications").insert({
    user_id: r.asker_user_id as string,
    type: "match_exhausted",
    content: "We haven't found a match yet, but your request is visible to helpers who can browse and volunteer. We'll keep looking.",
    linked_entity_type: "request",
    linked_entity_id: requestId,
  });

  return NextResponse.json({ status: "unmatched", candidates_found: 0 });
}
