-- Feature onboarding status on profiles.
-- Run in Supabase SQL Editor after the base schema.sql.
-- Safe to re-run.

alter table public.profiles
  add column if not exists onboarding_status text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_onboarding_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_onboarding_status_check
      check (onboarding_status in ('pending', 'completed', 'skipped'));
  end if;
end $$;

update public.profiles
set onboarding_status = 'skipped'
where onboarding_status is null;

alter table public.profiles
  alter column onboarding_status set default 'pending';

alter table public.profiles
  alter column onboarding_status set not null;
