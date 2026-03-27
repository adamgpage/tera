import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseRequest, generateEmbedding, screenContent } from "@/lib/claude/client";

/**
 * Process a new request: screen content, parse, generate embedding, update status.
 * Called by the job queue or directly after request submission.
 */
export async function POST(request: NextRequest) {
  // Verify caller — accept internal key, service role key, or anon key
  const authHeader = request.headers.get("authorization");
  const validKeys = [
    process.env.INTERNAL_API_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ].filter(Boolean);
  const token = authHeader?.replace("Bearer ", "");
  if (!token || !validKeys.includes(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = await request.json();
  if (!requestId) {
    return NextResponse.json({ error: "requestId required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get the request
  const { data: req, error: fetchErr } = await supabase
    .from("requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchErr || !req) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const r = req as Record<string, unknown>;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  try {
    // 1. Screen content
    console.log("[parse-request] Step 1: Screening content...");
    const screening = await screenContent(r.raw_text as string);
    console.log("[parse-request] Step 1 done:", JSON.stringify(screening).substring(0, 200));
    totalInputTokens += screening.usage.input_tokens;
    totalOutputTokens += screening.usage.output_tokens;

    if (!screening.safe) {
      await supabase
        .from("requests")
        .update({ status: "closed", parsed_summary: `Content flagged: ${screening.reason}` })
        .eq("id", requestId);

      return NextResponse.json({ status: "flagged", reason: screening.reason });
    }

    // 2. Parse the request
    console.log("[parse-request] Step 2: Parsing request...");
    const parsed = await parseRequest(r.raw_text as string);
    console.log("[parse-request] Step 2 done:", parsed.parsed_summary?.substring(0, 100));
    totalInputTokens += parsed.usage.input_tokens;
    totalOutputTokens += parsed.usage.output_tokens;

    // 3. Generate embedding
    const embeddingResult = await generateEmbedding(
      `${parsed.parsed_summary} ${parsed.expertise_tags.join(" ")}`
    );
    totalInputTokens += embeddingResult.usage.input_tokens;
    totalOutputTokens += embeddingResult.usage.output_tokens;

    // 4. Update the request with parsed data
    const embeddingStr = `[${embeddingResult.embedding.join(",")}]`;

    await supabase
      .from("requests")
      .update({
        parsed_summary: parsed.parsed_summary,
        stated_problem: parsed.stated_problem,
        inferred_problem: parsed.inferred_problem,
        expertise_tags: parsed.expertise_tags,
        request_embedding: embeddingStr,
        geographic_context: parsed.geographic_context || {},
        urgency: parsed.urgency || "medium",
        status: "confirmed",
        parse_attempt_count: (r.parse_attempt_count as number || 0) + 1,
      })
      .eq("id", requestId);

    // 5. Record AI job cost
    const costUsd = ((totalInputTokens * 3) + (totalOutputTokens * 15)) / 1_000_000;
    await supabase.from("ai_jobs").insert({
      job_type: "request_parse",
      priority: 2,
      status: "complete",
      entity_type: "request",
      entity_id: requestId,
      completed_at: new Date().toISOString(),
      token_usage: totalInputTokens + totalOutputTokens,
      cost_usd: costUsd,
    });

    // 6. Create notification for asker
    await supabase.from("notifications").insert({
      user_id: r.asker_user_id,
      type: "request_parsed",
      content: "Your request has been analysed and is ready for matching.",
      linked_entity_type: "request",
      linked_entity_id: requestId,
    });

    return NextResponse.json({
      status: "parsed",
      parsed_summary: parsed.parsed_summary,
      expertise_tags: parsed.expertise_tags,
      clarifying_questions: parsed.clarifying_questions,
    });
  } catch (err) {
    console.error("Parse request error:", err);

    await supabase
      .from("requests")
      .update({
        parse_attempt_count: (r.parse_attempt_count as number || 0) + 1,
      })
      .eq("id", requestId);

    await supabase.from("ai_jobs").insert({
      job_type: "request_parse",
      priority: 2,
      status: "failed",
      entity_type: "request",
      entity_id: requestId,
      error_message: err instanceof Error ? err.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to parse request" }, { status: 500 });
  }
}
