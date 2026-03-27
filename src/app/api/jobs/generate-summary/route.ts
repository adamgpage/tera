import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSummary } from "@/lib/claude/client";

/**
 * Generate a post-conversation summary from transcript.
 * Priority 3 job — called after conversation completion.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const internalKey = process.env.INTERNAL_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (authHeader !== `Bearer ${internalKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await request.json();
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get conversation + request context
  const { data: conv } = await supabase
    .from("conversations")
    .select("*, requests(*)")
    .eq("id", conversationId)
    .single();

  if (!conv) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const c = conv as Record<string, unknown>;
  const req = c.requests as Record<string, unknown> | null;

  // Build transcript from messages if no transcript exists
  let transcript = c.transcript as string || "";

  if (!transcript) {
    const { data: messages } = await supabase
      .from("conversation_messages")
      .select("user_name, text, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (messages && messages.length > 0) {
      transcript = (messages as Array<Record<string, unknown>>)
        .map((m) => `[${m.user_name}]: ${m.text}`)
        .join("\n");
    }
  }

  if (!transcript) {
    return NextResponse.json({ error: "No transcript available" }, { status: 400 });
  }

  const requestContext = req
    ? `${req.raw_text || ""}\nParsed: ${req.parsed_summary || ""}`
    : "No request context available";

  try {
    const summary = await generateSummary(transcript, requestContext);

    // Upsert conversation summary
    const { data: existing } = await supabase
      .from("conversation_summaries")
      .select("id")
      .eq("conversation_id", conversationId)
      .single();

    if (existing) {
      await supabase
        .from("conversation_summaries")
        .update({
          problem_as_stated: summary.problem_as_stated,
          problem_as_understood: summary.problem_as_understood,
          approach_provided: summary.approach_provided,
          key_actions: summary.key_actions,
          follow_up_required: summary.follow_up_required,
          high_risk_disclaimer: summary.high_risk_disclaimer || false,
          generated_at: new Date().toISOString(),
          generation_status: "completed",
        })
        .eq("conversation_id", conversationId);
    } else {
      const { data: newSummary } = await supabase
        .from("conversation_summaries")
        .insert({
          conversation_id: conversationId,
          problem_as_stated: summary.problem_as_stated,
          problem_as_understood: summary.problem_as_understood,
          approach_provided: summary.approach_provided,
          key_actions: summary.key_actions,
          follow_up_required: summary.follow_up_required,
          high_risk_disclaimer: summary.high_risk_disclaimer || false,
          generated_at: new Date().toISOString(),
          generation_status: "completed",
        })
        .select("id")
        .single();

      if (newSummary) {
        await supabase
          .from("conversations")
          .update({ summary_id: (newSummary as Record<string, unknown>).id })
          .eq("id", conversationId);
      }
    }

    // Notify both parties
    const notifications = [
      {
        user_id: c.asker_user_id,
        type: "summary_ready" as const,
        content: "Your conversation summary is ready.",
        linked_entity_type: "conversation",
        linked_entity_id: conversationId,
      },
      {
        user_id: c.helper_user_id,
        type: "summary_ready" as const,
        content: "The conversation summary is ready.",
        linked_entity_type: "conversation",
        linked_entity_id: conversationId,
      },
    ];

    await supabase.from("notifications").insert(notifications);

    // Record AI job cost
    const costUsd = ((summary.usage.input_tokens * 3) + (summary.usage.output_tokens * 15)) / 1_000_000;
    await supabase.from("ai_jobs").insert({
      job_type: "conversation_summary",
      priority: 3,
      status: "complete",
      entity_type: "conversation",
      entity_id: conversationId,
      completed_at: new Date().toISOString(),
      token_usage: summary.usage.input_tokens + summary.usage.output_tokens,
      cost_usd: costUsd,
    });

    return NextResponse.json({ status: "summary_generated" });
  } catch (err) {
    console.error("Summary generation error:", err);

    await supabase.from("ai_jobs").insert({
      job_type: "conversation_summary",
      priority: 3,
      status: "failed",
      entity_type: "conversation",
      entity_id: conversationId,
      error_message: err instanceof Error ? err.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
