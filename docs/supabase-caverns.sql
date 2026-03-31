create extension if not exists pgcrypto;

create table if not exists public.cavern_clears (
  id uuid primary key default gen_random_uuid(),
  relic_id text not null,
  relic_key text not null,
  clear_time text not null,
  clear_time_key text not null,
  characters jsonb not null default '[]'::jsonb,
  characters_key text not null,
  substats jsonb not null default '[]'::jsonb,
  substats_key text not null,
  main_stat text,
  reporters jsonb not null default '[]'::jsonb,
  reports jsonb not null default '[]'::jsonb,
  verified_count integer not null default 1 check (verified_count >= 0),
  likes jsonb not null default '[]'::jsonb,
  first_reported timestamptz not null default now(),
  last_reported timestamptz not null default now()
);

create table if not exists public.cavern_clears_archive (
  id uuid primary key default gen_random_uuid(),
  week_key text not null unique,
  week_start timestamptz not null,
  week_end timestamptz not null,
  archived_at timestamptz not null default now(),
  reason text not null default 'weekly_reset',
  source_count integer not null default 0 check (source_count >= 0),
  payload jsonb not null default '[]'::jsonb
);

create table if not exists public.cavern_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null,
  route text not null default '',
  method text not null default '',
  actor_type text not null default 'unknown',
  actor_id text,
  week_key text,
  rows_before integer,
  rows_after integer,
  details jsonb not null default '{}'::jsonb
);

create unique index if not exists cavern_clears_variant_unique
on public.cavern_clears (relic_key, clear_time_key, characters_key, substats_key);

create index if not exists cavern_clears_archive_week_start_idx
on public.cavern_clears_archive (week_start desc);

create index if not exists cavern_audit_log_created_at_idx
on public.cavern_audit_log (created_at desc);

alter table public.cavern_clears replica identity full;
alter table public.cavern_clears enable row level security;
alter table public.cavern_clears_archive replica identity full;
alter table public.cavern_clears_archive enable row level security;
alter table public.cavern_audit_log replica identity full;
alter table public.cavern_audit_log enable row level security;

drop policy if exists "deny direct cavern access" on public.cavern_clears;
drop policy if exists "deny direct cavern archive access" on public.cavern_clears_archive;
drop policy if exists "deny direct cavern audit access" on public.cavern_audit_log;

create policy "deny direct cavern access"
on public.cavern_clears
for all
to anon, authenticated
using (false)
with check (false);

create policy "deny direct cavern archive access"
on public.cavern_clears_archive
for all
to anon, authenticated
using (false)
with check (false);

create policy "deny direct cavern audit access"
on public.cavern_audit_log
for all
to anon, authenticated
using (false)
with check (false);
