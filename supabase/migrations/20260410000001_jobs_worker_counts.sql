alter table public.jobs
  add column required_male   integer not null default 0,
  add column required_female integer not null default 0;
