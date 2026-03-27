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
-- Users table (extends auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  country text not null, -- ISO 3166-1 alpha-2
  region text,
  languages text[] not null default '{}', -- ISO 639-1 codes
  is_helper boolean not null default false,
  role public.user_role not null default 'user',
  profile_photo_url text,
  account_status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create public.users row when auth.users is created
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, country, languages)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'country', ''),
    case
      when new.raw_user_meta_data->>'languages' is not null
      then string_to_array(new.raw_user_meta_data->>'languages', ',')
      else '{}'
    end
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at auto-update
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Helper profiles
create table public.helper_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  biography text not null,
  expertise_tags text[] not null default '{}',
  expertise_embedding extensions.vector(1024),
  availability_status public.availability_status not null default 'available',
  paid_tier_active boolean not null default false,
  session_rate_cents integer,
  session_rate_currency text default 'USD', -- ISO 4217
  stripe_connect_account_id text,
  credential_upload_url text,
  linkedin_url text,
  verified_badge boolean not null default false,
  reputation_score real not null default 0.5, -- 0.0 to 1.0
  total_conversations integer not null default 0,
  resolved_rate real not null default 0.0,
  response_reliability real not null default 1.0,
  public_profile_slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger helper_profiles_updated_at
  before update on public.helper_profiles
  for each row execute function public.set_updated_at();

-- Indexes
create index idx_helper_profiles_user_id on public.helper_profiles(user_id);
create index idx_helper_profiles_slug on public.helper_profiles(public_profile_slug);
create index idx_helper_profiles_availability on public.helper_profiles(availability_status);
create index idx_users_account_status on public.users(account_status);
-- Requests
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  asker_user_id uuid not null references public.users(id) on delete cascade,
  raw_text text not null,
  parsed_summary text,
  stated_problem text,
  inferred_problem text,
  expertise_tags text[] not null default '{}',
  request_embedding extensions.vector(1024),
  geographic_context jsonb default '{}',
  urgency public.urgency_level not null default 'medium',
  preferred_format public.format_preference not null default 'no_preference',
  status public.request_status not null default 'parsing',
  parse_attempt_count integer not null default 0,
  matched_helper_id uuid references public.helper_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unmatched_notified_at timestamptz
);

create trigger requests_updated_at
  before update on public.requests
  for each row execute function public.set_updated_at();

-- Match attempts — tracks the cascade process per request
create table public.match_attempts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  helper_profile_id uuid not null references public.helper_profiles(id) on delete cascade,
  match_score real not null,
  rank integer not null, -- 1-5
  notified_at timestamptz not null default now(),
  response public.match_response not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_requests_asker on public.requests(asker_user_id);
