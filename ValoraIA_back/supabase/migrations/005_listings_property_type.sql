ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS property_type TEXT;

CREATE INDEX IF NOT EXISTS idx_listings_property_type ON listings (property_type);
