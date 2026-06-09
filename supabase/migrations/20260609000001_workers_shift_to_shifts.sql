-- workers.shift (text) → workers.shifts (text[])
-- A worker may be available for multiple shifts.
BEGIN;

ALTER TABLE workers ADD COLUMN shifts text[]
  CHECK (
    shifts IS NULL
    OR shifts <@ ARRAY['day','afternoon','night']
  );

-- Migrate existing single-value data: wrap in an array, leave nulls as null.
UPDATE workers
SET shifts = CASE
  WHEN shift IS NULL THEN NULL
  ELSE ARRAY[shift]
END;

ALTER TABLE workers DROP COLUMN shift;

COMMIT;
