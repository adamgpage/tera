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
