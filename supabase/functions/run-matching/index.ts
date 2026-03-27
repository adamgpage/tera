import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";

// Matching weights from spec
const WEIGHTS = {
  expertise: 0.4,
  geographic: 0.2,
  language: 0.2,
  reputation: 0.15,
  availability: 0.05,
};

const SHORTLIST_SIZE = 5;

interface HelperCandidate {
  helper_profile_id: string;
  user_id: string;
  similarity: number;
  country: string;
  languages: string[];
  reputation_score: number;
  availability_status: string;
  paid_tier_active: boolean;
  session_rate_cents: number | null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createServiceClient();

  try {
    const { requestId } = await req.json();

    if (!requestId) {
      return new Response(
        JSON.stringify({ error: "requestId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the request
    const { data: request, error: reqError } = await supabase
      .from("requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (reqError || !request) {
      return new Response(
        JSON.stringify({ error: "Request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const req_data = request as Record<string, any>;

    // Check the request has an embedding
    if (!req_data.request_embedding) {
      // No embedding yet — possibly still generating. Skip and let retry pick it up.
      return new Response(
        JSON.stringify({ status: "skipped", reason: "Request embedding not yet generated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to matching
    await supabase
      .from("requests")
      .update({ status: "matching" })
      .eq("id", requestId);

    // Step 1: Vector similarity search
    const { data: vectorMatches, error: matchError } = await supabase
      .rpc("match_helpers", {
        query_embedding: req_data.request_embedding,
        match_threshold: 0.2,
        match_count: 50,
      });

    if (matchError || !vectorMatches || vectorMatches.length === 0) {
      // No matches found
      await supabase
        .from("requests")
        .update({ status: "unmatched" })
        .eq("id", requestId);

      return new Response(
        JSON.stringify({ status: "unmatched", reason: "No helpers with matching expertise" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Fetch full profiles for the vector matches
    const helperIds = (vectorMatches as any[]).map((m: any) => m.helper_profile_id);
    const { data: profiles } = await supabase
      .from("helper_profiles")
      .select("id, user_id, country:user_id(country, languages), reputation_score, availability_status, paid_tier_active, session_rate_cents")
      .in("id", helperIds);

    // Also fetch user data for language/country
    const userIds = (profiles as any[] ?? []).map((p: any) => p.user_id);
    const { data: users } = await supabase
      .from("users")
      .select("id, country, languages")
      .in("id", userIds);

    const userMap = new Map((users as any[] ?? []).map((u: any) => [u.id, u]));

    // Step 3: Score each candidate with weighted model
    const similarityMap = new Map(
      (vectorMatches as any[]).map((m: any) => [m.helper_profile_id, m.similarity])
    );

    const candidates: (HelperCandidate & { score: number })[] = [];

    for (const profile of (profiles as any[] ?? [])) {
      const user = userMap.get(profile.user_id);
      if (!user) continue;

      // Skip the asker themselves
      if (profile.user_id === req_data.asker_user_id) continue;

      // Expertise score (from vector similarity, already 0-1)
      const expertiseScore = similarityMap.get(profile.id) ?? 0;

      // Geographic score
      let geoScore = 0;
      const reqGeo = req_data.geographic_context as Record<string, any> | null;
      if (reqGeo?.country && user.country === reqGeo.country) {
        geoScore = 1.0;
      } else if (reqGeo?.country) {
        geoScore = 0.2; // Different country
      } else {
        geoScore = 0.5; // No geo context on request
      }

      // Language score
      const reqTags = req_data.expertise_tags as string[];
      const helperLangs = (user.languages ?? []) as string[];
      // Check if asker's language is in helper's languages
      // For now, use a simple overlap check
      const { data: askerUser } = await supabase
        .from("users")
        .select("languages")
        .eq("id", req_data.asker_user_id)
        .single();

      let langScore = 0.5; // default
      if (askerUser) {
        const askerLangs = ((askerUser as any).languages ?? []) as string[];
        const sharedLangs = askerLangs.filter((l: string) => helperLangs.includes(l));
        if (sharedLangs.length > 0) {
          langScore = 1.0; // Direct language match
        } else {
          langScore = 0.5; // Translation-bridgeable (assume DeepL can handle)
        }
      }

      // Reputation score (already 0-1)
      const reputationScore = profile.reputation_score ?? 0.5;

      // Availability score
      const availScore =
        profile.availability_status === "available" ? 1.0 :
        profile.availability_status === "limited" ? 0.5 : 0.0;

      // Composite weighted score
      const score =
        WEIGHTS.expertise * expertiseScore +
        WEIGHTS.geographic * geoScore +
        WEIGHTS.language * langScore +
        WEIGHTS.reputation * reputationScore +
        WEIGHTS.availability * availScore;

      candidates.push({
        helper_profile_id: profile.id,
        user_id: profile.user_id,
        similarity: expertiseScore,
        country: user.country,
        languages: helperLangs,
        reputation_score: reputationScore,
        availability_status: profile.availability_status,
        paid_tier_active: profile.paid_tier_active,
        session_rate_cents: profile.session_rate_cents,
        score,
      });
    }

    // Step 4: Rank — free helpers above paid helpers of equivalent score
    candidates.sort((a, b) => {
      // If scores are close (within 0.05), prefer free over paid
      if (Math.abs(a.score - b.score) < 0.05) {
        if (!a.paid_tier_active && b.paid_tier_active) return -1;
        if (a.paid_tier_active && !b.paid_tier_active) return 1;
      }
      return b.score - a.score;
    });

    const shortlist = candidates.slice(0, SHORTLIST_SIZE);

    if (shortlist.length === 0) {
      await supabase
        .from("requests")
        .update({ status: "unmatched" })
        .eq("id", requestId);

      return new Response(
        JSON.stringify({ status: "unmatched", reason: "No suitable helpers found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 5: Create match attempts
    const matchAttempts = shortlist.map((c, idx) => ({
      request_id: requestId,
      helper_profile_id: c.helper_profile_id,
      match_score: c.score,
      rank: idx + 1,
      response: idx === 0 ? "pending" : "pending",
    }));

    await supabase.from("match_attempts").insert(matchAttempts);

    // Step 6: Notify the top-ranked helper
    const topHelper = shortlist[0];
    await supabase.from("notifications").insert({
      user_id: topHelper.user_id,
      type: "match_invitation",
      reference_id: requestId,
      reference_type: "requests",
      channel: "in_app",
      title: "New help request matches your expertise",
      body: req_data.parsed_summary || req_data.raw_text,
    });

    return new Response(
      JSON.stringify({
        status: "matching",
        shortlist_size: shortlist.length,
        top_score: shortlist[0].score,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
