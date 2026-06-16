-- Phase 47: Reshape business_branding for plural branding data and per-venue scoping.
-- Analog source:
--   supabase/migrations/20260606000000_onboarding.sql -- header-comment style, composite UNIQUE + BIGINT FK precedent
--
-- Decision log:
--   D-12: Four additive plural-data columns (logo_candidates, image_urls, selected_background_color,
--         selected_accent_color) — bare nullable JSONB/TEXT, mirroring the existing `colors JSONB` style.
--         Phase 48 lets users pick from multiple logo/image candidates and choose 2 colors from a palette.
--   D-13: logo_type CHECK constraint fix (BRDDB-04) already shipped in 20260615000002 — verified, not
--         re-implemented here. See Task 3 of this plan for live verification evidence.
--   D-14: business_branding_unique_account UNIQUE(business_account_id) is re-keyed to a composite
--         UNIQUE(business_account_id, paikka_id). The old single-column constraint silently overwrote
--         a sibling venue's branding row whenever one business account managed multiple venues.
--   D-15: paikka_id BIGINT FK added nullable first, then backfilled deterministically from
--         business_paikka_links using ORDER BY created_at ASC LIMIT 1 (business_paikka_links has
--         UNIQUE(paikka_id), so each venue maps to exactly one account -- the tie-break only matters
--         for multi-venue accounts). Orphan rows with no resolvable paikka_id are deleted before the
--         NOT NULL constraint is applied, since they could never be correctly scoped.
--
-- NOT included (handled elsewhere):
--   logo_type CHECK constraint fix (BRDDB-04) -- already shipped in 20260615000002, not touched here.

-- =============================================================================
-- ALTER TABLE: business_branding -- add plural branding-data columns (BRDDB-03)
-- =============================================================================

ALTER TABLE business_branding
  ADD COLUMN IF NOT EXISTS logo_candidates JSONB;

ALTER TABLE business_branding
  ADD COLUMN IF NOT EXISTS image_urls JSONB;

ALTER TABLE business_branding
  ADD COLUMN IF NOT EXISTS selected_background_color TEXT;

ALTER TABLE business_branding
  ADD COLUMN IF NOT EXISTS selected_accent_color TEXT;

-- =============================================================================
-- ALTER TABLE: business_branding -- add paikka_id scoping column (BRDDB-05)
-- =============================================================================
-- Nullable first so the backfill UPDATE below can run before the NOT NULL is applied.

ALTER TABLE business_branding
  ADD COLUMN IF NOT EXISTS paikka_id BIGINT REFERENCES liikuntapaikat(id) ON DELETE CASCADE;

-- =============================================================================
-- Backfill paikka_id from business_paikka_links (D-15)
-- =============================================================================
-- Deterministic tie-break: ORDER BY created_at ASC LIMIT 1. business_paikka_links has
-- UNIQUE(paikka_id), so each venue belongs to exactly one account -- the tie-break only
-- matters when a single business_account_id manages multiple venues.

UPDATE business_branding bb
SET paikka_id = (
  SELECT bpl.paikka_id
  FROM business_paikka_links bpl
  WHERE bpl.business_account_id = bb.business_account_id
  ORDER BY bpl.created_at ASC
  LIMIT 1
)
WHERE bb.paikka_id IS NULL;

-- Orphan branding rows with no linked venue can never be correctly scoped to a paikka_id;
-- delete them so the NOT NULL constraint below can succeed.
DELETE FROM business_branding WHERE paikka_id IS NULL;

ALTER TABLE business_branding
  ALTER COLUMN paikka_id SET NOT NULL;

-- =============================================================================
-- Re-key UNIQUE constraint to scope branding per venue, not per account (D-14)
-- =============================================================================

ALTER TABLE business_branding
  DROP CONSTRAINT IF EXISTS business_branding_unique_account;

ALTER TABLE business_branding
  ADD CONSTRAINT business_branding_unique_account_paikka UNIQUE (business_account_id, paikka_id);

-- Composite index for the new lookup key (business_account_id, paikka_id).
CREATE INDEX IF NOT EXISTS idx_business_branding_account_paikka
  ON business_branding(business_account_id, paikka_id);
