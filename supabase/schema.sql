-- Dnevnik ritma — cloud backup schema.
-- Run this once in Supabase SQL Editor (Project → SQL Editor → New query).
-- Email/password auth is on by default in Supabase, nothing else to enable.
-- If "Confirm email" is on under Authentication → Providers → Email, she'll
-- need to click the confirmation link before her first login works.

create table if not exists sync_data (
  user_id uuid not null default auth.uid(),
  store text not null,
  key text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, store, key)
);

alter table sync_data enable row level security;

create policy "Users manage their own data"
  on sync_data
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
