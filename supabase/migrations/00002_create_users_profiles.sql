-- Users table (extends auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  country text not null, -- ISO 3166-1 alpha-2
  region text,
  languages text[] not null default '{}', -- ISO 639-1 codes
  is_helper boolean not null default false,
  role public.user_role not null default 'user',
  profile_photo_url text,
  account_status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create public.users row when auth.users is created
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, country, languages)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'country', ''),
    case
      when new.raw_user_meta_data->>'languages' is not null
      then string_to_array(new.raw_user_meta_data->>'languages', ',')
      else '{}'
    end
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at auto-update
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Helper profiles
create table public.helper_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  biography text not null,
  expertise_tags text[] not null default '{}',
  expertise_embedding extensions.vector(1024),
  availability_status public.availability_status not null default 'available',
  paid_tier_active boolean not null default false,
  session_rate_cents integer,
  session_rate_currency text default 'USD', -- ISO 4217
  stripe_connect_account_id text,
  credential_upload_url text,
  linkedin_url text,
  verified_badge boolean not null default false,
  reputation_score real not null default 0.5, -- 0.0 to 1.0
  total_conversations integer not null default 0,
  resolved_rate real not null default 0.0,
  response_reliability real not null default 1.0,
  public_profile_slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger helper_profiles_updated_at
  before update on public.helper_profiles
  for each row execute function public.set_updated_at();

-- Indexes
create index idx_helper_profiles_user_id on public.helper_profiles(user_id);
create index idx_helper_profiles_slug on public.helper_profiles(public_profile_slug);
create index idx_helper_profiles_availability on public.helper_profiles(availability_status);
create index idx_users_account_status on public.users(account_status);
