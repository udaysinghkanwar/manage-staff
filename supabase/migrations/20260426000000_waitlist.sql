-- Landing-page waitlist signups (public CTA section).
create table public.waitlist (
  id         uuid        primary key default gen_random_uuid(),
  email      text        not null unique,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Authenticated dashboard users can read/manage; public inserts go through a
-- Server Action using the service role key (bypasses RLS).
create policy "authenticated full access" on public.waitlist
  for all
  to authenticated
  using (true)
  with check (true);
