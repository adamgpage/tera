import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { callClaude } from "../_shared/claude-client.ts";

const SYSTEM_PROMPT = `You are the request parsing engine for Tera, a platform that connects people who have real-world problems with people who have relevant direct experience.

Given a user's raw problem description, produce a structured analysis. Your job is to:
1. Identify the core problem — what the person actually needs help with
2. If the stated problem appears to mask a deeper or adjacent issue, surface BOTH the stated problem and the inferred underlying problem
3. Generate a clear, concise summary of the request (2-4 sentences)
4. Assign 2-6 expertise domain tags that describe what kind of helper would be relevant
5. Infer geographic context if mentioned or implied
6. Assess urgency based on language signals

For expertise tags, prefer these from the controlled vocabulary when they fit:
crop management, soil health, irrigation systems, pest control, business plan development, market entry strategy, cashflow management, pricing strategy, fundraising, financial planning, bookkeeping, tax compliance, debt restructuring, web development, mobile app development, database design, cloud infrastructure, cybersecurity, data analytics, curriculum design, classroom management, primary care, mental health, nutrition, contract law, employment law, intellectual property, company formation, civil engineering, renewable energy, brand strategy, content marketing, recruitment, team leadership, climate change adaptation, ngo management, career transition, public speaking

Return ONLY a JSON object with this structure:
{
  "parsed_summary": "2-4 sentence summary of what the person needs",
  "stated_problem": "the problem as the user described it",
  "inferred_problem": "the deeper problem if different from stated, or null",
  "expertise_tags": ["tag1", "tag2", ...],
  "geographic_context": {
    "country": "ISO 3166-1 alpha-2 code or null",
    "region": "region name or null",
    "inferred_cultural_context": "brief note or null"
  },
  "urgency": "low" | "medium" | "high",
  "recommended_format": "synchronous" | "asynchronous"
}`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { rawText } = await req.json();

    if (!rawText || typeof rawText !== "string") {
      return new Response(
        JSON.stringify({ error: "Request text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (rawText.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "Please describe your problem in more detail (at least 20 characters)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await callClaude(SYSTEM_PROMPT, rawText, {
      maxTokens: 1024,
      temperature: 0.2,
    });

    let parsed: Record<string, unknown>;
    try {
      const cleaned = result.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return new Response(
        JSON.stringify({
          error: "We need a bit more detail to find the right person. Could you describe the problem differently or add more context?",
          parseFailure: true,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    if (
      !parsed.parsed_summary ||
      !parsed.stated_problem ||
      !Array.isArray(parsed.expertise_tags) ||
      parsed.expertise_tags.length === 0
    ) {
      return new Response(
        JSON.stringify({
          error: "We need a bit more detail to find the right person. Could you describe the problem differently or add more context?",
          parseFailure: true,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(parsed),
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
