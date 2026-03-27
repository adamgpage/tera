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
