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
