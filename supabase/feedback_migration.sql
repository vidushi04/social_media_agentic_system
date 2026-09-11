-- Product feedback form ("Send feedback" sidebar item).
-- Run in Supabase SQL Editor after the base schema.sql.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  rating smallint check (rating between 1 and 5),
  most_useful_feature text,
  improvement_suggestion text,
  would_recommend text check (would_recommend in ('yes', 'no', 'maybe')),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;
-- No anon policies: inserts go through /api/feedback-submit (service role).

create index if not exists feedback_created_at_idx
  on public.feedback (created_at desc);
