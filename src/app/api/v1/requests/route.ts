import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, hasScope } from "@/lib/api/auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/api/rate-limiter";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/v1/requests
 * Submit a new help request via the versioned API.
 * Requires authentication (JWT or API key with submit_requests scope).
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request);

  if (!auth.authenticated) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (auth.type === "api_key" && !hasScope(auth, "submit_requests")) {
    return NextResponse.json(
      { error: "Insufficient scope. Required: submit_requests" },
      { status: 403 }
    );
  }

  // Rate limit
  const rateLimitKey = auth.apiKeyId || auth.userId || "anon";
  const rateLimit = checkRateLimit(`requests:${rateLimitKey}`, auth.rateLimitPerMinute);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  const body = await request.json();
  const { text, urgency, preferredFormat, askerUserId } = body;

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  // Determine the asker
  const userId = auth.type === "user" ? auth.userId : askerUserId;
  if (!userId) {
    return NextResponse.json(
      { error: "askerUserId required for API key authentication" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Calculate expiry (7 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data: req, error: insertError } = await supabase
    .from("requests")
    .insert({
      asker_user_id: userId,
      raw_text: text,
      urgency: urgency || "medium",
      preferred_format: preferredFormat || "no_preference",
      status: "open",
      expires_at: expiresAt.toISOString(),
    })
    .select("id, status, created_at, expires_at")
    .single();

  if (insertError) {
    console.error("Request insert error:", insertError);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }

  return NextResponse.json(
    {
      data: req,
      meta: { apiVersion: "v1" },
    },
    { status: 201, headers: rateLimitHeaders(rateLimit) }
  );
}
