-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Enum for platforms ───────────────────────────────────────────────────────
CREATE TYPE listing_platform AS ENUM (
  'olx',
  'zapimoveis',
  'vivareal',
  'quintoandar',
  'imovelweb'
);

-- ─── Main listings table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listings (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_url      TEXT          NOT NULL UNIQUE,
  platform        listing_platform NOT NULL,
  price           NUMERIC(15,2) NOT NULL CHECK (price > 0),
  usable_area     NUMERIC(10,2) NOT NULL CHECK (usable_area > 0),
  bedrooms        SMALLINT      CHECK (bedrooms >= 0),
  bathrooms       SMALLINT      CHECK (bathrooms >= 0),
  parking_spaces  SMALLINT      CHECK (parking_spaces >= 0),
  coordinates     GEOGRAPHY(POINT, 4326) NOT NULL,
  neighborhood    TEXT,
  city            TEXT          NOT NULL,
  last_seen       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── Computed column price_per_m2 (generated) ────────────────────────────────
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS price_per_m2
    NUMERIC(12,2)
    GENERATED ALWAYS AS (price / NULLIF(usable_area, 0))
    STORED;

-- ─── GiST index for spatial queries ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_listings_coordinates
  ON listings USING GIST (coordinates);

-- ─── Additional indexes for frequent filters ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_listings_city         ON listings (city);
CREATE INDEX IF NOT EXISTS idx_listings_platform     ON listings (platform);
CREATE INDEX IF NOT EXISTS idx_listings_bedrooms     ON listings (bedrooms);
CREATE INDEX IF NOT EXISTS idx_listings_usable_area  ON listings (usable_area);
CREATE INDEX IF NOT EXISTS idx_listings_price_per_m2 ON listings (price_per_m2);
CREATE INDEX IF NOT EXISTS idx_listings_last_seen    ON listings (last_seen DESC);

-- ─── Trigger: auto-update last_seen on price change ──────────────────────────
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    NEW.last_seen = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_last_seen
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_last_seen();

-- ─── RLS (Row Level Security) ─────────────────────────────────────────────────
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by the API)
CREATE POLICY "service_role_all" ON listings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read (for front-end map display)
CREATE POLICY "authenticated_read" ON listings
  FOR SELECT
  TO authenticated
  USING (true);
