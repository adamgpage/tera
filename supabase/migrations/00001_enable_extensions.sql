-- Enable required Postgres extensions
create extension if not exists "vector" with schema extensions;
create extension if not exists "pg_trgm" with schema extensions;
create extension if not exists "pg_net" with schema extensions;

-- Custom types used across tables
create type public.account_status as enum ('active', 'suspended', 'banned', 'deleted');
create type public.availability_status as enum ('available', 'limited', 'unavailable');
create type public.urgency_level as enum ('low', 'medium', 'high');
create type public.conversation_format as enum ('synchronous', 'asynchronous');
create type public.format_preference as enum ('synchronous', 'asynchronous', 'no_preference');
create type public.request_status as enum (
  'parsing', 'confirmed', 'matching', 'matched',
  'in_progress', 'resolved', 'unmatched', 'closed'
);
create type public.conversation_status as enum ('active', 'completed', 'reported', 'abandoned');
create type public.match_response as enum ('pending', 'accepted', 'declined', 'timed_out');
create type public.summary_status as enum ('pending', 'completed', 'failed');
create type public.report_reason as enum (
  'abusive_behaviour', 'misleading_expertise', 'spam',
  'inappropriate_content', 'other'
);
create type public.report_status as enum (
  'open', 'under_review', 'resolved_action_taken', 'resolved_no_action'
);
create type public.moderation_action as enum (
  'approve', 'reject', 'warn', 'suspend', 'ban', 'escalate'
);
create type public.tag_status as enum ('active', 'proposed', 'rejected');
create type public.payment_status as enum ('pending', 'captured', 'failed', 'refunded');
create type public.user_role as enum ('user', 'moderator', 'senior_moderator');
create type public.notification_channel as enum ('in_app', 'email');
create type public.notification_type as enum (
  'request_parsed', 'match_invitation', 'match_confirmed',
  'match_cascading', 'match_exhausted', 'request_unmatched_7d',
  'new_message', 'call_reminder', 'conversation_completed',
  'summary_ready', 'rating_received', 'content_flagged',
  'conversation_auto_closing'
);
