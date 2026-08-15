-- Trellis multi-tenant schema.
-- Run this once in the Supabase project's SQL editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run: uses `if not exists` / `create or replace` / `on conflict`.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  youtube_username text,
  youtube_username_confirmed boolean not null default false,
  access_status text not null default 'pending'
    check (access_status in ('pending', 'approved', 'rejected')),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  display_name text,
  message text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create unique index if not exists access_requests_email_lower_idx
  on public.access_requests (lower(email));

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_url text not null,
  data_collector jsonb,
  deconstructor jsonb,
  audience jsonb,
  pattern jsonb,
  coach jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analyses_user_id_created_at_idx
  on public.analyses (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row-level security: every regular (anon-key) request is scoped to auth.uid().
-- The service-role key used by the admin API bypasses RLS entirely by design.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.analyses enable row level security;
alter table public.access_requests enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and access_status = (
      select p.access_status from public.profiles p where p.user_id = auth.uid()
    )
  );

drop policy if exists "analyses_select_own" on public.analyses;
create policy "analyses_select_own" on public.analyses
  for select using (auth.uid() = user_id);

drop policy if exists "analyses_insert_own" on public.analyses;
create policy "analyses_insert_own" on public.analyses
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.access_status = 'approved'
    )
  );

drop policy if exists "analyses_delete_own" on public.analyses;
create policy "analyses_delete_own" on public.analyses
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new Supabase Auth user signs up.
-- SECURITY DEFINER: runs before the new user has a session/JWT, so it must
-- bypass RLS to perform the insert.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  initial_status text := 'pending';
begin
  if exists (
    select 1 from public.access_requests ar
    where lower(ar.email) = lower(new.email) and ar.status = 'approved'
  ) then
    initial_status := 'approved';
  end if;

  insert into public.profiles (user_id, email, access_status, approved_at)
  values (
    new.id,
    new.email,
    initial_status,
    case when initial_status = 'approved' then now() else null end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Global app settings (admin-controlled via /api/admin-settings)
-- ---------------------------------------------------------------------------

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

insert into public.app_settings (key, value)
values ('mock_mode_enabled', 'false'::jsonb)
on conflict (key) do nothing;
