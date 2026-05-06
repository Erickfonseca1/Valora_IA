-- 007: V2 PTAM / NBR 14.653 fields
-- Run `SELECT column_name FROM information_schema.columns WHERE table_name='valuations'`
-- first to verify which columns already exist before executing.

ALTER TABLE valuations
  ADD COLUMN IF NOT EXISTS construction_age        INT,
  ADD COLUMN IF NOT EXISTS conservation_state      TEXT,
  ADD COLUMN IF NOT EXISTS terrain_slope           TEXT,
  ADD COLUMN IF NOT EXISTS street_level            TEXT,
  ADD COLUMN IF NOT EXISTS is_corner               BOOLEAN,
  ADD COLUMN IF NOT EXISTS static_market_value     NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS residual_land_value     NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS max_buildable_area      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS viability_scenarios     JSONB,
  ADD COLUMN IF NOT EXISTS zoning_info             JSONB,
  ADD COLUMN IF NOT EXISTS property_photos         TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS method_estimates        JSONB,
  ADD COLUMN IF NOT EXISTS primary_method          TEXT,
  ADD COLUMN IF NOT EXISTS homogenization_factors  JSONB,
  ADD COLUMN IF NOT EXISTS ross_heidecke_result    JSONB;

ALTER TABLE valuations
  ADD CONSTRAINT chk_conservation_state
    CHECK (conservation_state IS NULL OR conservation_state IN
      ('A','AB','B','BC','C','CD','D','DE','E')),
  ADD CONSTRAINT chk_terrain_slope
    CHECK (terrain_slope IS NULL OR terrain_slope IN ('flat','gentle','steep')),
  ADD CONSTRAINT chk_street_level
    CHECK (street_level IS NULL OR street_level IN ('same','above','below'));
