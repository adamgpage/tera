import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, hasScope } from "@/lib/api/auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/api/rate-limiter";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/v1/helpers?domain=...&available=true&page=1
 * Query helpers via the versioned API.
 * Requires authentication (JWT or API key with manage_helpers scope).
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request);

  if (!auth.authenticated) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (auth.type === "api_key" && !hasScope(auth, "manage_helpers")) {
    return NextResponse.json(
      { error: "Insufficient scope. Required: manage_helpers" },
      { status: 403 }
    );
  }

  const rateLimitKey = auth.apiKeyId || auth.userId || "anon";
  const rateLimit = checkRateLimit(`helpers:${rateLimitKey}`, auth.rateLimitPerMinute);

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: rateLimitHeaders(rateLimit) });
  }

  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");
  const available = searchParams.get("available");
  const page = parseInt(searchParams.get("page") || "1");
  const perPage = 20;

  const supabase = await createClient();

  let query = supabase
    .from("helper_profiles")
    .select(`
      user_id,
      expertise_tags,
      availability_status,
      verified_badge,
      leaderboard_conversations_count,
      leaderboard_resolution_rate,
      users!inner(name, country, languages)
    `)
    .range((page - 1) * perPage, page * perPage - 1);

  if (domain) {
    query = query.contains("expertise_tags", [domain]);
  }
  if (available === "true") {
    query = query.eq("availability_status", "available");
  }

  const { data: helpers, count } = await query;

  const formatted = (helpers || []).map((h) => {
    const helper = h as Record<string, unknown>;
    const user = helper.users as Record<string, unknown>;
    return {
      userId: helper.user_id,
      name: user?.name,
      country: user?.country,
      languages: user?.languages,
      expertiseTags: helper.expertise_tags,
      availabilityStatus: helper.availability_status,
      verified: helper.verified_badge,
      conversationsCount: helper.leaderboard_conversations_count,
      resolutionRate: helper.leaderboard_resolution_rate,
    };
  });

  return NextResponse.json(
    {
      data: formatted,
      meta: { total: count || formatted.length, page, apiVersion: "v1" },
    },
    { headers: rateLimitHeaders(rateLimit) }
  );
}
