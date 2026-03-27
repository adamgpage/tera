import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { callClaude } from "../_shared/claude-client.ts";

const SYSTEM_PROMPT = `You are a content moderation system for Tera, a platform connecting people who have problems with people who have relevant experience.

Evaluate the submitted text for safety. Check for:
1. Harmful, abusive, or threatening language
2. Spam, commercial solicitation, or SEO manipulation
3. Obvious misrepresentation of expertise (grandiose unverifiable claims)
4. Phone numbers or physical addresses that appear to be shared inappropriately

Do NOT flag:
- Normal professional language
- Mentions of sensitive topics (medical, legal, financial) — these are legitimate domains
- Honest descriptions of problems or experience
- Cultural or regional expressions

Return ONLY a JSON object with this structure:
{
  "safe": true/false,
  "reason": "brief explanation if flagged, null if safe",
  "category": "harmful|spam|misrepresentation|pii|null"
}`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, contentType } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await callClaude(
      SYSTEM_PROMPT,
      `Content type: ${contentType || "general"}\n\nText to moderate:\n${text}`,
      { maxTokens: 256, temperature: 0.1 }
    );

    let moderation: { safe: boolean; reason: string | null; category: string | null };
    try {
      const cleaned = result.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      moderation = JSON.parse(cleaned);
    } catch {
      // If we can't parse, assume safe (fail open for content, fail closed for harm)
      moderation = { safe: true, reason: null, category: null };
    }

    return new Response(
      JSON.stringify(moderation),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // On moderation failure, fail open — let content through
    // but log the error for investigation
    console.error("Moderation error:", message);
    return new Response(
      JSON.stringify({ safe: true, reason: null, category: null, _error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
