-- Add job_type column (on-call or full-time)
ALTER TABLE jobs ADD COLUMN job_type text NOT NULL DEFAULT 'on-call';

-- Make assigned_date nullable for full-time assignments (permanent)
ALTER TABLE job_assignments ALTER COLUMN assigned_date DROP NOT NULL;
