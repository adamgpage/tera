import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes, createHash } from "crypto";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: adminCheck } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!(adminCheck as Record<string, unknown>)?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, institutional_account_id, scopes, created_at, last_used_at, revoked_at, rate_limit_per_minute")
    .order("created_at", { ascending: false });

  return NextResponse.json({ keys: keys || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: adminCheck } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!(adminCheck as Record<string, unknown>)?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { institutionalAccountId, scopes, rateLimitPerMinute } = await request.json();

  if (!institutionalAccountId || !scopes?.length) {
    return NextResponse.json({ error: "accountId and scopes required" }, { status: 400 });
  }

  // Generate API key
  const plainTextKey = `tera_${randomBytes(32).toString("hex")}`;
  const keyHash = createHash("sha256").update(plainTextKey).digest("hex");

  const { error: insertError } = await supabase.from("api_keys").insert({
    institutional_account_id: institutionalAccountId,
    key_hash: keyHash,
    scopes,
    rate_limit_per_minute: rateLimitPerMinute || 100,
  });

  if (insertError) {
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 });
  }

  // Return the plain text key only once
  return NextResponse.json({ plainTextKey });
}
