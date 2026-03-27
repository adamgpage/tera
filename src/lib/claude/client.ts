import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-haiku-4-5-20251001";
const EMBEDDING_DIMENSIONS = 1024;

/**
 * Extract JSON from a response that might be wrapped in markdown fences.
 */
function extractJSON(text: string): Record<string, unknown> {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (e) {
    console.log("[extractJSON] Direct parse failed, trying fence extraction. First 50 chars:", text.substring(0, 50));
    // Try extracting from markdown code fences
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      return JSON.parse(fenceMatch[1].trim());
    }
    // Try finding the first { ... } block
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      return JSON.parse(braceMatch[0]);
    }
    throw new Error(`Could not parse JSON from response: ${text.substring(0, 200)}`);
  }
}

/**
 * Parse a raw request into structured problem summary, tags, and context.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parseRequest(rawText: string, attachmentTexts: string[] = []): Promise<Record<string, any>> {
  const attachmentContext = attachmentTexts.length > 0
    ? `\n\nAttached documents:\n${attachmentTexts.map((t, i) => `--- Document ${i + 1} ---\n${t}`).join("\n")}`
    : "";

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: `You are Tera's request parser. Analyse the user's problem description and return a JSON object with:
- parsed_summary: A clear 2-3 sentence summary of the problem
- stated_problem: What the user explicitly said their problem is
- inferred_problem: What the underlying issue might be (if different from stated)
- expertise_tags: An array of 3-8 specific expertise tags needed (e.g. "cassava farming", "debt restructuring", "classroom management")
- geographic_context: An object with relevant geographic info { region, country, climate, economic_context } (nullable fields)
- urgency: "low", "medium", or "high" based on the problem description
- recommended_format: "synchronous" or "asynchronous" with brief reasoning
- high_risk_domain: boolean - true if this involves medical, legal, or financial advice
- clarifying_questions: An array of 0-2 questions if the request is too vague to match well

Return ONLY valid JSON, no markdown fences.`,
    messages: [
      {
        role: "user",
        content: `Problem description:\n${rawText}${attachmentContext}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = extractJSON(text);

  return {
    ...parsed,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}

/**
 * Generate expertise tags from a helper's biography.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateHelperTags(biography: string): Promise<Record<string, any>> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1000,
    system: `You extract expertise tags from a helper's biography. Return a JSON object with:
- expertise_tags: An array of 5-15 specific expertise tags based on their experience (e.g. "supply chain logistics", "React development", "secondary education UK")
- domains: An array of 2-5 broad domain categories (e.g. "agriculture", "technology", "education")
- geographic_expertise: An array of regions/countries they have experience in
- years_experience_estimate: A rough estimate based on the biography

Return ONLY valid JSON, no markdown fences.`,
    messages: [
      {
        role: "user",
        content: biography,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = extractJSON(text);

  return {
    ...parsed,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}

/**
 * Generate an embedding vector for text content (biography or request).
 * Uses Claude to create a semantic summary, then a simple hash-based embedding.
 * In production, this should use a dedicated embedding model.
 */
export async function generateEmbedding(text: string): Promise<{ embedding: number[]; usage: { input_tokens: number; output_tokens: number } }> {
  // Use Anthropic's voyage embeddings via the API or fall back to
  // a summary-based approach. For MVP we'll use the Voyager model
  // if available, otherwise create a semantic fingerprint.

  // For now: use Claude to generate a semantic summary, then create
  // a deterministic embedding from it. This is a placeholder —
  // replace with proper embedding model in production.
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1000,
    system: `Generate a semantic fingerprint. Return JSON: {"keywords":["word1","word2",...],"domain_signals":["sig1",...],"context_signals":["ctx1",...]}. Keywords: 30 simple strings. Domain_signals: 5 strings. Context_signals: 5 strings. All values must be plain strings, not objects. No markdown fences.`,
    messages: [{ role: "user", content: text }],
  });

  const responseText = response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = extractJSON(responseText);

  // Ensure arrays contain only strings
  const toStringArray = (arr: unknown): string[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map((item: unknown) => typeof item === "string" ? item : JSON.stringify(item));
  };
  parsed.keywords = toStringArray(parsed.keywords);
  parsed.domain_signals = toStringArray(parsed.domain_signals);
  parsed.context_signals = toStringArray(parsed.context_signals);

  // Create a deterministic embedding from the semantic fingerprint
  const embedding = createEmbeddingFromFingerprint(parsed as { keywords: string[]; domain_signals: string[]; context_signals: string[] }, EMBEDDING_DIMENSIONS);

  return {
    embedding,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}

