-- 017: protect the application-owned valuation_photos table for databases
-- where migration 012 was already applied before RLS was added there.
ALTER TABLE public.valuation_photos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.valuation_photos FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.valuation_photos TO service_role;

DROP POLICY IF EXISTS "service_role_all" ON public.valuation_photos;
CREATE POLICY "service_role_all" ON public.valuation_photos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
