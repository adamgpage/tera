import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/knowledge/search?q=...&domain=...&page=1
 * Public endpoint — no auth required.
 * Uses Supabase full-text search for MVP. Typesense at scale.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const domain = searchParams.get("domain") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = 20;
  const offset = (page - 1) * perPage;

  const supabase = createAdminClient();

  let query = supabase
    .from("knowledge_commons_entries")
    .select("*", { count: "exact" })
    .eq("published", true)
    .order("date_published", { ascending: false, nullsFirst: false })
    .range(offset, offset + perPage - 1);

  if (q) {
    query = query.textSearch("search_vector", q.split(/\s+/).join(" & "));
  }

  if (domain) {
    query = query.contains("domain_tags", [domain]);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("Knowledge search error:", error);
    return NextResponse.json({ entries: [], totalFound: 0 });
  }

  const entries = (data || []).map((entry: Record<string, unknown>) => ({
    id: entry.id,
    summary: entry.anonymised_summary,
    domain_tags: entry.domain_tags,
    geographic_tags: entry.geographic_context_tags,
    seo_slug: entry.seo_slug,
    date_published: entry.date_published
      ? Math.floor(new Date(entry.date_published as string).getTime() / 1000)
      : 0,
    page_views: entry.page_views || 0,
    tera_verified: entry.tera_verified,
  }));

  return NextResponse.json(
    { entries, totalFound: count || 0, page, perPage },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