create index idx_requests_status on public.requests(status);
create index idx_requests_created on public.requests(created_at desc);
create index idx_match_attempts_request on public.match_attempts(request_id);
create index idx_match_attempts_helper on public.match_attempts(helper_profile_id);
create index idx_match_attempts_pending on public.match_attempts(response) where response = 'pending';
-- Conversations
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  asker_user_id uuid not null references public.users(id),
  helper_user_id uuid not null references public.users(id),
  format public.conversation_format not null default 'asynchronous',
  status public.conversation_status not null default 'active',
  start_at timestamptz not null default now(),
  end_at timestamptz,
  transcript_url text,
  summary_id uuid, -- FK added after conversation_summaries created
  translation_applied boolean not null default false,
  translation_language_pair text, -- e.g. "en-es"
  auto_close_warning_sent boolean not null default false,
  last_activity_at timestamptz not null default now(),
  stream_channel_id text, -- Stream Chat channel identifier
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- Conversation summaries
create table public.conversation_summaries (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique references public.conversations(id) on delete cascade,
  problem_as_stated text,
  problem_as_understood text,
  approach_provided text,
  key_actions text,
  follow_up_required text,
  high_risk_disclaimer boolean not null default false,
  generated_at timestamptz,
  generation_status public.summary_status not null default 'pending',
  retry_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Add FK from conversations to summaries
alter table public.conversations
  add constraint fk_conversations_summary
  foreign key (summary_id) references public.conversation_summaries(id);

-- Scheduled calls
create table public.scheduled_calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  proposed_by_user_id uuid not null references public.users(id),
  proposed_time timestamptz not null,
  accepted boolean, -- null = pending, true = accepted, false = declined
  daily_room_url text,
  reminder_1h_sent boolean not null default false,
  reminder_10m_sent boolean not null default false,
  call_started_at timestamptz,
  call_ended_at timestamptz,
  no_show_user_id uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger scheduled_calls_updated_at
  before update on public.scheduled_calls
  for each row execute function public.set_updated_at();

-- Indexes
create index idx_conversations_request on public.conversations(request_id);
create index idx_conversations_asker on public.conversations(asker_user_id);
create index idx_conversations_helper on public.conversations(helper_user_id);
create index idx_conversations_status on public.conversations(status);
create index idx_conversations_last_activity on public.conversations(last_activity_at);
create index idx_scheduled_calls_conversation on public.scheduled_calls(conversation_id);
create index idx_scheduled_calls_time on public.scheduled_calls(proposed_time);
-- Ratings
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  author_user_id uuid not null references public.users(id),
  subject_user_id uuid not null references public.users(id),
  narrative_text text not null,
  resolved boolean, -- only present when author is the asker
  sentiment_score real, -- 0.0 to 1.0, AI-calculated on submission
  visible boolean not null default false,
  created_at timestamptz not null default now(),

  -- Each user can only rate once per conversation
  unique(conversation_id, author_user_id)
);

-- When both ratings exist for a conversation, make both visible
create or replace function public.check_rating_visibility()
returns trigger as $$
declare
  rating_count integer;
begin
  select count(*) into rating_count
  from public.ratings
  where conversation_id = new.conversation_id;

  if rating_count >= 2 then
    update public.ratings
    set visible = true
    where conversation_id = new.conversation_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_rating_inserted
  after insert on public.ratings
  for each row execute function public.check_rating_visibility();

-- Knowledge commons entries
create table public.knowledge_commons_entries (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique references public.conversations(id) on delete cascade,
  anonymised_summary text not null,
  domain_tags text[] not null default '{}',
  geographic_context_tags text[] not null default '{}',
  tera_verified boolean not null default true,
  asker_consent boolean not null default false,
  helper_consent boolean not null default false,
  published boolean not null default false,
  published_at timestamptz,
  unpublished_at timestamptz,
  created_at timestamptz not null default now()
);

-- Auto-publish when both consent
create or replace function public.check_commons_consent()
returns trigger as $$
begin
  if new.asker_consent = true and new.helper_consent = true and new.published = false then
    new.published = true;
    new.published_at = now();
  end if;
  -- Auto-unpublish on consent withdrawal
  if (new.asker_consent = false or new.helper_consent = false) and old.published = true then
    new.published = false;
    new.unpublished_at = now();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_commons_consent_change
  before update on public.knowledge_commons_entries
  for each row execute function public.check_commons_consent();

-- Full-text search on commons (trigger-based since to_tsvector is not immutable)
alter table public.knowledge_commons_entries
  add column search_vector tsvector;

create or replace function public.update_commons_search_vector()
returns trigger as $$
begin
  new.search_vector := to_tsvector('english',
    coalesce(new.anonymised_summary, '') || ' ' ||
    coalesce(array_to_string(new.domain_tags, ' '), '')
  );
  return new;
end;
$$ language plpgsql;

create trigger on_commons_entry_upsert
  before insert or update on public.knowledge_commons_entries
  for each row execute function public.update_commons_search_vector();

create index idx_commons_search on public.knowledge_commons_entries using gin(search_vector);
create index idx_commons_published on public.knowledge_commons_entries(published) where published = true;

