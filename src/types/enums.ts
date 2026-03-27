// Re-export row types from database types for convenience
export type {
  UsersRow as User,
  HelperProfilesRow as HelperProfile,
  RequestsRow as Request,
  MatchAttemptsRow as MatchAttempt,
  ConversationsRow as Conversation,
  ConversationSummariesRow as ConversationSummary,
  RatingsRow as Rating,
  KnowledgeCommonsEntriesRow as KnowledgeCommonsEntry,
  ScheduledCallsRow as ScheduledCall,
  NotificationsRow as Notification,
  NotificationPreferencesRow as NotificationPreferences,
  ReportsRow as Report,
  ModerationActionsRow as ModerationActionRecord,
  ExpertiseTagsRow as ExpertiseTag,
  PaymentsRow as Payment,
  ConversationMessagesRow as ConversationMessage,
} from "./database";

// Enum-like types extracted from row types
export type AccountStatus = "active" | "suspended" | "banned" | "deleted";
export type AvailabilityStatus = "available" | "limited" | "unavailable";
export type UrgencyLevel = "low" | "medium" | "high";
export type ConversationFormat = "synchronous" | "asynchronous";
export type FormatPreference = "synchronous" | "asynchronous" | "no_preference";
export type RequestStatus = "parsing" | "confirmed" | "matching" | "matched" | "in_progress" | "resolved" | "unmatched" | "closed";
export type ConversationStatus = "active" | "completed" | "reported" | "abandoned";
export type MatchResponse = "pending" | "accepted" | "declined" | "timed_out";
export type SummaryStatus = "pending" | "completed" | "failed";
export type ReportReason = "abusive_behaviour" | "misleading_expertise" | "spam" | "inappropriate_content" | "other";
export type ReportStatus = "open" | "under_review" | "resolved_action_taken" | "resolved_no_action";
export type ModerationAction = "approve" | "reject" | "warn" | "suspend" | "ban" | "escalate";
export type TagStatus = "active" | "proposed" | "rejected";
export type PaymentStatus = "pending" | "captured" | "failed" | "refunded";
export type UserRole = "user" | "moderator" | "senior_moderator";
