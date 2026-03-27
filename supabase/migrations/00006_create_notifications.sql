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
