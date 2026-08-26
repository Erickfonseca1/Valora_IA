-- 020: valuation ownership + soft delete.
-- created_by: author of the study. organization_id: owning organization.
-- deleted_at: soft delete (lixeira) — restored by setting it back to NULL.

ALTER TABLE valuations
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_valuations_org ON valuations (organization_id);
CREATE INDEX IF NOT EXISTS idx_valuations_created_by ON valuations (created_by);
CREATE INDEX IF NOT EXISTS idx_valuations_deleted_at ON valuations (deleted_at);

-- Active rows first for lists that filter deleted items.
CREATE INDEX IF NOT EXISTS idx_valuations_active
  ON valuations (created_at DESC)
  WHERE deleted_at IS NULL;