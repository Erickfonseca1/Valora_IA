-- Update search_listings_in_radius for new schema:
--   • platform and price_per_m2 columns removed from listings
--   • property_type, construction_age, conservation_state added

DROP FUNCTION IF EXISTS search_listings_in_radius(float8,float8,float8,float8,float8,int,int);

CREATE OR REPLACE FUNCTION search_listings_in_radius(
  p_lat              FLOAT8,
  p_lng              FLOAT8,
  p_radius_m         FLOAT8,
  p_area_target      FLOAT8,
  p_area_tolerance   FLOAT8  DEFAULT 0.20,
  p_bedrooms         INT     DEFAULT NULL,
  p_limit            INT     DEFAULT 100
)
RETURNS TABLE (
  id                UUID,
  source_url        TEXT,
  price             NUMERIC,
  usable_area       NUMERIC,
  bedrooms          SMALLINT,
  bathrooms         SMALLINT,
  parking_spaces    SMALLINT,
  property_type     TEXT,
  lat               FLOAT8,
  lng               FLOAT8,
  neighborhood      TEXT,
  city              TEXT,
  construction_age  INTEGER,
  conservation_state TEXT,
  price_per_m2      NUMERIC,
  last_seen         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ,
  distance_m        FLOAT8
)
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT
    l.id,
    l.source_url,
    l.price,
    l.usable_area,
    l.bedrooms,
    l.bathrooms,
    l.parking_spaces,
    l.property_type::TEXT,
    ST_Y(l.coordinates::GEOMETRY)  AS lat,
    ST_X(l.coordinates::GEOMETRY)  AS lng,
    l.neighborhood,
    l.city,
    l.construction_age,
    l.conservation_state::TEXT,
    (l.price / NULLIF(l.usable_area, 0)) AS price_per_m2,
    l.last_seen,
    l.created_at,
    ST_Distance(
      l.coordinates,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::GEOGRAPHY
    ) AS distance_m
  FROM listings l
  WHERE
    ST_DWithin(
      l.coordinates,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::GEOGRAPHY,
      p_radius_m
    )
    AND l.usable_area BETWEEN (p_area_target * (1 - p_area_tolerance))
                          AND (p_area_target * (1 + p_area_tolerance))
    AND (p_bedrooms IS NULL OR l.bedrooms = p_bedrooms)
  ORDER BY distance_m ASC
  LIMIT p_limit;
$$;