-- Rating indexes
create index idx_ratings_conversation on public.ratings(conversation_id);
create index idx_ratings_subject on public.ratings(subject_user_id);
create index idx_ratings_visible on public.ratings(visible) where visible = true;
-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type public.notification_type not null,
  reference_id uuid, -- polymorphic FK
  reference_type text, -- table name of referenced entity
  channel public.notification_channel not null default 'in_app',
  title text not null,
  body text not null,
  read boolean not null default false,
  sent_at timestamptz not null default now(),
  delivered boolean not null default false -- email only
);

-- Notification preferences
create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  email_match_found boolean not null default true,
  email_new_message boolean not null default true,
  email_call_reminder boolean not null default true,
  email_summary_ready boolean not null default true,
  email_moderation_flag boolean not null default true, -- non-overridable
  email_request_status boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- Auto-create notification preferences for new users
create or replace function public.handle_new_user_preferences()
returns trigger as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_user_created_preferences
  after insert on public.users
  for each row execute function public.handle_new_user_preferences();

-- Indexes
create index idx_notifications_user on public.notifications(user_id);
create index idx_notifications_user_unread on public.notifications(user_id) where read = false;
create index idx_notifications_sent on public.notifications(sent_at desc);
-- Reports
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  reporter_user_id uuid not null references public.users(id),
  reason public.report_reason not null,
  detail text,
  status public.report_status not null default 'open',
  assigned_moderator_id uuid references public.users(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- Moderation actions (audit log)
create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_user_id uuid not null references public.users(id),
  target_user_id uuid references public.users(id),
  target_content_type text, -- 'request', 'message', 'biography', 'rating'
  target_content_id uuid,
  report_id uuid references public.reports(id),
  action public.moderation_action not null,
  reason text not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_reports_status on public.reports(status);
create index idx_reports_conversation on public.reports(conversation_id);
create index idx_reports_created on public.reports(created_at desc);
create index idx_moderation_actions_moderator on public.moderation_actions(moderator_user_id);
create index idx_moderation_actions_target on public.moderation_actions(target_user_id);
-- Expertise tags (controlled vocabulary)
create table public.expertise_tags (
  id uuid primary key default gen_random_uuid(),
  tag text not null unique,
  domain text not null, -- top-level grouping
  status public.tag_status not null default 'active',
  proposed_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index idx_expertise_tags_domain on public.expertise_tags(domain);
create index idx_expertise_tags_status on public.expertise_tags(status);
create index idx_expertise_tags_tag_trgm on public.expertise_tags using gin(tag extensions.gin_trgm_ops);
-- Payments
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  asker_user_id uuid not null references public.users(id),
  helper_user_id uuid not null references public.users(id),
  amount_cents integer not null,
  currency text not null default 'USD', -- ISO 4217
  tera_fee_cents integer not null, -- 15%
  helper_payout_cents integer not null, -- 85%
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  captured_at timestamptz,
  refunded_at timestamptz
);

create index idx_payments_conversation on public.payments(conversation_id);
create index idx_payments_asker on public.payments(asker_user_id);
create index idx_payments_helper on public.payments(helper_user_id);
create index idx_payments_status on public.payments(status);
-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.helper_profiles enable row level security;
alter table public.requests enable row level security;
alter table public.match_attempts enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_summaries enable row level security;
alter table public.scheduled_calls enable row level security;
alter table public.ratings enable row level security;
alter table public.knowledge_commons_entries enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.expertise_tags enable row level security;
alter table public.payments enable row level security;

-- ============================================================
-- USERS
-- ============================================================

-- Users can read their own full row
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

-- Public: read name, country, languages for profile display
create policy "users_select_public" on public.users
  for select using (true);

-- Users can update their own row
create policy "users_update_own" on public.users
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- HELPER PROFILES
-- ============================================================

-- Public read for active profiles
create policy "helper_profiles_select_public" on public.helper_profiles
  for select using (
    exists (
      select 1 from public.users
      where users.id = helper_profiles.user_id
      and users.account_status = 'active'
    )
  );

-- Helpers can insert their own profile
create policy "helper_profiles_insert_own" on public.helper_profiles
  for insert with check (auth.uid() = user_id);

-- Helpers can update their own profile
create policy "helper_profiles_update_own" on public.helper_profiles
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- REQUESTS
-- ============================================================

-- Askers can read their own requests
create policy "requests_select_own" on public.requests
  for select using (auth.uid() = asker_user_id);

-- Matched helpers can read the request they're matched to
create policy "requests_select_matched_helper" on public.requests
  for select using (
    exists (
      select 1 from public.match_attempts ma
      join public.helper_profiles hp on hp.id = ma.helper_profile_id
      where ma.request_id = requests.id
      and hp.user_id = auth.uid()
    )
  );

-- Askers can insert requests
create policy "requests_insert_own" on public.requests
  for insert with check (auth.uid() = asker_user_id);

-- Askers can update their own requests (confirm parsed summary)
create policy "requests_update_own" on public.requests
  for update using (auth.uid() = asker_user_id);

-- ============================================================
-- MATCH ATTEMPTS
-- ============================================================

-- Helpers can see match attempts directed at them
create policy "match_attempts_select_helper" on public.match_attempts
  for select using (
    exists (
      select 1 from public.helper_profiles hp
      where hp.id = match_attempts.helper_profile_id
      and hp.user_id = auth.uid()
    )
  );

-- Askers can see match attempts for their requests
create policy "match_attempts_select_asker" on public.match_attempts
  for select using (
    exists (
      select 1 from public.requests r
      where r.id = match_attempts.request_id
      and r.asker_user_id = auth.uid()
    )
  );

-- Helpers can update their response (accept/decline)
create policy "match_attempts_update_helper" on public.match_attempts
  for update using (
    exists (
      select 1 from public.helper_profiles hp
      where hp.id = match_attempts.helper_profile_id
      and hp.user_id = auth.uid()
    )
  );

-- ============================================================
-- CONVERSATIONS
-- ============================================================

-- Participants can read their conversations
create policy "conversations_select_participant" on public.conversations
  for select using (
    auth.uid() = asker_user_id or auth.uid() = helper_user_id
  );

-- Participants can update (mark complete, update activity)
create policy "conversations_update_participant" on public.conversations
  for update using (
    auth.uid() = asker_user_id or auth.uid() = helper_user_id
  );

-- ============================================================
-- CONVERSATION SUMMARIES
-- ============================================================

-- Participants can read summaries for their conversations
create policy "summaries_select_participant" on public.conversation_summaries
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_summaries.conversation_id
      and (c.asker_user_id = auth.uid() or c.helper_user_id = auth.uid())
    )
  );

