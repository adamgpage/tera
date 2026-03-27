import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export interface ApiAuthResult {
  authenticated: boolean;
  type: "user" | "api_key" | "none";
  userId?: string;
  apiKeyId?: string;
  scopes?: string[];
  rateLimitPerMinute: number;
}

/**
 * Authenticate an API request.
 * Supports both Supabase JWT (user) and API key (institutional) auth.
 */
export async function authenticateApiRequest(request: NextRequest): Promise<ApiAuthResult> {
  const authHeader = request.headers.get("authorization") || "";

  // Check for API key auth (Bearer tera_...)
  if (authHeader.startsWith("Bearer tera_")) {
    return authenticateApiKey(authHeader.slice(7));
  }

  // Fall back to Supabase JWT auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    return {
      authenticated: true,
      type: "user",
      userId: user.id,
      rateLimitPerMinute: 100, // Default user rate limit
    };
  }

  return {
    authenticated: false,
    type: "none",
    rateLimitPerMinute: 10, // Unauthenticated rate limit
  };
}

/**
 * Authenticate via API key.
 */
async function authenticateApiKey(plainTextKey: string): Promise<ApiAuthResult> {
  const keyHash = createHash("sha256").update(plainTextKey).digest("hex");
  const supabase = await createClient();

  const { data: apiKey } = await supabase
    .from("api_keys")
    .select("id, scopes, rate_limit_per_minute, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (!apiKey) {
    return { authenticated: false, type: "none", rateLimitPerMinute: 10 };
  }

  const key = apiKey as Record<string, unknown>;

  if (key.revoked_at) {
    return { authenticated: false, type: "none", rateLimitPerMinute: 10 };
  }

  // Update last_used_at
  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id);

  return {
    authenticated: true,
    type: "api_key",
    apiKeyId: key.id as string,
    scopes: key.scopes as string[],
    rateLimitPerMinute: (key.rate_limit_per_minute as number) || 1000,
  };
}

/**
 * Check if a scope is authorized.
 */
export function hasScope(auth: ApiAuthResult, scope: string): boolean {
  // User auth has all scopes
  if (auth.type === "user") return true;

  // API key must have the specific scope
  return auth.scopes?.includes(scope) || false;
}
