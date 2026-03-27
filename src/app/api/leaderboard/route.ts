import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/leaderboard?domain=...&period=...
 * Public endpoint — no auth required.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain") || undefined;
  const period = searchParams.get("period") || "all"; // all, month, week
  const limit = Math.min(parseInt(searchParams.get("limit") || "25"), 100);

  const supabase = await createClient();

  // Query top helpers by conversations count, with profile info
  let query = supabase
    .from("helper_profiles")
    .select(`
      user_id,
      leaderboard_conversations_count,
      leaderboard_geographies_count,
      leaderboard_domains_count,
      leaderboard_resolution_rate,
      users!inner(name, country, profile_photo)
    `)
    .order("leaderboard_conversations_count", { ascending: false })
    .limit(limit);

  if (domain) {
    query = query.contains("expertise_tags", [domain]);
  }

  const { data: helpers } = await query;

  const leaderboard = (helpers || []).map((h, index) => {
    const helper = h as Record<string, unknown>;
    const user = helper.users as Record<string, unknown>;
    return {
      rank: index + 1,
      userId: helper.user_id,
      name: user?.name || "Helper",
      country: user?.country || "",
      conversationsCount: helper.leaderboard_conversations_count || 0,
      geographiesCount: helper.leaderboard_geographies_count || 0,
      domainsCount: helper.leaderboard_domains_count || 0,
      resolutionRate: helper.leaderboard_resolution_rate || 0,
    };
  });

  return NextResponse.json(
    { leaderboard, period, domain: domain || "all" },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
