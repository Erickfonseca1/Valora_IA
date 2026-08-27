-- 023: valuations.city — used by the list endpoint (q filter) and dashboards.
-- newschema.sql originally omitted it; migration 003 had it, so existing
-- databases may or may not have the column.
ALTER TABLE valuations ADD COLUMN IF NOT EXISTS city TEXT;

CREATE INDEX IF NOT EXISTS idx_valuations_city ON valuations (city);