-- DATA-09: Add business_managed flag to liikuntapaikat.
-- This boolean column lets the Google Places sync script (app/api/admin/sync-paikat)
-- identify venues managed directly by a business account via the Yritysportaali.
-- The sync script pre-filters rows with business_managed = true before building the
-- upsert batch, so managed venues are never overwritten by automated data pulls.
-- No new RLS policy needed — the existing policies in 20260519000001_enable_rls.sql
-- (public_read, authenticated_insert, authenticated_update, authenticated_delete) already
-- cover all columns including this one.
ALTER TABLE liikuntapaikat ADD COLUMN IF NOT EXISTS business_managed BOOLEAN NOT NULL DEFAULT false;
