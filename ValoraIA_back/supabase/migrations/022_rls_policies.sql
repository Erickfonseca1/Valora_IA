-- 022: RLS policies for the auth-aware schema.
-- The backend uses the service role (bypasses RLS); these policies protect
-- direct access through the Data API and enforce tenant isolation.

-- ─── profiles: each user manages their own ──────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE profiles TO authenticated;

CREATE POLICY "own_profile_all" ON profiles
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ─── organizations: members read; owner/admin update; creator inserts ──────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE organizations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE organizations TO authenticated;

CREATE POLICY "member_read_org" ON organizations
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = id AND m.user_id = auth.uid()
  ));

CREATE POLICY "creator_insert_org" ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "owner_admin_update_org" ON organizations
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = id AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
  ));

-- ─── memberships: members read; owner/admin manage; invitee accepts ─────────
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE memberships FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE memberships TO authenticated;

CREATE POLICY "member_read_membership" ON memberships
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = organization_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "self_accept_invite" ON memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'pending');

CREATE POLICY "self_update_accept" ON memberships
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND role = 'pending');

CREATE POLICY "owner_admin_manage_members" ON memberships
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = organization_id AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
  ));

-- ─── org_invites: only owners/admins of the org manage invites ──────────────
ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE org_invites FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE org_invites TO authenticated;

CREATE POLICY "owner_admin_invites" ON org_invites
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = organization_id AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
  ));

-- ─── valuations: author or owner/admin of the organization ──────────────────
ALTER TABLE valuations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE valuations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE valuations TO authenticated;

CREATE POLICY "author_or_admin_valuations" ON valuations
  FOR ALL
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = organization_id AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    ))
  )
  WITH CHECK (created_by = auth.uid());

-- ─── valuation_photos: inherit access through the parent valuation ──────────
ALTER TABLE valuation_photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE valuation_photos FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE valuation_photos TO authenticated;

CREATE POLICY "photo_via_valuation" ON valuation_photos
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM valuations v
    WHERE v.id = valuation_id
      AND (v.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.organization_id = v.organization_id AND m.user_id = auth.uid()
          AND m.role IN ('owner', 'admin')
      ))
  ));

CREATE POLICY "photo_insert_author" ON valuation_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM valuations v
    WHERE v.id = valuation_id AND v.created_by = auth.uid()
  ));