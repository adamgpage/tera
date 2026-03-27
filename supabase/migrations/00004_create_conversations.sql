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
