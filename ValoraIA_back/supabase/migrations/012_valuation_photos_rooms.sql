-- 012: Fotos por cômodo (reactivação do fluxo de fotos no PTAM)
-- Execução manual no Supabase (SQL editor), como as demais migrations.

-- Garante que a tabela exista (pode ter sido removida no reset do newschema.sql)
CREATE TABLE IF NOT EXISTS valuation_photos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  valuation_id    TEXT REFERENCES valuations(id) ON DELETE CASCADE,
  room            TEXT,             -- cômodo: sala, cozinha, quarto, banheiro, fachada, ...
  photo_url       TEXT NOT NULL,
  ai_analysis     JSONB,            -- { "detected_state": "regular", "confidence": 0.95, "tags": [...] }
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Cômodo nas fotos existentes (idempotente)
ALTER TABLE valuation_photos ADD COLUMN IF NOT EXISTS room TEXT;

CREATE INDEX IF NOT EXISTS idx_valuation_photos_valuation_id
  ON valuation_photos (valuation_id);

-- Photos are accessed through the backend with the service-role key. They
-- must not be readable or writable directly through the Data API.
ALTER TABLE valuation_photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE valuation_photos FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE valuation_photos TO service_role;

DROP POLICY IF EXISTS "service_role_all" ON valuation_photos;
CREATE POLICY "service_role_all" ON valuation_photos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verificação pós-execução:
-- SELECT column_name, data_type
--   FROM information_schema.columns
--  WHERE table_name = 'valuation_photos'
--  ORDER BY ordinal_position;
