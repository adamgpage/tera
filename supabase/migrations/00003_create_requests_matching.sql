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
