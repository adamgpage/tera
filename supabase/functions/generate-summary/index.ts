import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";
import { callClaude } from "../_shared/claude-client.ts";

const SYSTEM_PROMPT = `You are a conversation summariser for Tera, a platform that connects people with problems to people with relevant experience.

Given a conversation transcript (messages between an Asker and a Helper), produce a structured summary in JSON format with these fields:

- problem_as_stated: The problem as the Asker originally described it
- problem_as_understood: The underlying problem as understood through discussion
- approach_provided: The approach, advice, or solution the Helper provided
- key_actions: Specific action items or next steps agreed upon
- follow_up_required: Whether follow-up is needed and what it would cover
- high_risk_domain: true if the conversation involves medical, legal, or financial advice

Be concise. Each field should be 1-3 sentences. Return valid JSON only.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { conversation_id } = await req.json();
    if (!conversation_id) {
      return new Response(
        JSON.stringify({ error: "conversation_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createServiceClient();

    // Get conversation details
    const { data: conv } = await supabase
      .from("conversations")
      .select("id, asker_user_id, helper_user_id, request_id")
      .eq("id", conversation_id)
      .single();

    if (!conv) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get messages
    const { data: messages } = await supabase
      .from("conversation_messages")
      .select("user_name, text, created_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true });

    // Get request context
    const { data: request } = await supabase
      .from("requests")
      .select("raw_text, parsed_summary, expertise_tags")
      .eq("id", conv.request_id)
      .single();

    // Build transcript text
    const transcript = (messages || [])
      .map((m: any) => `[${m.user_name}]: ${m.text}`)
      .join("\n");

    if (!transcript) {
      // No messages — create a placeholder summary
      await supabase
        .from("conversation_summaries")
        .update({
          problem_as_stated: request?.raw_text || "No problem description available",
          problem_as_understood: "Conversation had no messages to summarise",
          approach_provided: null,
          key_actions: null,
          follow_up_required: null,
          high_risk_disclaimer: false,
          generation_status: "completed",
          generated_at: new Date().toISOString(),
        })
        .eq("conversation_id", conversation_id);

      return new Response(
        JSON.stringify({ success: true, empty: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userMessage = `Original request: ${request?.raw_text || "N/A"}
Parsed summary: ${request?.parsed_summary || "N/A"}
Domain tags: ${(request?.expertise_tags || []).join(", ")}

Conversation transcript:
${transcript}`;

    const result = await callClaude(SYSTEM_PROMPT, userMessage, {
      maxTokens: 2048,
      temperature: 0.2,
    });

    // Parse the JSON response
    let summary;
    try {
      // Handle potential markdown code blocks
      const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      summary = JSON.parse(cleaned);
    } catch {
      summary = {
        problem_as_stated: "Summary generation produced unexpected format",
        problem_as_understood: result.slice(0, 500),
        approach_provided: null,
        key_actions: null,
        follow_up_required: null,
        high_risk_domain: false,
      };
    }

    // Update the summary record
    await supabase
      .from("conversation_summaries")
      .update({
        problem_as_stated: summary.problem_as_stated,
        problem_as_understood: summary.problem_as_understood,
        approach_provided: summary.approach_provided,
        key_actions: summary.key_actions,
        follow_up_required: summary.follow_up_required,
        high_risk_disclaimer: summary.high_risk_domain === true,
        generation_status: "completed",
        generated_at: new Date().toISOString(),
      })
      .eq("conversation_id", conversation_id);

    // Notify both parties
    for (const userId of [conv.asker_user_id, conv.helper_user_id]) {
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "summary_ready",
        reference_id: conversation_id,
        reference_type: "conversations",
        channel: "in_app",
        title: "Summary ready",
        body: "The AI-generated summary of your conversation is now available.",
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-summary error:", err);

    // Try to mark as failed
    try {
      const { conversation_id } = await req.clone().json();
      if (conversation_id) {
        const supabase = createServiceClient();
        await supabase
          .from("conversation_summaries")
          .update({
            generation_status: "failed",
            retry_count: 1, // Will be incremented by retry logic
          })
          .eq("conversation_id", conversation_id);
      }
    } catch { /* ignore cleanup errors */ }

    return new Response(
      JSON.stringify({ error: "Summary generation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
