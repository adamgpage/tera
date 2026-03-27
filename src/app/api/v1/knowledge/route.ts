import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, hasScope } from "@/lib/api/auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/api/rate-limiter";
import { searchCommons } from "@/lib/typesense/client";

/**
 * GET /api/v1/knowledge?q=...&domain=...&geography=...&page=1
 * Versioned public API endpoint for Knowledge Commons search.
 * Supports both JWT and API key authentication.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request);

  // Check scope for API key
  if (auth.type === "api_key" && !hasScope(auth, "read_knowledge_commons")) {
    return NextResponse.json(
      { error: "Insufficient scope. Required: read_knowledge_commons" },
      { status: 403 }
    );
  }

  // Rate limit
  const rateLimitKey = auth.apiKeyId || auth.userId || request.headers.get("x-forwarded-for") || "anon";
  const rateLimit = checkRateLimit(`knowledge:${rateLimitKey}`, auth.rateLimitPerMinute);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000) },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  // Parse params
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const domain = searchParams.get("domain") || undefined;
  const geography = searchParams.get("geography") || undefined;
  const page = parseInt(searchParams.get("page") || "1");

  try {
    const results = await searchCommons({ query, domainFilter: domain, geographyFilter: geography, page });

    return NextResponse.json(
      {
        data: results.entries,
        meta: {
          total: results.totalFound,
          page: results.page,
          totalPages: results.totalPages,
          apiVersion: "v1",
        },
      },
      { headers: rateLimitHeaders(rateLimit) }
    );
  } catch (err) {
    console.error("Knowledge API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
