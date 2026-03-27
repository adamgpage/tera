// Matching engine weights
export const MATCH_WEIGHTS = {
  expertise: 0.4,
  geographic: 0.2,
  language: 0.2,
  reputation: 0.15,
  availability: 0.05,
} as const;

// Cascade timeouts in minutes
export const CASCADE_TIMEOUTS = {
  high: 30,
  medium: 120,
  low: 360,
} as const;

// Match shortlist size
export const MATCH_SHORTLIST_SIZE = 5;

// Matching thresholds
export const MATCH_SIMILARITY_THRESHOLD = 0.3;

// Conversation auto-close
export const CONVERSATION_WARNING_DAYS = 27;
export const CONVERSATION_AUTO_CLOSE_DAYS = 30;
export const CONVERSATION_REOPEN_DAYS = 7;

// Ratings
export const MIN_RATING_LENGTH = 20;
export const MIN_BIOGRAPHY_WORDS = 100;
export const MIN_REQUEST_LENGTH = 20;

// Request parsing
export const MAX_PARSE_ATTEMPTS = 2;

// Unmatched request expiry
export const UNMATCHED_NOTIFY_DAYS = 7;

// Notification debounce
export const EMAIL_DEBOUNCE_MINUTES = 10;

// Paid tier
export const TERA_FEE_PERCENTAGE = 0.15;

// Profile visibility thresholds
export const MIN_CONVERSATIONS_FOR_STATS = 10;

// Helper reputation defaults
export const DEFAULT_REPUTATION_SCORE = 0.5;

// Reputation weights
export const REPUTATION_WEIGHTS = {
  resolved_rate: 0.4,
  sentiment: 0.3,
  reliability: 0.15,
  volume: 0.1,
  recency: 0.05,
} as const;

// High-risk domains that require disclaimers
export const HIGH_RISK_DOMAINS = [
  "health",
  "legal",
  "finance",
] as const;

// DeepL supported language codes (subset — full list maintained in DB)
export const DEEPL_SUPPORTED_LANGUAGES = [
  "ar", "bg", "cs", "da", "de", "el", "en", "es", "et", "fi",
  "fr", "hu", "id", "it", "ja", "ko", "lt", "lv", "nb", "nl",
  "pl", "pt", "ro", "ru", "sk", "sl", "sv", "tr", "uk", "zh",
] as const;