-- ============================================================
-- SCHEDULED CALLS
-- ============================================================

-- Participants can read/insert/update calls for their conversations
create policy "scheduled_calls_select_participant" on public.scheduled_calls
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = scheduled_calls.conversation_id
      and (c.asker_user_id = auth.uid() or c.helper_user_id = auth.uid())
    )
  );

create policy "scheduled_calls_insert_participant" on public.scheduled_calls
  for insert with check (
    auth.uid() = proposed_by_user_id
  );

create policy "scheduled_calls_update_participant" on public.scheduled_calls
  for update using (
    exists (
      select 1 from public.conversations c
      where c.id = scheduled_calls.conversation_id
      and (c.asker_user_id = auth.uid() or c.helper_user_id = auth.uid())
    )
  );

-- ============================================================
-- RATINGS
-- ============================================================

-- Anyone can read visible ratings (for public profiles)
create policy "ratings_select_visible" on public.ratings
  for select using (visible = true);

-- Participants can read their own ratings (even before visible)
create policy "ratings_select_own" on public.ratings
  for select using (auth.uid() = author_user_id);

-- Participants can insert ratings
create policy "ratings_insert_own" on public.ratings
  for insert with check (auth.uid() = author_user_id);

-- ============================================================
-- KNOWLEDGE COMMONS
-- ============================================================

