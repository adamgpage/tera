import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transcribeFromUrl } from "@/lib/deepgram/client";

/**
 * POST /api/transcribe
 * Transcribes a recording URL (from Daily.co or external platform).
 * Called as part of the post-conversation processing pipeline.
 * Typically invoked by the job queue, not directly by the client.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Verify internal call or admin
  const authHeader = request.headers.get("authorization");
  const internalKey = process.env.INTERNAL_API_KEY;

  let isInternal = false;
  if (internalKey && authHeader === `Bearer ${internalKey}`) {
    isInternal = true;
  }

  if (!isInternal) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { conversationId, recordingUrl } = await request.json();

  if (!conversationId || !recordingUrl) {
    return NextResponse.json(
      { error: "conversationId and recordingUrl required" },
      { status: 400 }
    );
  }

  try {
    // Transcribe via Deepgram
    const result = await transcribeFromUrl(recordingUrl);

    // Update conversation with transcript
    await supabase
      .from("conversations")
      .update({
        transcript: result.transcript,
        transcript_source: "native",
        transcript_retrieved_at: new Date().toISOString(),
        transcript_retrieval_status: "retrieved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    return NextResponse.json({
      success: true,
      conversationId,
      transcriptLength: result.transcript.length,
      duration: result.duration,
      language: result.language,
      segmentCount: result.segments.length,
    });
  } catch (err) {
    console.error("Transcription error:", err);

    // Update status to failed
    await supabase
      .from("conversations")
      .update({
        transcript_retrieval_status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    return NextResponse.json(
      { error: "Transcription failed", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
