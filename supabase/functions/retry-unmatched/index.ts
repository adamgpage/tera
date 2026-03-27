import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";

const UNMATCHED_EXPIRY_DAYS = 7;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createServiceClient();

  try {
    const now = new Date();

    // Find requests that are 'unmatched' or stuck in 'matching' with no pending attempts
    const { data: unmatchedRequests } = await supabase
      .from("requests")
      .select("id, created_at, unmatched_notified_at, asker_user_id")
      .in("status", ["unmatched", "matching"]);

    if (!unmatchedRequests || unmatchedRequests.length === 0) {
      return new Response(
        JSON.stringify({ retried: 0, expired: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let retried = 0;
    let expired = 0;

    for (const request of unmatchedRequests as any[]) {
      const createdAt = new Date(request.created_at);
      const daysSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      // If older than 7 days and not yet notified, send expiry notification
      if (daysSinceCreated >= UNMATCHED_EXPIRY_DAYS && !request.unmatched_notified_at) {
        await supabase
          .from("requests")
          .update({ unmatched_notified_at: now.toISOString() })
          .eq("id", request.id);

        await supabase.from("notifications").insert({
          user_id: request.asker_user_id,
          type: "request_unmatched_7d",
          reference_id: request.id,
          reference_type: "requests",
          channel: "in_app",
          title: "Your request hasn't found a match",
          body: "It's been 7 days. You can revise your request or close it.",
        });

        expired++;
        continue;
      }

      // For requests not yet expired, check if there are new helpers
      // that might match (helpers registered or updated since last matching run)
      if (request.status === "unmatched") {
        // Check if the request has an embedding
        const { data: reqData } = await supabase
          .from("requests")
          .select("request_embedding")
          .eq("id", request.id)
          .single();

        if (reqData && (reqData as any).request_embedding) {
          // Re-run matching by calling the run-matching function
          const baseUrl = Deno.env.get("SUPABASE_URL");
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

          if (baseUrl && serviceKey) {
            const matchResponse = await fetch(
              `${baseUrl}/functions/v1/run-matching`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${serviceKey}`,
                },
                body: JSON.stringify({ requestId: request.id }),
              }
            );

            if (matchResponse.ok) {
              retried++;
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ retried, expired }),
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
