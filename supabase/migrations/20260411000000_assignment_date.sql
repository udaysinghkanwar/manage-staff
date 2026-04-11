-- Add assigned_date to job_assignments to track which calendar day
-- the assignment is active for. Workers are blocked for that entire day
-- regardless of whether the job status changes to 'filled'.
alter table public.job_assignments
  add column assigned_date date not null default current_date;

-- Back-fill existing rows: use the job's job_date if set, else fall back to
-- the timestamp the assignment was created.
update public.job_assignments ja
set    assigned_date = coalesce(j.job_date, ja.assigned_at::date)
from   public.jobs j
where  ja.job_id = j.id;

-- pg_cron: delete assignments whose date has passed in Eastern time.
-- Runs at 5 AM UTC = midnight EST (shifts to 4 AM UTC during EDT, but the
-- WHERE condition uses America/New_York so it is always correct regardless).
select cron.schedule(
  'cleanup-expired-assignments',
  '0 5 * * *',
  $$delete from public.job_assignments
    where assigned_date < (now() at time zone 'America/New_York')::date$$
);
