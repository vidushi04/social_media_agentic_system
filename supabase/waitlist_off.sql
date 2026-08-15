-- Disable waitlist enforcement (keeps tables/columns for later).
-- Run in Supabase SQL Editor when VITE_WAITLIST_ENABLED is not set.

update public.profiles
set access_status = 'approved', approved_at = coalesce(approved_at, now());

drop policy if exists "analyses_insert_own" on public.analyses;
create policy "analyses_insert_own" on public.analyses
  for insert with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, access_status, approved_at)
  values (new.id, new.email, 'approved', now())
  on conflict (user_id) do nothing;
  return new;
end;
$$;
