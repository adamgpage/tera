import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, roleHint } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  // Check if already invited
  const { data: existing } = await supabase
    .from("invites")
    .select("id, status")
    .eq("email", email)
    .eq("invited_by", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      error: "Already invited",
      status: (existing as Record<string, unknown>).status,
    }, { status: 409 });
  }

  // Create invite (expires in 30 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const { data: invite, error: insertError } = await supabase
    .from("invites")
    .insert({
      invited_by: user.id,
      email,
      role_hint: roleHint || null,
      status: "pending",
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }

  const inv = invite as Record<string, unknown>;
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://tera.com"}/register?invite=${inv.id}`;

  return NextResponse.json({
    inviteId: inv.id,
    inviteUrl,
    email,
    roleHint: roleHint || null,
    expiresAt: expiresAt.toISOString(),
  });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: invites } = await supabase
    .from("invites")
    .select("id, email, role_hint, status, created_at, accepted_at")
    .eq("invited_by", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ invites: invites || [] });
}
