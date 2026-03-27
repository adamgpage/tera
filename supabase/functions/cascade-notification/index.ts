import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";

// Cascade timeouts in minutes, by urgency
const TIMEOUTS: Record<string, number> = {
  high: 30,
  medium: 120,
  low: 360,
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createServiceClient();

  try {
    // Find all pending match attempts that have timed out
    const now = new Date();

    // Get all requests currently in 'matching' status
    const { data: matchingRequests } = await supabase
      .from("requests")
      .select("id, urgency")
      .eq("status", "matching");

    if (!matchingRequests || matchingRequests.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;

    for (const request of matchingRequests as any[]) {
      const timeoutMinutes = TIMEOUTS[request.urgency] ?? 120;

      // Find the current pending attempt for this request
      const { data: pendingAttempts } = await supabase
        .from("match_attempts")
        .select("*")
        .eq("request_id", request.id)
        .eq("response", "pending")
        .order("rank", { ascending: true })
        .limit(1);

      if (!pendingAttempts || pendingAttempts.length === 0) continue;

      const attempt = pendingAttempts[0] as any;
      const notifiedAt = new Date(attempt.notified_at);
      const elapsedMinutes = (now.getTime() - notifiedAt.getTime()) / 60000;

      if (elapsedMinutes < timeoutMinutes) continue; // Not yet timed out

      // Mark as timed out
      await supabase
        .from("match_attempts")
        .update({ response: "timed_out", responded_at: now.toISOString() })
        .eq("id", attempt.id);

      // Notify the asker about the cascade
      const { data: requestData } = await supabase
        .from("requests")
        .select("asker_user_id")
        .eq("id", request.id)
        .single();

      // Find the next ranked helper
      const { data: nextAttempts } = await supabase
        .from("match_attempts")
        .select("*, helper_profiles!inner(user_id)")
        .eq("request_id", request.id)
        .eq("response", "pending")
        .order("rank", { ascending: true })
        .limit(1);

      if (nextAttempts && nextAttempts.length > 0) {
        const next = nextAttempts[0] as any;

        // Update notified_at for the next helper
        await supabase
          .from("match_attempts")
          .update({ notified_at: now.toISOString() })
          .eq("id", next.id);

        // Notify the next helper
        const helperUserId = next.helper_profiles?.user_id;
        if (helperUserId) {
          await supabase.from("notifications").insert({
            user_id: helperUserId,
            type: "match_invitation",
            reference_id: request.id,
            reference_type: "requests",
            channel: "in_app",
            title: "New help request matches your expertise",
            body: "Someone needs your help. Check your invitations.",
          });
        }

        // Notify asker that cascade is happening
        if (requestData) {
          await supabase.from("notifications").insert({
            user_id: (requestData as any).asker_user_id,
            type: "match_cascading",
            reference_id: request.id,
            reference_type: "requests",
            channel: "in_app",
            title: "Still finding the right person",
            body: "The first helper didn't respond in time. We've reached out to the next best match.",
          });
        }
      } else {
        // No more helpers in shortlist — mark request as unmatched
        await supabase
          .from("requests")
          .update({ status: "unmatched" })
          .eq("id", request.id);

        if (requestData) {
          await supabase.from("notifications").insert({
            user_id: (requestData as any).asker_user_id,
            type: "match_exhausted",
            reference_id: request.id,
            reference_type: "requests",
            channel: "in_app",
            title: "No match found yet",
            body: "We haven't found a match yet. We'll notify you as soon as someone with relevant experience becomes available.",
          });
        }
      }

      processed++;
    }

    return new Response(
      JSON.stringify({ processed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
