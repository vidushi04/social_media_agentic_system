-- Allow guest / local-mode analyses (no signed-in user) so Admin can see every run.
-- Run once in the Supabase SQL Editor.

alter table public.analyses
  alter column user_id drop not null;

create index if not exists analyses_created_at_idx
  on public.analyses (created_at desc);
