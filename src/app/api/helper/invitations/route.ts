import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Get helper profile
  const { data: helperProfile } = await admin
    .from("helper_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!helperProfile) {
    return NextResponse.json({ invitations: [] });
  }

  const hpId = (helperProfile as Record<string, unknown>).id as string;

  // Get pending match attempts
  const { data: attempts } = await admin
    .from("match_attempts")
    .select("id, request_id, match_score, rank")
    .eq("helper_profile_id", hpId)
    .eq("response", "pending")
    .order("created_at", { ascending: false });

  if (!attempts || attempts.length === 0) {
    return NextResponse.json({ invitations: [] });
  }

  const requestIds = (attempts as any[]).map((a) => a.request_id);

  const { data: requests } = await admin
    .from("requests")
    .select("id, parsed_summary, raw_text, expertise_tags, urgency, preferred_format")
    .in("id", requestIds);

  const requestMap = new Map(
    ((requests as any[]) ?? []).map((r: any) => [r.id, r])
  );

  const invitations = (attempts as any[])
    .map((a) => ({
      id: a.id,
      request_id: a.request_id,
      match_score: a.match_score,
      rank: a.rank,
      request: requestMap.get(a.request_id),
    }))
    .filter((a) => a.request);

  return NextResponse.json({ invitations });
}
