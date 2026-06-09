-- Add age column to workers (integer, nullable)
ALTER TABLE workers ADD COLUMN age integer CHECK (age >= 18 AND age < 120);
