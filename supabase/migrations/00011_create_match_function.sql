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
