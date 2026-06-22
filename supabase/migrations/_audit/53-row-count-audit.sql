-- Phase 53 DATA-12 / D-07: row-count audit for the Google Places data deletion.
--
-- Run this script MANUALLY (psql / Supabase SQL editor) BEFORE and AFTER applying
-- supabase/migrations/20260622120000_remove_google_places_data.sql, then compare
-- the two result sets to confirm only the intended pure-Google rows (and their
-- documented cascade dependents) dropped.
--
-- This file lives under the underscore-prefixed _audit/ directory specifically so
-- the Supabase migration runner does NOT pick it up — it only scans top-level
-- timestamped .sql files in supabase/migrations/. This script is never auto-
-- applied; it is read-only and must be run by the operator by hand.
--
-- No mutating statement appears anywhere below.

-- =============================================================================
-- 1. Baseline totals — row counts for all four audited tables in one result set.
-- =============================================================================
SELECT 'liikuntapaikat' AS table_name, COUNT(*) AS row_count FROM liikuntapaikat
UNION ALL
SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL
SELECT 'suosikit', COUNT(*) FROM suosikit
UNION ALL
SELECT 'business_paikka_links', COUNT(*) FROM business_paikka_links;

-- =============================================================================
-- 2. Provenance breakdown — categorize liikuntapaikat rows the same way the
--    migration's deletion predicate does, BEFORE running the migration.
--    This predicate MUST match 20260622120000_remove_google_places_data.sql
--    exactly (NOT EXISTS against business_paikka_links, never business_managed)
--    so the "pure-Google" count below equals the number of rows the migration
--    will remove.
-- =============================================================================
SELECT
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM business_paikka_links bpl WHERE bpl.paikka_id = liikuntapaikat.id
    ) THEN 'pure-Google (deletion target)'
    ELSE 'linked-kept'
  END AS category,
  COUNT(*) AS row_count
FROM liikuntapaikat
GROUP BY 1;

-- Optional further breakdown of the linked-kept group by link_type, for visibility
-- into how many kept rows are claims vs. business-created venues.
SELECT
  bpl.link_type,
  COUNT(*) AS row_count
FROM liikuntapaikat lp
JOIN business_paikka_links bpl ON bpl.paikka_id = lp.id
GROUP BY bpl.link_type;

-- =============================================================================
-- 3. Expected post-migration deltas (documentation only — re-run section 1 and 2
--    AFTER the migration and compare against this expectation):
--
--   - "pure-Google (deletion target)" count from section 2 MUST be 0 after the
--     migration runs (the migration's NOT EXISTS predicate deletes exactly this
--     set).
--   - "linked-kept" liikuntapaikat count from section 2 MUST be unchanged
--     before/after — no claimed or created venue is touched by the migration.
--   - business_paikka_links count from section 1 MUST be unchanged before/after
--     — no link row cascades, because every linked venue is excluded from
--     deletion by construction.
--   - reviews and suosikit counts from section 1 MAY drop, but only by the
--     cascade tied to the deleted pure-Google liikuntapaikat rows. Per
--     CONTEXT.md D-03, this data is confirmed test-only and the loss is
--     explicitly acceptable. Any unexpected additional drop (e.g., reviews
--     count dropping by more than the number of deleted pure-Google rows could
--     account for) indicates the deletion predicate matched unintended rows and
--     must be investigated before proceeding further.
-- =============================================================================
