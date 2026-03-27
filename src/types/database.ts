// Placeholder — regenerate with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
// This file will be replaced by auto-generated types once the Supabase project is connected.

// Row types (what you get back from select)
export interface UsersRow {
  id: string;
  email: string;
  name: string;
  country: string;
  region: string | null;
  languages: string[];
  is_helper: boolean;
  role: "user" | "moderator" | "senior_moderator";
  profile_photo_url: string | null;
  account_status: "active" | "suspended" | "banned" | "deleted";
  created_at: string;
  updated_at: string;
}

export interface HelperProfilesRow {
  id: string;
  user_id: string;
  biography: string;
  expertise_tags: string[];
  expertise_embedding: number[] | null;
  availability_status: "available" | "limited" | "unavailable";
  paid_tier_active: boolean;
  session_rate_cents: number | null;
  session_rate_currency: string;
  stripe_connect_account_id: string | null;
  credential_upload_url: string | null;
  linkedin_url: string | null;
  verified_badge: boolean;
  reputation_score: number;
  total_conversations: number;
  resolved_rate: number;
  response_reliability: number;
  public_profile_slug: string;
  created_at: string;
  updated_at: string;
}

export interface RequestsRow {
  id: string;
  asker_user_id: string;
  raw_text: string;
  parsed_summary: string | null;
  stated_problem: string | null;
  inferred_problem: string | null;
  expertise_tags: string[];
  request_embedding: number[] | null;
  geographic_context: Record<string, unknown>;
  urgency: "low" | "medium" | "high";
  preferred_format: "synchronous" | "asynchronous" | "no_preference";
  status: "parsing" | "confirmed" | "matching" | "matched" | "in_progress" | "resolved" | "unmatched" | "closed";
  parse_attempt_count: number;
  matched_helper_id: string | null;
  created_at: string;
  updated_at: string;
  unmatched_notified_at: string | null;
}

export interface MatchAttemptsRow {
  id: string;
  request_id: string;
  helper_profile_id: string;
  match_score: number;
  rank: number;
  notified_at: string;
  response: "pending" | "accepted" | "declined" | "timed_out";
  responded_at: string | null;
  created_at: string;
}

export interface ConversationsRow {
  id: string;
  request_id: string;
  asker_user_id: string;
  helper_user_id: string;
  format: "synchronous" | "asynchronous";
  status: "active" | "completed" | "reported" | "abandoned";
  start_at: string;
  end_at: string | null;
  transcript_url: string | null;
  summary_id: string | null;
  translation_applied: boolean;
  translation_language_pair: string | null;
  auto_close_warning_sent: boolean;
  last_activity_at: string;
  stream_channel_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationSummariesRow {
  id: string;
  conversation_id: string;
  problem_as_stated: string | null;
  problem_as_understood: string | null;
  approach_provided: string | null;
  key_actions: string | null;
  follow_up_required: string | null;
  high_risk_disclaimer: boolean;
  generated_at: string | null;
  generation_status: "pending" | "completed" | "failed";
  retry_count: number;
  created_at: string;
}

export interface RatingsRow {
  id: string;
  conversation_id: string;
  author_user_id: string;
  subject_user_id: string;
  narrative_text: string;
  resolved: boolean | null;
  sentiment_score: number | null;
  visible: boolean;
  created_at: string;
}

export interface KnowledgeCommonsEntriesRow {
  id: string;
  conversation_id: string;
  anonymised_summary: string;
  domain_tags: string[];
  geographic_context_tags: string[];
  tera_verified: boolean;
  asker_consent: boolean;
  helper_consent: boolean;
  published: boolean;
  published_at: string | null;
  unpublished_at: string | null;
  created_at: string;
}

export interface ScheduledCallsRow {
  id: string;
  conversation_id: string;
  proposed_by_user_id: string;
  proposed_time: string;
  accepted: boolean | null;
  daily_room_url: string | null;
  reminder_1h_sent: boolean;
  reminder_10m_sent: boolean;
  call_started_at: string | null;
  call_ended_at: string | null;
  no_show_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationsRow {
  id: string;
  user_id: string;
  type: string;
  reference_id: string | null;
  reference_type: string | null;
  channel: "in_app" | "email";
  title: string;
  body: string;
  read: boolean;
  sent_at: string;
  delivered: boolean;
}

export interface NotificationPreferencesRow {
  id: string;
  user_id: string;
  email_match_found: boolean;
  email_new_message: boolean;
  email_call_reminder: boolean;
  email_summary_ready: boolean;
  email_moderation_flag: boolean;
  email_request_status: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportsRow {
  id: string;
  conversation_id: string;
  reporter_user_id: string;
  reason: "abusive_behaviour" | "misleading_expertise" | "spam" | "inappropriate_content" | "other";
  detail: string | null;
  status: "open" | "under_review" | "resolved_action_taken" | "resolved_no_action";
  assigned_moderator_id: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface ModerationActionsRow {
  id: string;
  moderator_user_id: string;
  target_user_id: string | null;
  target_content_type: string | null;
  target_content_id: string | null;
  report_id: string | null;
  action: "approve" | "reject" | "warn" | "suspend" | "ban" | "escalate";
  reason: string;
  created_at: string;
}

export interface ExpertiseTagsRow {
  id: string;
  tag: string;
  domain: string;
  status: "active" | "proposed" | "rejected";
  proposed_at: string;
  reviewed_at: string | null;
}

export interface PaymentsRow {
  id: string;
  conversation_id: string;
  asker_user_id: string;
  helper_user_id: string;
  amount_cents: number;
  currency: string;
  tera_fee_cents: number;
  helper_payout_cents: number;
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
  status: "pending" | "captured" | "failed" | "refunded";
  created_at: string;
  captured_at: string | null;
  refunded_at: string | null;
}

export interface ConversationMessagesRow {
  id: string;
  conversation_id: string;
  user_id: string;
  user_name: string;
  text: string;
  attachments: Record<string, unknown>[];
  created_at: string;
}

// Database type for Supabase client
export type Database = {
  public: {
    Tables: {
      users: { Row: UsersRow; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      helper_profiles: { Row: HelperProfilesRow; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      requests: { Row: RequestsRow; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      match_attempts: { Row: MatchAttemptsRow; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      conversations: { Row: ConversationsRow; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      conversation_summaries: { Row: ConversationSummariesRow; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      ratings: { Row: RatingsRow; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      knowledge_commons_entries: { Row: KnowledgeCommonsEntriesRow; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      scheduled_calls: { Row: ScheduledCallsRow; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      notifications: { Row: NotificationsRow; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      notification_preferences: { Row: NotificationPreferencesRow; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      reports: { Row: ReportsRow; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      moderation_actions: { Row: ModerationActionsRow; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      expertise_tags: { Row: ExpertiseTagsRow; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      payments: { Row: PaymentsRow; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      conversation_messages: { Row: ConversationMessagesRow; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      match_helpers: {
        Args: {
          query_embedding: number[];
          match_threshold?: number;
          match_count?: number;
        };
        Returns: {
          helper_profile_id: string;
          similarity: number;
        }[];
      };
    };
    Enums: Record<string, never>;
  };
};
