-- Phase 1: Foundation & Security (SEC-03)
ALTER TABLE liikuntapaikat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON liikuntapaikat FOR SELECT USING (true);
CREATE POLICY "authenticated_insert" ON liikuntapaikat FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON liikuntapaikat FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete" ON liikuntapaikat FOR DELETE TO authenticated USING (true);
