-- Rename workers.address → workers.city
-- The column has always stored a "City, Province" string from CityPicker,
-- never a full street address. Renaming for clarity.
ALTER TABLE workers RENAME COLUMN address TO city;
