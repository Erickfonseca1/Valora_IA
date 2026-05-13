-- 1. LIMPEZA TOTAL (RESET)
DROP TABLE IF EXISTS valuation_photos CASCADE;
DROP TABLE IF EXISTS valuations CASCADE;
DROP TABLE IF EXISTS listings CASCADE;
DROP TYPE IF EXISTS property_type_enum CASCADE;
DROP TYPE IF EXISTS conservation_state_enum CASCADE;
DROP TYPE IF EXISTS terrain_slope_enum CASCADE;
DROP TYPE IF EXISTS street_level_enum CASCADE;

-- 2. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. ENUMS TÉCNICOS (PADRÃO ROSS-HEIDECKE E ABNT)
CREATE TYPE property_type_enum AS ENUM ('apartment', 'house', 'commercial', 'land');
CREATE TYPE conservation_state_enum AS ENUM ('novo', 'entre_novo_e_regular', 'regular', 'reparos_simples', 'reparos_importantes', 'critico');
CREATE TYPE terrain_slope_enum AS ENUM ('plano', 'aclive_leve', 'declive_leve', 'aclive_acentuado', 'declive_acentuado');
CREATE TYPE street_level_enum AS ENUM ('no_nivel', 'abaixo_nivel', 'acima_nivel');

-- 4. TABELA DE LISTAGENS (COMPARÁVEIS)
CREATE TABLE listings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_url      TEXT NOT NULL UNIQUE,
  price           NUMERIC(15,2) NOT NULL,
  usable_area     NUMERIC(10,2) NOT NULL,
  bedrooms        SMALLINT,
  bathrooms       SMALLINT,
  parking_spaces  SMALLINT,
  property_type   property_type_enum NOT NULL,
  coordinates     GEOGRAPHY(POINT, 4326) NOT NULL,
  city            TEXT NOT NULL,
  neighborhood    TEXT,
  
  -- Campos para Homogeneização V2
  construction_age INTEGER, 
  conservation_state conservation_state_enum DEFAULT 'regular',
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  last_seen       TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE AVALIAÇÕES (O CORAÇÃO DO PTAM)
CREATE TABLE valuations (
  id                          TEXT PRIMARY KEY DEFAULT 'val_' || replace(gen_random_uuid()::text, '-', ''),
  address                     TEXT NOT NULL,
  lat                         FLOAT8,
  lng                         FLOAT8,
  property_type               property_type_enum NOT NULL,
  area_m2                     NUMERIC(10,2) NOT NULL,
  
  -- INPUTS TÉCNICOS V2
  construction_age            INTEGER,
  conservation_state          conservation_state_enum DEFAULT 'regular',
  terrain_slope               terrain_slope_enum DEFAULT 'plano',
  street_level                street_level_enum DEFAULT 'no_nivel',
  is_corner                   BOOLEAN DEFAULT FALSE,
  
  -- RESULTADOS: MÉTODO COMPARATIVO (ESTÁTICO)
  static_market_value_brl     NUMERIC(15,2),
  price_per_m2_homogenized    NUMERIC(15,2),
  confidence_score            NUMERIC(5,2),
  
  -- RESULTADOS: MÉTODO INVOLUTIVO (POTENCIAL CONSTRUTIVO)
  residual_land_value_brl     NUMERIC(15,2),
  max_buildable_area_m2       NUMERIC(10,2),
  zoning_params               JSONB, -- { "IAb": 2.5, "IAmax": 4.0, "TO": 0.5 }
  viability_scenarios         JSONB, -- Comparativo de VGV e Lucro
  
  -- METADADOS E RELATÓRIO
  comparables                 JSONB, -- Lista de comparáveis usados e seus fatores
  neighborhood_pois           JSONB,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA DE FOTOS E ANÁLISE DE IA
CREATE TABLE valuation_photos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  valuation_id    TEXT REFERENCES valuations(id) ON DELETE CASCADE,
  photo_url       TEXT NOT NULL,
  ai_analysis     JSONB, -- { "detected_state": "regular", "confidence": 0.95, "tags": ["fachada", "moderna"] }
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ÍNDICES ESPACIAIS E DE PERFORMANCE
CREATE INDEX idx_listings_coords ON listings USING GIST (coordinates);
CREATE INDEX idx_valuations_created_at ON valuations (created_at DESC);
