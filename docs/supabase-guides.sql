create table if not exists public.guides_library (
  id text primary key,
  creators jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid null
);

insert into public.guides_library (id, creators)
values ('main', '[]'::jsonb)
on conflict (id) do nothing;

alter table public.guides_library enable row level security;

drop policy if exists "deny direct guides access" on public.guides_library;

create policy "deny direct guides access"
on public.guides_library
for all
to anon, authenticated
using (false)
with check (false);
