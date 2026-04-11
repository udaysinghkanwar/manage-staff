-- Companies table. One address per company — when a company is picked for
-- a job, the job's location is auto-filled from the company address.
create table public.companies (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null unique,
  address    text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies enable row level security;

create policy "authenticated full access" on public.companies
  for all
  to authenticated
  using (true)
  with check (true);

create trigger companies_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- Link jobs to a company. Nullable so existing jobs remain valid;
-- set null on delete so cascading a company deletion does not lose jobs.
alter table public.jobs
  add column company_id uuid references public.companies(id) on delete set null;
