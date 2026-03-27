import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";

const APP_URL = Deno.env.get("NEXT_PUBLIC_APP_URL") || "https://tera.com";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Tera <notifications@tera.com>";

// Notification types that trigger emails
const EMAIL_NOTIFICATION_TYPES = new Set([
  "match_confirmed",
  "match_notification",
  "summary_ready",
  "conversation_completed",
  "request_expired",
  "ratings_visible",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { notification_id } = await req.json();
    if (!notification_id) {
      return new Response(
        JSON.stringify({ error: "notification_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createServiceClient();

    // Get notification
    const { data: notif } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", notification_id)
      .single();

    if (!notif) {
      return new Response(
        JSON.stringify({ error: "Notification not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if this type should trigger email
    if (!EMAIL_NOTIFICATION_TYPES.has(notif.type)) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "type not email-worthy" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user email preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", notif.user_id)
      .single();

    // Map notification types to preference fields
    const prefMap: Record<string, string> = {
      match_confirmed: "email_match_found",
      match_notification: "email_match_found",
      summary_ready: "email_summary_ready",
      conversation_completed: "email_summary_ready",
      request_expired: "email_request_status",
      ratings_visible: "email_summary_ready",
    };

    const prefField = prefMap[notif.type];
    if (prefs && prefField && !(prefs as any)[prefField]) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "user opted out" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user email
    const { data: user } = await supabase
      .from("users")
      .select("email, name")
      .eq("id", notif.user_id)
      .single();

    if (!user || !user.email) {
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build link based on reference
    let actionUrl = APP_URL;
    if (notif.reference_type === "conversations") {
      actionUrl = `${APP_URL}/conversations/${notif.reference_id}`;
    } else if (notif.reference_type === "requests") {
      actionUrl = `${APP_URL}/requests/${notif.reference_id}`;
    } else if (notif.reference_type === "match_attempts") {
      actionUrl = `${APP_URL}/helper/invitations`;
    }

    // Send email via Resend
    if (RESEND_API_KEY) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: user.email,
          subject: notif.title,
          html: `<div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p style="color: #1a1a1a; font-size: 15px; line-height: 1.6;">Hi ${user.name},</p>
  <p style="color: #1a1a1a; font-size: 15px; line-height: 1.6;">${notif.body}</p>
  <p style="margin: 24px 0;">
    <a href="${actionUrl}" style="background: #0f7a5f; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">View on Tera</a>
  </p>
  <p style="color: #888; font-size: 13px;">— Tera</p>
</div>`,
          text: `Hi ${user.name},\n\n${notif.body}\n\n${actionUrl}\n\n— Tera`,
        }),
      });

      if (!emailRes.ok) {
        console.error("Resend error:", await emailRes.text());
      }
    } else {
      console.log(`[Email Mock] To: ${user.email} | Subject: ${notif.title}`);
    }

    // Mark notification as email sent
    await supabase
      .from("notifications")
      .update({ delivered: true })
      .eq("id", notification_id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-notification-email error:", err);
    return new Response(
      JSON.stringify({ error: "Email send failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
