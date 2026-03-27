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
