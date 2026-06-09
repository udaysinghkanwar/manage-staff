-- Add main_intersection text column for worker location detail within a city
-- (e.g. "Bramalea and Queen St"). Free-form, nullable.
ALTER TABLE workers ADD COLUMN main_intersection text;