-- Public read for published entries
create policy "commons_select_published" on public.knowledge_commons_entries
  for select using (published = true);

-- Participants can read/update their own consent
create policy "commons_select_participant" on public.knowledge_commons_entries
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = knowledge_commons_entries.conversation_id
      and (c.asker_user_id = auth.uid() or c.helper_user_id = auth.uid())
    )
  );

create policy "commons_update_consent" on public.knowledge_commons_entries
  for update using (
    exists (
      select 1 from public.conversations c
      where c.id = knowledge_commons_entries.conversation_id
      and (c.asker_user_id = auth.uid() or c.helper_user_id = auth.uid())
    )
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

-- Users can only read their own notifications
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATION PREFERENCES
-- ============================================================

create policy "notification_prefs_select_own" on public.notification_preferences
  for select using (auth.uid() = user_id);

create policy "notification_prefs_update_own" on public.notification_preferences
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- REPORTS
-- ============================================================

-- Reporters can see their own reports
create policy "reports_select_own" on public.reports
  for select using (auth.uid() = reporter_user_id);

-- Moderators can see all reports
create policy "reports_select_moderator" on public.reports
  for select using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role in ('moderator', 'senior_moderator')
    )
  );

-- Any user can create a report
create policy "reports_insert_any" on public.reports
  for insert with check (auth.uid() = reporter_user_id);

-- Moderators can update reports
create policy "reports_update_moderator" on public.reports
  for update using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role in ('moderator', 'senior_moderator')
    )
  );

-- ============================================================
-- MODERATION ACTIONS
-- ============================================================

-- Moderators can read and insert
create policy "mod_actions_select_moderator" on public.moderation_actions
  for select using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role in ('moderator', 'senior_moderator')
    )
  );

create policy "mod_actions_insert_moderator" on public.moderation_actions
  for insert with check (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role in ('moderator', 'senior_moderator')
    )
  );

-- ============================================================
-- EXPERTISE TAGS
-- ============================================================

-- Public read for active tags
create policy "expertise_tags_select_active" on public.expertise_tags
  for select using (status = 'active');

-- Moderators can read all tags (including proposed)
create policy "expertise_tags_select_moderator" on public.expertise_tags
  for select using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role in ('moderator', 'senior_moderator')
    )
  );

-- Moderators can update tags (approve/reject)
create policy "expertise_tags_update_moderator" on public.expertise_tags
  for update using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role in ('moderator', 'senior_moderator')
    )
  );

-- ============================================================
-- PAYMENTS
-- ============================================================

-- Participants can read their payments
create policy "payments_select_participant" on public.payments
  for select using (
    auth.uid() = asker_user_id or auth.uid() = helper_user_id
  );
-- Vector similarity search function for matching helpers to requests
create or replace function public.match_helpers(
  query_embedding extensions.vector(1024),
  match_threshold float default 0.3,
  match_count int default 20
)
returns table (
  helper_profile_id uuid,
  similarity float
)
language sql stable
as $$
  select
    hp.id as helper_profile_id,
    1 - (hp.expertise_embedding <=> query_embedding) as similarity
  from public.helper_profiles hp
  join public.users u on u.id = hp.user_id
  where hp.availability_status != 'unavailable'
    and u.account_status = 'active'
    and hp.expertise_embedding is not null
    and 1 - (hp.expertise_embedding <=> query_embedding) > match_threshold
  order by hp.expertise_embedding <=> query_embedding
  limit match_count;
$$;

