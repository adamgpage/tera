import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { translateText } from "@/lib/deepl/client";

/**
 * POST /api/translate
 * Translates a message for in-conversation real-time translation.
 * Called when sender and receiver have different primary languages.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text, targetLang, sourceLang } = await request.json();

  if (!text || !targetLang) {
    return NextResponse.json(
      { error: "text and targetLang required" },
      { status: 400 }
    );
  }

  if (text.length > 5000) {
    return NextResponse.json(
      { error: "Text too long (max 5000 characters)" },
      { status: 400 }
    );
  }

  try {
    const result = await translateText(text, targetLang, sourceLang);

    return NextResponse.json({
      translatedText: result.text,
      detectedSourceLanguage: result.detected_source_language,
      targetLanguage: targetLang,
    });
  } catch (err) {
    console.error("Translation error:", err);
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}
