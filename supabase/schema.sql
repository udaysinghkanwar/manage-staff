-- =============================================================
-- Staffing Agency Management Dashboard — Supabase Schema
-- Run this in the Supabase SQL editor
-- =============================================================

-- ---------------------------------------------------------------
-- WORKERS
-- ---------------------------------------------------------------
create table public.workers (
  id                uuid        primary key default gen_random_uuid(),
  name              text        not null,
  phone             text        not null unique,
  city              text,
  main_intersection text,
  age               integer     check (age >= 18 and age < 120),
  gender            text        check (gender in ('male', 'female')),
  shifts            text[]      check (
                                  shifts is null
                                  or shifts <@ array['day','afternoon','night']
                                ),
  availability_type text        check (availability_type in ('full-time', 'part-time')),
  available_days    text[]      -- only populated when part-time; values: mon/tue/wed/thu/fri/sat/sun
                                check (
                                  available_days is null
                                  or available_days <@ array['mon','tue','wed','thu','fri','sat','sun']
                                ),
  status            text        not null default 'active'
                                check (status in ('active', 'inactive')),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- JOBS
-- ---------------------------------------------------------------
create table public.jobs (
  id                    uuid        primary key default gen_random_uuid(),
  title                 text        not null,
  location              text        not null,
  shift                 text        check (shift in ('day', 'afternoon', 'night')),
  description           text,
  safety_shoes_required boolean     not null default false,
  status                text        not null default 'open'
                                    check (status in ('open', 'filled', 'cancelled')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- JOB ASSIGNMENTS
-- Assigning a worker to a job removes them from availability pool.
-- ---------------------------------------------------------------
create table public.job_assignments (
  id          uuid        primary key default gen_random_uuid(),
  job_id      uuid        not null references public.jobs(id) on delete cascade,
  worker_id   uuid        not null references public.workers(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (job_id, worker_id)
);

-- ---------------------------------------------------------------
-- JOB BROADCASTS
-- Tracks broadcast messages sent to workers for a specific job.
-- ---------------------------------------------------------------
create table public.job_broadcasts (
  id           uuid        primary key default gen_random_uuid(),
  job_id       uuid        not null references public.jobs(id) on delete cascade,
  worker_id    uuid        not null references public.workers(id) on delete cascade,
  response     text        not null default 'pending'
               check (response in ('pending', 'yes', 'no')),
  sent_at      timestamptz not null default now(),
  responded_at timestamptz
);

-- ---------------------------------------------------------------
-- MESSAGES
-- WhatsApp message log (inbound and outbound).
-- ---------------------------------------------------------------
create table public.messages (
  id                      uuid        primary key default gen_random_uuid(),
  worker_id               uuid        references public.workers(id) on delete set null,
  phone                   text        not null,
  direction               text        not null check (direction in ('inbound', 'outbound')),
  body                    text,
  is_availability_message boolean     not null default false,
  created_at              timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- WAITLIST
-- Landing-page signups; populated by a Server Action using the
-- service role key (anon role has no insert policy).
-- ---------------------------------------------------------------
create table public.waitlist (
  id         uuid        primary key default gen_random_uuid(),
  email      text        not null unique,
  created_at timestamptz not null default now()
);

-- =============================================================
-- UPDATED_AT TRIGGER
-- =============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workers_updated_at
  before update on public.workers
  for each row execute function public.set_updated_at();

create trigger jobs_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
alter table public.workers        enable row level security;
alter table public.jobs           enable row level security;
alter table public.job_assignments enable row level security;
alter table public.job_broadcasts  enable row level security;
alter table public.messages        enable row level security;
alter table public.waitlist        enable row level security;

-- Authenticated users have full access; no public access.
create policy "authenticated full access" on public.workers
  for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated full access" on public.jobs
  for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated full access" on public.job_assignments
  for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated full access" on public.job_broadcasts
  for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated full access" on public.messages
  for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated full access" on public.waitlist
  for all
  to authenticated
  using (true)
  with check (true);