-- HNSW index for fast vector search (effective once helper count grows)
create index idx_helper_expertise_embedding
  on public.helper_profiles
  using hnsw (expertise_embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Index on request embeddings (for potential reverse lookups)
create index idx_request_embedding
  on public.requests
  using hnsw (request_embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);
-- Note: pg_cron and pg_net must be enabled on the Supabase project.
-- These jobs invoke Edge Functions via pg_net HTTP calls.
-- The actual Edge Function URLs and service role key must be configured
-- after the Supabase project is created.

-- Placeholder: cascade-notification (every 5 minutes)
-- Checks for timed-out pending match_attempts and advances to next helper
-- select cron.schedule(
--   'cascade-notification',
--   '*/5 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://YOUR_PROJECT.supabase.co/functions/v1/cascade-notification',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- Placeholder: retry-unmatched (every hour)
-- Re-runs matching for requests with status 'unmatched' or stale 'matching'
-- select cron.schedule(
--   'retry-unmatched',
--   '0 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://YOUR_PROJECT.supabase.co/functions/v1/retry-unmatched',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- Placeholder: auto-close-conversations (daily at 03:00 UTC)
-- Sends 27-day inactivity warning and closes at 30 days
-- select cron.schedule(
--   'auto-close-conversations',
--   '0 3 * * *',
--   $$
--   select net.http_post(
--     url := 'https://YOUR_PROJECT.supabase.co/functions/v1/auto-close-conversations',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- Note: Uncomment and configure these after Supabase project setup.
-- Replace YOUR_PROJECT and YOUR_SERVICE_ROLE_KEY with actual values.
-- These can also be configured via the Supabase dashboard under
-- Database > Extensions > pg_cron.
-- Trigger: when a request status changes to 'confirmed', invoke the matching engine.
-- This uses pg_net to call the run-matching Edge Function.
-- Note: pg_net must be enabled and the function URL configured.

create or replace function public.trigger_matching_on_confirm()
returns trigger as $$
declare
  base_url text;
  service_key text;
begin
  -- Only fire when status changes TO 'confirmed'
  if new.status = 'confirmed' and (old.status is null or old.status != 'confirmed') then
    -- Get the Supabase URL from a config table or hardcode for now
    -- In production, these would come from vault secrets or a config table
    base_url := current_setting('app.settings.supabase_url', true);
    service_key := current_setting('app.settings.service_role_key', true);

    -- If settings aren't configured, skip silently
    -- The retry-unmatched cron will pick it up
    if base_url is not null and service_key is not null then
      perform net.http_post(
        url := base_url || '/functions/v1/run-matching',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || service_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object('requestId', new.id)
      );
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Only create the trigger if it doesn't already exist
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'on_request_confirmed'
  ) then
    create trigger on_request_confirmed
      after update on public.requests
      for each row
      when (new.status = 'confirmed')
      execute function public.trigger_matching_on_confirm();
  end if;
end;
$$;
-- Fallback messaging table for development without Stream Chat keys.
-- In production, Stream Chat is the primary messaging infrastructure.
-- This table provides a functional chat experience during development.

create table if not exists public.conversation_messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  user_name text not null default '',
  text text not null,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create index idx_conversation_messages_conversation on public.conversation_messages(conversation_id, created_at);

-- Enable realtime for this table
alter publication supabase_realtime add table public.conversation_messages;

-- RLS
alter table public.conversation_messages enable row level security;

-- Users can read messages in conversations they participate in
create policy "Users can read messages in their conversations"
  on public.conversation_messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_messages.conversation_id
      and (c.asker_user_id = auth.uid() or c.helper_user_id = auth.uid())
    )
  );

-- Users can insert messages in active conversations they participate in
create policy "Users can send messages in their active conversations"
  on public.conversation_messages for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_messages.conversation_id
      and c.status = 'active'
      and (c.asker_user_id = auth.uid() or c.helper_user_id = auth.uid())
    )
  );
-- Invites table
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  email TEXT NOT NULL,
  role_hint TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  institutional_bulk_code TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);

CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_invites_invited_by ON invites(invited_by);
CREATE INDEX idx_invites_status ON invites(status);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institutional_account_id TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_account ON api_keys(institutional_account_id);

