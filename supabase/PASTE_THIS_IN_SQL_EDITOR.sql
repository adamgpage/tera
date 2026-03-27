-- Vector similarity search function for matching helpers to requests
-- SET search_path so pgvector operators (<=> etc.) resolve correctly on Supabase
create or replace function public.match_helpers(
  query_embedding extensions.vector(1024),
  match_threshold float default 0.3,
  match_count int default 20
)
returns table (
  helper_profile_id uuid,
  similarity float
)
language plpgsql stable
set search_path = public, extensions
as $$
begin
  return query
  select
    hp.id as helper_profile_id,
    (1 - (hp.expertise_embedding <=> query_embedding))::float as similarity
  from public.helper_profiles hp
  join public.users u on u.id = hp.user_id
  where hp.availability_status != 'unavailable'
    and u.account_status = 'active'
    and hp.expertise_embedding is not null
    and 1 - (hp.expertise_embedding <=> query_embedding) > match_threshold
  order by hp.expertise_embedding <=> query_embedding
  limit match_count;
end;
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

-- Add missing columns to knowledge_commons_entries (table already created in migration 5)
ALTER TABLE knowledge_commons_entries ADD COLUMN IF NOT EXISTS seo_slug TEXT UNIQUE;
ALTER TABLE knowledge_commons_entries ADD COLUMN IF NOT EXISTS typesense_document_id TEXT;
ALTER TABLE knowledge_commons_entries ADD COLUMN IF NOT EXISTS page_views INTEGER NOT NULL DEFAULT 0;
ALTER TABLE knowledge_commons_entries ADD COLUMN IF NOT EXISTS date_published TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_commons_domain ON knowledge_commons_entries USING GIN(domain_tags);

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
