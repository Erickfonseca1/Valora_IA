-- 021: organization invites by e-mail with single-use tokens.
CREATE TABLE IF NOT EXISTS org_invites (
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

CREATE INDEX IF NOT EXISTS idx_org_invites_token ON org_invites (token);
CREATE INDEX IF NOT EXISTS idx_org_invites_org ON org_invites (organization_id);