-- AI Jobs table (for job queue tracking and cost monitoring)
CREATE TABLE IF NOT EXISTS ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL CHECK (job_type IN (
    'request_parse', 'helper_embed', 'match_notify',
    'conversation_summary', 'commons_process', 'card_generate'
  )),
  priority INTEGER NOT NULL DEFAULT 4 CHECK (priority BETWEEN 1 AND 4),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'complete', 'failed')),
  entity_type TEXT,
  entity_id UUID,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  token_usage INTEGER DEFAULT 0,
  cost_usd NUMERIC(10, 6) DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_jobs_status ON ai_jobs(status);
CREATE INDEX idx_ai_jobs_priority ON ai_jobs(priority);
CREATE INDEX idx_ai_jobs_completed ON ai_jobs(completed_at);
CREATE INDEX idx_ai_jobs_entity ON ai_jobs(entity_type, entity_id);

-- Knowledge Commons entries table
CREATE TABLE IF NOT EXISTS knowledge_commons_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  domain_tags TEXT[] NOT NULL DEFAULT '{}',
  geographic_context_tags TEXT[] NOT NULL DEFAULT '{}',
  anonymised_summary TEXT NOT NULL,
  tera_verified BOOLEAN NOT NULL DEFAULT true,
  seo_slug TEXT NOT NULL UNIQUE,
  typesense_document_id TEXT,
  page_views INTEGER NOT NULL DEFAULT 0,
  date_published TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_commons_seo_slug ON knowledge_commons_entries(seo_slug);
CREATE INDEX idx_commons_conversation ON knowledge_commons_entries(conversation_id);
CREATE INDEX idx_commons_domain ON knowledge_commons_entries USING GIN(domain_tags);

-- Moderation reports table
CREATE TABLE IF NOT EXISTS moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  reporter_name TEXT,
  reported_entity_type TEXT NOT NULL,
  reported_entity_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  reviewed_by UUID REFERENCES auth.users(id),
  action_taken TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_moderation_status ON moderation_reports(status);

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pwa_push_subscription JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_user_ids UUID[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_score NUMERIC(5,3) DEFAULT 0.5;
ALTER TABLE users ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT DEFAULT 0;

-- Add missing columns to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS video_platform TEXT DEFAULT 'native';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS external_meeting_link TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS external_meeting_id TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS calendar_invite_sent BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS transcript TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS transcript_source TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS transcript_retrieved_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS transcript_retrieval_status TEXT DEFAULT 'pending';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS shareable_card_consent_asker BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS shareable_card_consent_helper BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS shareable_card_url TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS follow_up_thread_id UUID;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_processing_cost_usd NUMERIC(10,6) DEFAULT 0;

-- Add leaderboard columns to helper_profiles
ALTER TABLE helper_profiles ADD COLUMN IF NOT EXISTS leaderboard_conversations_count INTEGER DEFAULT 0;
ALTER TABLE helper_profiles ADD COLUMN IF NOT EXISTS leaderboard_geographies_count INTEGER DEFAULT 0;
ALTER TABLE helper_profiles ADD COLUMN IF NOT EXISTS leaderboard_domains_count INTEGER DEFAULT 0;
ALTER TABLE helper_profiles ADD COLUMN IF NOT EXISTS leaderboard_resolution_rate NUMERIC(5,4) DEFAULT 0;
ALTER TABLE helper_profiles ADD COLUMN IF NOT EXISTS reputation_initialised BOOLEAN DEFAULT false;
ALTER TABLE helper_profiles ADD COLUMN IF NOT EXISTS first_five_conversations_complete BOOLEAN DEFAULT false;

-- Webhook logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'received' CHECK (processing_status IN ('received', 'processed', 'failed')),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_logs_platform ON webhook_logs(platform);

-- RLS policies for new tables
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_commons_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Knowledge commons: public read
CREATE POLICY "Anyone can read commons entries"
  ON knowledge_commons_entries FOR SELECT
  USING (true);

-- Invites: users can see their own
CREATE POLICY "Users can view own invites"
  ON invites FOR SELECT
  USING (auth.uid() = invited_by);

CREATE POLICY "Users can create invites"
  ON invites FOR INSERT
  WITH CHECK (auth.uid() = invited_by);
