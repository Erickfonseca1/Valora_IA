ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS images       TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS amenities    TEXT[]  DEFAULT '{}';
