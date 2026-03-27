-- Zone Tracker schema (V1)
-- Storage target: Supabase Postgres

create extension if not exists pgcrypto;

create table if not exists public.zone_epochs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  calendar_week text not null,
  created_by_flag boolean not null default false,
  previous_epoch_id bigint null references public.zone_epochs(id),
  is_current boolean not null default false
);

create unique index if not exists zone_epochs_one_current_idx
  on public.zone_epochs (is_current)
  where is_current = true;

create index if not exists zone_epochs_created_at_desc_idx
  on public.zone_epochs (created_at desc);

create table if not exists public.zone_runs (
  id uuid primary key default gen_random_uuid(),
  submitted_at timestamptz not null default now(),
  epoch_id bigint not null references public.zone_epochs(id),
  user_id uuid not null,
  slot_order int[] not null,
  char_names text[] not null,
  cavern text null,
  outcome text not null,
  char_sum int not null,
  char_xor int not null,
  char_slot int not null,
  xor_slot_key text not null,
  notes text null,
  clear_time_s int null,
  constraint zone_runs_slot_order_len_chk check (array_length(slot_order, 1) = 4),
  constraint zone_runs_char_names_len_chk check (array_length(char_names, 1) = 4),
  constraint zone_runs_outcome_chk check (
    outcome in (
      'spd-double-crit',
      'double-crit',
      'spd-one-crit',
      'one-crit',
      'effect-junk',
      'flat-junk',
      'mixed'
    )
  ),
  constraint zone_runs_notes_len_chk check (notes is null or char_length(notes) <= 200)
);

create index if not exists zone_runs_epoch_key_idx
  on public.zone_runs (epoch_id, xor_slot_key);

create index if not exists zone_runs_epoch_submitted_desc_idx
  on public.zone_runs (epoch_id, submitted_at desc);

create index if not exists zone_runs_user_submitted_desc_idx
  on public.zone_runs (user_id, submitted_at desc);

create index if not exists zone_runs_epoch_outcome_idx
  on public.zone_runs (epoch_id, outcome);

create table if not exists public.zone_epoch_flags (
  id uuid primary key default gen_random_uuid(),
  epoch_id bigint not null references public.zone_epochs(id),
  user_id uuid not null,
  notes text null,
  created_at timestamptz not null default now(),
  constraint zone_epoch_flags_unique_user_epoch unique (epoch_id, user_id)
);

create index if not exists zone_epoch_flags_epoch_created_desc_idx
  on public.zone_epoch_flags (epoch_id, created_at desc);

create table if not exists public.zone_likes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  epoch_id bigint not null references public.zone_epochs(id),
  xor_slot_key text not null,
  user_id uuid not null,
  constraint zone_likes_unique_user_zone unique (epoch_id, xor_slot_key, user_id)
);

create index if not exists zone_likes_epoch_zone_idx
  on public.zone_likes (epoch_id, xor_slot_key);

create index if not exists zone_likes_user_created_desc_idx
  on public.zone_likes (user_id, created_at desc);

alter table public.zone_epochs enable row level security;
alter table public.zone_runs enable row level security;
alter table public.zone_epoch_flags enable row level security;
alter table public.zone_likes enable row level security;

-- Epoch metadata can be read by authenticated users.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'zone_epochs'
      and policyname = 'zone_epochs_select_auth'
  ) then
    create policy zone_epochs_select_auth
      on public.zone_epochs
      for select
      to authenticated
      using (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'zone_likes'
      and policyname = 'zone_likes_select_own'
  ) then
    create policy zone_likes_select_own
      on public.zone_likes
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'zone_likes'
      and policyname = 'zone_likes_insert_own'
  ) then
    create policy zone_likes_insert_own
      on public.zone_likes
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'zone_likes'
      and policyname = 'zone_likes_delete_own'
  ) then
    create policy zone_likes_delete_own
      on public.zone_likes
      for delete
      to authenticated
      using (user_id = auth.uid());
  end if;
end
$$;

-- Users can read their own submissions if needed for debugging/admin tools.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'zone_runs'
      and policyname = 'zone_runs_select_own'
  ) then
    create policy zone_runs_select_own
      on public.zone_runs
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end
$$;

-- Users can insert only with their own uid.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'zone_runs'
      and policyname = 'zone_runs_insert_own'
  ) then
    create policy zone_runs_insert_own
      on public.zone_runs
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;
end
$$;

-- Users can read their own epoch flags.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'zone_epoch_flags'
      and policyname = 'zone_epoch_flags_select_own'
  ) then
    create policy zone_epoch_flags_select_own
      on public.zone_epoch_flags
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end
$$;

-- Users can insert only their own epoch flags.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'zone_epoch_flags'
      and policyname = 'zone_epoch_flags_insert_own'
  ) then
    create policy zone_epoch_flags_insert_own
      on public.zone_epoch_flags
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;
end
$$;
