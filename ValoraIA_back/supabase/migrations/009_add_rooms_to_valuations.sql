-- 009: Add bedrooms, bathrooms, parking_spaces back to valuations
-- These were removed in the newschema.sql reset but are needed for
-- comparable filtering and report display.

ALTER TABLE valuations
  ADD COLUMN IF NOT EXISTS bedrooms       SMALLINT,
  ADD COLUMN IF NOT EXISTS bathrooms      SMALLINT,
  ADD COLUMN IF NOT EXISTS parking_spaces SMALLINT;
