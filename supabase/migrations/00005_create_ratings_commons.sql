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
