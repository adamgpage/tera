import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createConnectAccount, createOnboardingLink } from "@/lib/stripe/connect";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user email and helper profile
  const { data: userData } = await supabase
    .from("users")
    .select("email, name")
    .eq("id", user.id)
    .single();

  const { data: helperProfile } = await supabase
    .from("helper_profiles")
    .select("id, stripe_connect_account_id")
    .eq("user_id", user.id)
    .single();

  if (!helperProfile) {
    return NextResponse.json({ error: "Helper profile not found" }, { status: 404 });
  }

  const hp = helperProfile as Record<string, unknown>;
  const u = userData as Record<string, unknown>;

  try {
    let accountId = hp.stripe_connect_account_id as string | null;

    // Create account if doesn't exist
    if (!accountId) {
      accountId = await createConnectAccount(u.email as string, u.name as string);

      await supabase
        .from("helper_profiles")
        .update({ stripe_connect_account_id: accountId } as Record<string, unknown>)
        .eq("id", hp.id);
    }

    // Generate onboarding link
    const onboardingUrl = await createOnboardingLink(accountId);

    return NextResponse.json({ url: onboardingUrl, accountId });
  } catch (err) {
    console.error("Stripe Connect error:", err);
    return NextResponse.json(
      { error: "Failed to set up Stripe account. Ensure STRIPE_SECRET_KEY is configured." },
      { status: 500 }
    );
  }
}
