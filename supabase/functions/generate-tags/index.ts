import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { callClaude } from "../_shared/claude-client.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";

const SYSTEM_PROMPT = `You are an expertise tagging system for Tera, a platform that connects people who have problems with people who have relevant experience.

Given a helper's biography, generate 3-8 expertise tags that accurately represent their areas of knowledge and experience.

Rules:
- Tags should be lowercase, 1-4 words each
- Prefer tags from this controlled vocabulary when they fit: crop management, soil health, irrigation systems, pest control, livestock management, organic farming, business plan development, market entry strategy, cashflow management, pricing strategy, fundraising, venture capital, financial planning, bookkeeping, tax compliance, debt restructuring, web development, mobile app development, database design, cloud infrastructure, cybersecurity, data analytics, machine learning, curriculum design, classroom management, special education, primary care, maternal health, mental health, nutrition, public health, contract law, employment law, intellectual property, company formation, civil engineering, structural engineering, renewable energy, brand strategy, content marketing, social media marketing, recruitment, performance management, team leadership, climate change adaptation, waste management, ngo management, programme design, career transition, public speaking, graphic design, video production
- If the biography describes expertise not covered by the vocabulary, generate new descriptive tags
- Return ONLY a JSON array of strings, no other text

Example output: ["cashflow management", "debt restructuring", "small business management", "financial modelling"]`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { biography, userId } = await req.json();

    if (!biography || typeof biography !== "string") {
      return new Response(
        JSON.stringify({ error: "Biography text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await callClaude(SYSTEM_PROMPT, biography);

    // Parse the JSON array from Claude's response
    let tags: string[];
    try {
      // Handle case where Claude wraps in markdown code block
      const cleaned = result.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      tags = JSON.parse(cleaned);
      if (!Array.isArray(tags)) throw new Error("Not an array");
      tags = tags.filter((t) => typeof t === "string").map((t) => t.toLowerCase().trim());
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to parse tags from AI response", raw: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check which tags are new (not in controlled vocabulary) and propose them
    if (tags.length > 0) {
      const supabase = createServiceClient();
      const { data: existingTags } = await supabase
        .from("expertise_tags")
        .select("tag")
        .in("tag", tags);

      const existingSet = new Set((existingTags ?? []).map((t: { tag: string }) => t.tag));
      const newTags = tags.filter((t) => !existingSet.has(t));

      // Insert new tags as 'proposed' for admin review
      if (newTags.length > 0) {
        await supabase.from("expertise_tags").insert(
          newTags.map((tag) => ({
            tag,
            domain: "uncategorised",
            status: "proposed",
          }))
        );
      }
    }

    return new Response(
      JSON.stringify({ tags }),
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
