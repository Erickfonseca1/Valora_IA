-- PostGIS owns public.spatial_ref_sys. It contains public EPSG coordinate
-- reference definitions, not application or customer data.
--
-- Do not enable RLS on this relation: Supabase-managed PostGIS objects are
-- owned by supabase_admin and ALTER TABLE may fail with 42501. Keep the
-- read access required by spatial functions, but remove write access from
-- the roles exposed through the Data API.
DO $$
BEGIN
  -- Existing projects may still have PostGIS in public. New projects use
  -- the extensions schema, where this relation is not exposed by PostgREST.
  IF to_regclass('public.spatial_ref_sys') IS NOT NULL THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
      ON TABLE public.spatial_ref_sys FROM PUBLIC, anon, authenticated';
  END IF;
END
$$;
