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
