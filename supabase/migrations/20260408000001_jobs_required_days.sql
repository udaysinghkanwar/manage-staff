-- Add optional required_days to jobs table.
-- Used to match part-time workers whose available_days overlap with the job's days.
-- Null means the job runs any day (full-time workers always qualify; part-time are shown regardless).
alter table public.jobs
  add column required_days text[]
  check (
    required_days is null
    or required_days <@ array['mon','tue','wed','thu','fri','sat','sun']
  );
