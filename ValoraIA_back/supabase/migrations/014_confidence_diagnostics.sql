ALTER TABLE valuations
  ADD COLUMN IF NOT EXISTS confidence_diagnostics JSONB;