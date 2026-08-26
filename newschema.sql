-- 1. LIMPEZA TOTAL (RESET)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS org_invites CASCADE;
DROP TABLE IF EXISTS valuation_photos CASCADE;
DROP TABLE IF EXISTS memberships CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS valuations CASCADE;
DROP TABLE IF EXISTS listings CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TYPE IF EXISTS org_type CASCADE;
DROP TYPE IF EXISTS membership_role CASCADE;
DROP TYPE IF EXISTS property_type_enum CASCADE;
DROP TYPE IF EXISTS conservation_state_enum CASCADE;
DROP TYPE IF EXISTS terrain_slope_enum CASCADE;
DROP TYPE IF EXISTS street_level_enum CASCADE;

-- 2. EXTENSÕES
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
SET search_path = public, extensions;

-- 3. ENUMS TÉCNICOS (PADRÃO ROSS-HEIDECKE E ABNT)
CREATE TYPE property_type_enum AS ENUM ('apartment', 'house', 'commercial', 'land');
CREATE TYPE conservation_state_enum AS ENUM ('novo', 'entre_novo_e_regular', 'regular', 'reparos_simples', 'reparos_importantes', 'critico');
CREATE TYPE terrain_slope_enum AS ENUM ('plano', 'aclive_leve', 'declive_leve', 'aclive_acentuado', 'declive_acentuado');
CREATE TYPE street_level_enum AS ENUM ('no_nivel', 'abaixo_nivel', 'acima_nivel');
CREATE TYPE org_type AS ENUM ('solo', 'imobiliaria', 'escritorio');
CREATE TYPE membership_role AS ENUM ('owner', 'admin', 'avaliador', 'pending');

-- 3b. AUTENTICAÇÃO E ORGANIZAÇÕES (MULTI-TENANT)
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT NOT NULL,
  creci      TEXT,
  cnaI       TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  type       org_type NOT NULL DEFAULT 'solo',
  logo_url   TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan       TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            membership_role NOT NULL,
  invited_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE org_invites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  role            membership_role NOT NULL DEFAULT 'avaliador',
  token           TEXT NOT NULL UNIQUE,
  invited_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at     TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action          TEXT NOT NULL,
  entity_type     TEXT,
  entity_id       TEXT,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID,
  ip              TEXT,
  user_agent      TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABELA DE LISTAGENS (COMPARÁVEIS)
CREATE TABLE listings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_url      TEXT NOT NULL UNIQUE,
  source          TEXT,                            -- portal: vivareal, zap, ...
  ad_id           TEXT,                            -- id do anúncio no portal
  price           NUMERIC(15,2) NOT NULL,
  usable_area     NUMERIC(10,2) NOT NULL,
  total_area      NUMERIC(10,2),                   -- área total (vs privada)
  land_area       NUMERIC(10,2),                   -- área do lote, quando explicitamente identificada
  bedrooms        SMALLINT,
  bathrooms       SMALLINT,
  suites          SMALLINT,
  parking_spaces  SMALLINT,
  property_type   property_type_enum NOT NULL,
  coordinates     GEOGRAPHY(POINT, 4326) NOT NULL,
  city            TEXT NOT NULL,
  neighborhood    TEXT,
  address         TEXT,                            -- rua + número
  state           CHAR(2),                         -- UF
  
  -- Custos do imóvel (homogeneização NBR 14653)
  condo_fee       NUMERIC(12,2),                   -- condomínio mensal (R$)
  iptu            NUMERIC(12,2),                   -- IPTU anual (R$)
  
  -- Campos para Homogeneização V2
  construction_age INTEGER, 
  conservation_state conservation_state_enum DEFAULT 'regular',
  
  -- Atributos do edifício/condomínio
  floor           SMALLINT,                        -- andar
  total_floors    SMALLINT,                        -- andares do prédio
  is_condo        BOOLEAN NOT NULL DEFAULT TRUE,
  is_new_launch   BOOLEAN NOT NULL DEFAULT FALSE,
  listing_created_at TIMESTAMPTZ,                  -- publicação do anúncio
  
  images          TEXT[] DEFAULT '{}',
  amenities       JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ "item", "scope" }]
  unit_type       TEXT,                            -- tipo cru do portal
  
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
  area_construida_m2          NUMERIC(10,2),
  area_terreno_m2              NUMERIC(10,2),
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
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  organization_id             UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_by                  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at                  TIMESTAMPTZ
);

-- 6. TABELA DE FOTOS E ANÁLISE DE IA
CREATE TABLE valuation_photos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  valuation_id    TEXT REFERENCES valuations(id) ON DELETE CASCADE,
  room            TEXT, -- cômodo: sala, cozinha, quarto, banheiro, fachada, ...
  photo_url       TEXT NOT NULL,
  ai_analysis     JSONB, -- { "detected_state": "regular", "confidence": 0.95, "tags": ["fachada", "moderna"] }
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ÍNDICES ESPACIAIS E DE PERFORMANCE
CREATE INDEX idx_listings_coords ON listings USING GIST (coordinates);
CREATE INDEX idx_valuations_created_at ON valuations (created_at DESC);
CREATE INDEX idx_valuations_org ON valuations (organization_id);
CREATE INDEX idx_valuations_created_by ON valuations (created_by);
CREATE INDEX idx_valuations_active ON valuations (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_memberships_user ON memberships (user_id);
CREATE INDEX idx_memberships_org ON memberships (organization_id);
CREATE INDEX idx_org_invites_token ON org_invites (token);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);

-- 8. RLS (all application data is accessed through the backend)
-- Tabelas operacionais: acesso exclusivo do service role.
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE listings FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE listings TO service_role;
CREATE POLICY "service_role_all" ON listings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE valuations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE valuations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE valuations TO authenticated;
CREATE POLICY "service_role_all" ON valuations
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "author_or_admin_valuations" ON valuations
  FOR ALL TO authenticated
  USING (
    created_by = auth.uid()
    OR (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = organization_id AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    ))
  )
  WITH CHECK (created_by = auth.uid());

ALTER TABLE valuation_photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE valuation_photos FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE valuation_photos TO service_role;
CREATE POLICY "service_role_all" ON valuation_photos
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE audit_logs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE audit_logs TO service_role;
CREATE POLICY "service_role_all" ON audit_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Tabelas de autenticação: políticas por membro (ver migrations 022).
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE profiles TO authenticated;
CREATE POLICY "own_profile_all" ON profiles
  FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE organizations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE organizations TO authenticated;
CREATE POLICY "member_read_org" ON organizations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = id AND m.user_id = auth.uid()));
CREATE POLICY "creator_insert_org" ON organizations
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "owner_admin_update_org" ON organizations
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin')));

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE memberships FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE memberships TO authenticated;
CREATE POLICY "member_read_membership" ON memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = organization_id AND m.user_id = auth.uid()));
CREATE POLICY "self_accept_invite" ON memberships
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND role = 'pending');
CREATE POLICY "self_update_accept" ON memberships
  FOR UPDATE TO authenticated USING (user_id = auth.uid() AND role = 'pending');
CREATE POLICY "owner_admin_manage_members" ON memberships
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = organization_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin')));

ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE org_invites FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE org_invites TO authenticated;
CREATE POLICY "owner_admin_invites" ON org_invites
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = organization_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin')));
