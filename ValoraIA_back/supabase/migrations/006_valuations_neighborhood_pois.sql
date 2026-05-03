ALTER TABLE valuations
  ADD COLUMN IF NOT EXISTS neighborhood_pois JSONB;
