-- Remove the cron job that was deleting job_assignment records.
-- History must be preserved so past jobs still show their assigned workers.
-- Workers are marked unassigned naturally once assigned_date < today
-- (handled in application code) — no deletion required.
select cron.unschedule('cleanup-expired-assignments');
