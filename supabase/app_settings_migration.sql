-- Global app settings (admin-controlled). Run once in Supabase SQL Editor.

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
-- No client policies — read/write via /api routes using service role only.

insert into public.app_settings (key, value)
values ('mock_mode_enabled', 'false'::jsonb)
on conflict (key) do nothing;
