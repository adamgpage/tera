const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_API_URL = process.env.DEEPL_API_URL || "https://api-free.deepl.com/v2";

export interface TranslationResult {
  text: string;
  detected_source_language: string;
}

/**
 * Translate text from one language to another via DeepL API.
 * If source and target are the same, returns original text.
 */
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang?: string
): Promise<TranslationResult> {
  if (!DEEPL_API_KEY) {
    console.warn("DEEPL_API_KEY not configured — returning original text");
    return { text, detected_source_language: sourceLang || "EN" };
  }

  // DeepL uses ISO 639-1 codes; normalize
  const target = normalizeLanguageCode(targetLang);
  const source = sourceLang ? normalizeLanguageCode(sourceLang) : undefined;

  // Skip if same language
  if (source && source === target) {
    return { text, detected_source_language: source };
  }

  const body: Record<string, string | string[]> = {
    text: [text],
    target_lang: target,
  };
  if (source) {
    body.source_lang = source;
  }

  const res = await fetch(`${DEEPL_API_URL}/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("DeepL API error:", res.status, errText);
    // Fallback: return original text
    return { text, detected_source_language: source || "UNKNOWN" };
  }

  const data = await res.json();
  const translation = data.translations?.[0];

  return {
    text: translation?.text || text,
    detected_source_language: translation?.detected_source_language || source || "UNKNOWN",
  };
}

/**
 * Translate multiple texts in a single API call (batch).
 */
export async function translateBatch(
  texts: string[],
  targetLang: string,
  sourceLang?: string
): Promise<TranslationResult[]> {
  if (!DEEPL_API_KEY || texts.length === 0) {
    return texts.map((t) => ({ text: t, detected_source_language: sourceLang || "UNKNOWN" }));
  }

  const target = normalizeLanguageCode(targetLang);

  const body: Record<string, string | string[]> = {
    text: texts,
    target_lang: target,
  };
  if (sourceLang) {
    body.source_lang = normalizeLanguageCode(sourceLang);
  }

  const res = await fetch(`${DEEPL_API_URL}/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return texts.map((t) => ({ text: t, detected_source_language: "UNKNOWN" }));
  }

  const data = await res.json();
  return (data.translations || []).map((t: { text: string; detected_source_language: string }, i: number) => ({
    text: t.text || texts[i],
    detected_source_language: t.detected_source_language || "UNKNOWN",
  }));
}

/**
 * Normalize language codes to DeepL format.
 * DeepL uses uppercase 2-letter codes, with regional variants like EN-US, PT-BR.
 */
function normalizeLanguageCode(code: string): string {
  const upper = code.toUpperCase().replace("_", "-");
  // DeepL requires EN-US or EN-GB for target, but just EN for source
  return upper;
}

/**
 * Supported DeepL target languages (subset — DeepL supports many more).
 */
export const SUPPORTED_LANGUAGES = [
  { code: "AR", name: "Arabic" },
  { code: "BG", name: "Bulgarian" },
  { code: "CS", name: "Czech" },
  { code: "DA", name: "Danish" },
  { code: "DE", name: "German" },
  { code: "EL", name: "Greek" },
  { code: "EN-US", name: "English (US)" },
  { code: "EN-GB", name: "English (UK)" },
  { code: "ES", name: "Spanish" },
  { code: "ET", name: "Estonian" },
  { code: "FI", name: "Finnish" },
  { code: "FR", name: "French" },
  { code: "HU", name: "Hungarian" },
  { code: "ID", name: "Indonesian" },
  { code: "IT", name: "Italian" },
  { code: "JA", name: "Japanese" },
  { code: "KO", name: "Korean" },
  { code: "LT", name: "Lithuanian" },
  { code: "LV", name: "Latvian" },
  { code: "NB", name: "Norwegian" },
  { code: "NL", name: "Dutch" },
  { code: "PL", name: "Polish" },
  { code: "PT-BR", name: "Portuguese (Brazil)" },
  { code: "PT-PT", name: "Portuguese (Portugal)" },
  { code: "RO", name: "Romanian" },
  { code: "RU", name: "Russian" },
  { code: "SK", name: "Slovak" },
  { code: "SL", name: "Slovenian" },
  { code: "SV", name: "Swedish" },
  { code: "TR", name: "Turkish" },
  { code: "UK", name: "Ukrainian" },
  { code: "ZH", name: "Chinese" },
] as const;
