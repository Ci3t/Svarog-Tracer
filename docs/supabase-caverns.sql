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

create unique index if not exists cavern_clears_variant_unique
on public.cavern_clears (relic_key, clear_time_key, characters_key, substats_key);

alter table public.cavern_clears replica identity full;
alter table public.cavern_clears enable row level security;

drop policy if exists "deny direct cavern access" on public.cavern_clears;

create policy "deny direct cavern access"
on public.cavern_clears
for all
to anon, authenticated
using (false)
with check (false);
