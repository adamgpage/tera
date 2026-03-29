import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Called immediately after signup to ensure public.users row exists.
 * Fallback in case the database trigger fails silently.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Check if users row already exists (trigger may have already created it)
  const { data: existing } = await admin
    .from("users")
    .select("id")
    .eq("id", user.id)
    .single();

  if (existing) {
    return NextResponse.json({ ok: true, created: false });
  }

  // Create the users row using metadata from auth
  const meta = user.user_metadata || {};
  const name =
    meta.name || meta.full_name || user.email?.split("@")[0] || "User";
  const country = meta.country || "";
  const language = meta.languages || meta.language || "";
  const languages = language
    ? language.split(",").map((l: string) => l.trim()).filter(Boolean)
    : [];

  const { error } = await admin.from("users").insert({
    id: user.id,
    email: user.email!,
    name,
    country,
    languages,
    account_status: "active",
    is_helper: false,
  });

  if (error) {
    // If it's a unique violation, the row was just created by the trigger — that's fine
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, created: false });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, created: true });
}
