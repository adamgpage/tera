import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateStreamToken } from "@/lib/stream/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = generateStreamToken(user.id);

  return NextResponse.json({ token, userId: user.id });
}
