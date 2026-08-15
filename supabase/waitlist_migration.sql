-- Waitlist / early-access migration.
-- Run in Supabase SQL Editor after the base schema.sql.

-- ---------------------------------------------------------------------------
-- Profiles: track whether a signed-in user may use the app
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists access_status text not null default 'pending';

alter table public.profiles
  add column if not exists approved_at timestamptz;

-- Backfill constraint (safe if re-run)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_access_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_access_status_check
      check (access_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

-- Users may update their own profile fields but not self-approve.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and access_status = (
      select p.access_status from public.profiles p where p.user_id = auth.uid()
    )
  );

-- Only approved users may save analyses (protects Gemini credits).
drop policy if exists "analyses_insert_own" on public.analyses;
create policy "analyses_insert_own" on public.analyses
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.access_status = 'approved'
    )
  );

-- ---------------------------------------------------------------------------
-- Pre-signup access requests (apply from login screen)
-- ---------------------------------------------------------------------------

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

alter table public.access_requests enable row level security;
-- No anon policies: inserts go through /api/waitlist-apply (service role).

-- Grandfather existing users so this migration does not lock out current accounts.
update public.profiles
set access_status = 'approved', approved_at = coalesce(approved_at, now())
where access_status = 'pending';

-- ---------------------------------------------------------------------------
-- Auto-approve profiles when email was already approved on the waitlist
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
