-- 018: audit trail for accountability (LGPD art. 37, Res. ANPD 15/2024).
-- Written by the backend (service role). Retention: >= 5 years.
CREATE TABLE IF NOT EXISTS audit_logs (
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs (user_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE audit_logs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE audit_logs TO service_role;

CREATE POLICY "service_role_all" ON audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);