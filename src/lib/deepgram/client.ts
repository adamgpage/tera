const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const DEEPGRAM_API_URL = "https://api.deepgram.com/v1";

export interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
  speaker?: number;
  confidence: number;
}

export interface TranscriptionResult {
  transcript: string;
  segments: TranscriptSegment[];
  duration: number;
  language: string;
}

/**
 * Transcribe an audio/video file URL via Deepgram.
 * Used for native Daily.co call recordings.
 */
export async function transcribeFromUrl(audioUrl: string): Promise<TranscriptionResult> {
  if (!DEEPGRAM_API_KEY) {
    throw new Error("DEEPGRAM_API_KEY not configured");
  }

  const res = await fetch(`${DEEPGRAM_API_URL}/listen?model=nova-2&smart_format=true&diarize=true&language=en&detect_language=true&punctuate=true&paragraphs=true`, {
    method: "POST",
    headers: {
      Authorization: `Token ${DEEPGRAM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: audioUrl }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Deepgram transcription failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return parseDeepgramResponse(data);
}

/**
 * Transcribe an uploaded audio buffer via Deepgram.
 */
export async function transcribeFromBuffer(
  audioBuffer: Uint8Array,
  mimeType: string = "audio/webm"
): Promise<TranscriptionResult> {
  if (!DEEPGRAM_API_KEY) {
    throw new Error("DEEPGRAM_API_KEY not configured");
  }

  const res = await fetch(`${DEEPGRAM_API_URL}/listen?model=nova-2&smart_format=true&diarize=true&detect_language=true&punctuate=true&paragraphs=true`, {
    method: "POST",
    headers: {
      Authorization: `Token ${DEEPGRAM_API_KEY}`,
      "Content-Type": mimeType,
    },
    body: audioBuffer as unknown as BodyInit,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Deepgram transcription failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return parseDeepgramResponse(data);
}

/**
 * Generate a temporary Deepgram API key for client-side real-time transcription.
 * Key expires after the specified TTL.
 */
export async function createTemporaryKey(ttlSeconds: number = 3600): Promise<string> {
  if (!DEEPGRAM_API_KEY) {
    throw new Error("DEEPGRAM_API_KEY not configured");
  }

  const res = await fetch("https://api.deepgram.com/v1/keys", {
    method: "POST",
    headers: {
      Authorization: `Token ${DEEPGRAM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      comment: "Tera temporary transcription key",
      scopes: ["usage:write"],
      time_to_live_in_seconds: ttlSeconds,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to create temporary Deepgram key");
  }

  const data = await res.json();
  return data.key;
}

function parseDeepgramResponse(data: Record<string, unknown>): TranscriptionResult {
  const results = data.results as Record<string, unknown>;
  const channels = results?.channels as Array<Record<string, unknown>>;
  const channel = channels?.[0];
  const alternatives = channel?.alternatives as Array<Record<string, unknown>>;
  const best = alternatives?.[0];

  if (!best) {
    return { transcript: "", segments: [], duration: 0, language: "en" };
  }

  const paragraphs = best.paragraphs as Record<string, unknown>;
  const paragraphList = paragraphs?.paragraphs as Array<Record<string, unknown>>;

  const segments: TranscriptSegment[] = [];

  if (paragraphList) {
    for (const para of paragraphList) {
      const sentences = para.sentences as Array<Record<string, unknown>>;
      if (sentences) {
        for (const sentence of sentences) {
          segments.push({
            text: sentence.text as string,
            start: sentence.start as number,
            end: sentence.end as number,
            speaker: para.speaker as number,
            confidence: 0.95, // Deepgram Nova-2 typical confidence
          });
        }
      }
    }
  }

  const metadata = data.metadata as Record<string, unknown>;

  return {
    transcript: best.transcript as string || "",
    segments,
    duration: (metadata?.duration as number) || 0,
    language: (channel?.detected_language as string) || "en",
  };
}
