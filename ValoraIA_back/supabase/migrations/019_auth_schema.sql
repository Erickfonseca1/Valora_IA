-- 019: auth-aware schema — profiles, organizations, memberships.
-- Every user gets an automatic personal ("solo") organization at onboarding;
-- imobiliárias/escritórios create team organizations and invite members.

CREATE TYPE org_type AS ENUM ('solo', 'imobiliaria', 'escritorio');
CREATE TYPE membership_role AS ENUM ('owner', 'admin', 'avaliador', 'pending');

CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT NOT NULL,
  creci      TEXT,
  cnaI       TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  type       org_type NOT NULL DEFAULT 'solo',
  logo_url   TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan       TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            membership_role NOT NULL,
  invited_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON memberships (organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations (slug);