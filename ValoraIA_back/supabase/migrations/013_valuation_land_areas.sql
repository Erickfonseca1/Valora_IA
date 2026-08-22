-- Separate building and lot areas for residential valuations.
-- land_area is intentionally distinct from total_area: portal total_area
-- is not reliable enough to be treated as lot area without explicit mapping.
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS land_area NUMERIC(10,2)
  CHECK (land_area IS NULL OR land_area > 0);

ALTER TABLE valuations
  ADD COLUMN IF NOT EXISTS area_construida_m2 NUMERIC(10,2)
  CHECK (area_construida_m2 IS NULL OR area_construida_m2 > 0),
  ADD COLUMN IF NOT EXISTS area_terreno_m2 NUMERIC(10,2)
  CHECK (area_terreno_m2 IS NULL OR area_terreno_m2 > 0);

DROP FUNCTION IF EXISTS search_listings_in_radius(float8, float8, float8, float8, float8, int, int);

CREATE OR REPLACE FUNCTION search_listings_in_radius(
  p_lat              FLOAT8,
  p_lng              FLOAT8,
  p_radius_m         FLOAT8,
  p_area_target      FLOAT8,
  p_area_tolerance   FLOAT8 DEFAULT 0.20,
  p_bedrooms         INT DEFAULT NULL,
  p_limit            INT DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  source_url TEXT,
  price NUMERIC,
  usable_area NUMERIC,
  land_area NUMERIC,
  bedrooms SMALLINT,
  bathrooms SMALLINT,
  parking_spaces SMALLINT,
  property_type TEXT,
  lat FLOAT8,
  lng FLOAT8,
  neighborhood TEXT,
  city TEXT,
  construction_age INTEGER,
  conservation_state TEXT,
  price_per_m2 NUMERIC,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  distance_m FLOAT8
)
LANGUAGE sql STABLE PARALLEL SAFE
AS $$
  SELECT
    l.id, l.source_url, l.price, l.usable_area, l.land_area,
    l.bedrooms, l.bathrooms, l.parking_spaces, l.property_type::TEXT,
    ST_Y(l.coordinates::GEOMETRY), ST_X(l.coordinates::GEOMETRY),
    l.neighborhood, l.city, l.construction_age,
    l.conservation_state::TEXT,
    l.price / NULLIF(l.usable_area, 0), l.last_seen, l.created_at,
    ST_Distance(
      l.coordinates,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::GEOGRAPHY
    )
  FROM listings l
  WHERE ST_DWithin(
    l.coordinates,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::GEOGRAPHY,
    p_radius_m
  )
  AND l.usable_area BETWEEN p_area_target * (1 - p_area_tolerance)
                        AND p_area_target * (1 + p_area_tolerance)
  AND (p_bedrooms IS NULL OR l.bedrooms = p_bedrooms)
  ORDER BY ST_Distance(
    l.coordinates,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::GEOGRAPHY
  )
  LIMIT p_limit;
$$;