import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAccountReady } from "@/lib/stripe/connect";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
  }

  // Check if the Connect account is ready
  const { data: helperProfile } = await supabase
    .from("helper_profiles")
    .select("id, stripe_connect_account_id")
    .eq("user_id", user.id)
    .single();

  if (helperProfile) {
    const hp = helperProfile as Record<string, unknown>;
    const accountId = hp.stripe_connect_account_id as string;

    if (accountId) {
      try {
        const ready = await isAccountReady(accountId);
        if (ready) {
          await supabase
            .from("helper_profiles")
            .update({ paid_tier_active: true } as Record<string, unknown>)
            .eq("id", hp.id);
        }
      } catch (err) {
        console.error("Failed to check Connect account status:", err);
      }
    }
  }

  // Redirect to settings with success indicator
  return NextResponse.redirect(
    new URL("/settings?stripe=connected", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
  );
}
