DO $$ BEGIN
  CREATE TYPE property_type_enum AS ENUM ('apartment', 'house', 'commercial', 'land');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS valuations (
  id                          TEXT          PRIMARY KEY DEFAULT 'val_' || replace(gen_random_uuid()::text, '-', ''),
  address                     TEXT          NOT NULL,
  neighborhood                TEXT,
  city                        TEXT,
  property_type               property_type_enum NOT NULL,
  area_m2                     NUMERIC(10,2) NOT NULL,
  bedrooms                    SMALLINT,
  bathrooms                   SMALLINT,
  parking_spots               SMALLINT,
  amenities                   TEXT[]        DEFAULT '{}',

  -- MCDDM results
  price_range_min_brl         NUMERIC(15,2) NOT NULL,
  price_range_max_brl         NUMERIC(15,2) NOT NULL,
  recommended_listing_price_brl NUMERIC(15,2) NOT NULL,
  confidence_score            NUMERIC(5,2)  NOT NULL,

  -- Factors and comparables stored as JSONB
  price_factors               JSONB         NOT NULL DEFAULT '[]',
  comparables                 JSONB         NOT NULL DEFAULT '[]',

  -- Internal
  lat                         FLOAT8,
  lng                         FLOAT8,
  sample_size                 SMALLINT,
  radius_used_m               INT,

  created_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_valuations_created_at ON valuations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_valuations_city        ON valuations (city);
CREATE INDEX IF NOT EXISTS idx_valuations_property_type ON valuations (property_type);

ALTER TABLE valuations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON valuations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read" ON valuations
  FOR SELECT TO authenticated USING (true);
