-- 011: Campos ricos do VivaReal Scraper (fatihtahta/vivareal-scraper)
-- Execução manual no Supabase (SQL editor), como as demais migrations.
-- Todos ADD COLUMN IF NOT EXISTS para serem idempotentes sobre o newschema.sql.

-- Alinha com o newschema.sql: `platform` (migration 001, NOT NULL sem default)
-- foi removida do schema canônico; mantê-la quebraria os upserts batch das
-- rotas /api/scrape e /api/apify/webhook.
ALTER TABLE listings DROP COLUMN IF EXISTS platform;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS source             TEXT,             -- portal de origem (vivareal, zap, ...)
  ADD COLUMN IF NOT EXISTS ad_id              TEXT,             -- id do anúncio no portal
  ADD COLUMN IF NOT EXISTS address            TEXT,             -- endereço completo (rua + número)
  ADD COLUMN IF NOT EXISTS state              CHAR(2),          -- UF (SP, RJ, ...)
  ADD COLUMN IF NOT EXISTS condo_fee          NUMERIC(12,2),    -- condomínio mensal (R$)
  ADD COLUMN IF NOT EXISTS iptu               NUMERIC(12,2),    -- IPTU anual (R$)
  ADD COLUMN IF NOT EXISTS total_area         NUMERIC(10,2),    -- área total m² (vs usable_area privada)
  ADD COLUMN IF NOT EXISTS suites             SMALLINT,
  ADD COLUMN IF NOT EXISTS floor              SMALLINT,         -- andar (apartamentos)
  ADD COLUMN IF NOT EXISTS total_floors       SMALLINT,         -- total de andares do prédio
  ADD COLUMN IF NOT EXISTS is_condo           BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_new_launch      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS listing_created_at TIMESTAMPTZ,      -- data de publicação do anúncio
  -- Imagens do anúncio (definida na 004, mas ausente após reset pelo newschema.sql)
  ADD COLUMN IF NOT EXISTS images             TEXT[]  DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_listings_source    ON listings (source);
CREATE INDEX IF NOT EXISTS idx_listings_state     ON listings (state);
CREATE INDEX IF NOT EXISTS idx_listings_listing_created_at ON listings (listing_created_at);

-- Referência de mercado verificada (prior por bairro) usada no blend da avaliação.
ALTER TABLE valuations
  ADD COLUMN IF NOT EXISTS market_reference JSONB;

-- Verificação pós-execução:
-- SELECT column_name, data_type
--   FROM information_schema.columns
--  WHERE table_name = 'listings'
--  ORDER BY ordinal_position;