/**
 * Generate a post-conversation summary.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateSummary(transcript: string, requestContext: string): Promise<Record<string, any>> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: `You generate structured conversation summaries for Tera. Given a conversation transcript and the original request context, produce a JSON object with:
- problem_as_stated: What the asker originally described
- problem_as_understood: The helper's interpretation of the real issue
- approach_provided: The advice, methods, or approach the helper shared
- key_actions: Specific action items or next steps agreed upon
- follow_up_required: Whether follow-up is needed and what kind
- high_risk_disclaimer: boolean - true if medical/legal/financial advice was given
- anonymised_summary: A 2-3 paragraph anonymised summary suitable for the Knowledge Commons (no names, locations generalised)
- suggested_domain_tags: Array of domain tags for Knowledge Commons
- suggested_geo_tags: Array of geographic context tags

Return ONLY valid JSON, no markdown fences.`,
    messages: [
      {
        role: "user",
        content: `Original request context:\n${requestContext}\n\nConversation transcript:\n${transcript}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = extractJSON(text);

  return {
    ...parsed,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}

/**
 * Screen content for harmful, abusive, or PII content.
 */
export async function screenContent(content: string): Promise<{ safe: boolean; reason?: string; usage: { input_tokens: number; output_tokens: number } }> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: `You are a content safety screener. Analyse the text and return a JSON object:
- safe: boolean - true if the content is appropriate
- reason: string (only if safe is false) - brief explanation of the issue
- contains_pii: boolean - true if personally identifying information is present that shouldn't be shared

Return ONLY valid JSON, no markdown fences.`,
    messages: [{ role: "user", content }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = extractJSON(text);

  return {
    safe: Boolean(parsed.safe) && !parsed.contains_pii,
    reason: (parsed.reason as string) || (parsed.contains_pii ? "Contains personally identifying information" : undefined),
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}

/**
 * Generate an SEO slug for a Knowledge Commons entry.
 */
export async function generateSeoSlug(summary: string, domainTags: string[], geoTags: string[]) {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 200,
    system: `Generate a URL-friendly SEO slug for a knowledge entry. Return a JSON object:
- slug: a lowercase hyphenated slug, max 60 characters, descriptive of the topic (e.g. "cassava-blight-drainage-west-africa")
- title: a human-readable title for the page, max 70 characters

Return ONLY valid JSON, no markdown fences.`,
    messages: [
      {
        role: "user",
        content: `Summary: ${summary}\nDomains: ${domainTags.join(", ")}\nGeography: ${geoTags.join(", ")}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return extractJSON(text) as { slug: string; title: string };
}


// --- Internal helpers ---

function createEmbeddingFromFingerprint(
  fingerprint: { keywords: string[]; domain_signals: string[]; context_signals: string[] },
  dimensions: number
): number[] {
  const allTerms = [
    ...fingerprint.keywords,
    ...fingerprint.domain_signals,
    ...fingerprint.context_signals,
  ];

  const embedding = new Array(dimensions).fill(0);

  for (let i = 0; i < allTerms.length; i++) {
    const term = allTerms[i];
    const weight = i < fingerprint.keywords.length
      ? 1.0 - (i / fingerprint.keywords.length) * 0.5 // Keywords: weight 1.0 to 0.5
      : 0.3; // Signals: weight 0.3

    // Hash the term to multiple embedding dimensions
    for (let j = 0; j < term.length; j++) {
      const hash = simpleHash(term + j.toString());
      const idx = Math.abs(hash) % dimensions;
      embedding[idx] += weight * (hash > 0 ? 1 : -1);
    }
  }

  // L2 normalise
  const norm = Math.sqrt(embedding.reduce((sum: number, v: number) => sum + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      embedding[i] /= norm;
    }
  }

  return embedding;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}
