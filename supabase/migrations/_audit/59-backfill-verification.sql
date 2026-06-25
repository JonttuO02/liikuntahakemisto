-- Phase 59 ACCESS-01/ACCESS-02: backfill + constraint-name verification for the
-- companies/role/RLS migration (supabase/migrations/20260625000000_companies_role_rls.sql).
--
-- Decision log references:
--   D-08: each business_accounts row gets its own new companies row, named via
--         verbatim copy of company_name (no dedup) -- this is the Pitfall 1
--         load-bearing 1:1-correspondence concern this script's section 3 verifies.
--   D-09: every business_accounts row is migrated uniformly to role='owner'
--         regardless of approval_status -- nothing is filtered out.
--   D-10: empty/placeholder company_name values are migrated as-is by default;
--         section 2 below surfaces the count so the operator can flag a large
--         number back before proceeding, per D-10's deferred-research clause.
--   Pitfall 1 (RESEARCH.md): INSERT...SELECT does not preserve 1:1 row identity
--         with its source table on its own -- the migration's ROW_NUMBER() CTE
--         join must be verified post-apply, not assumed correct from the SQL
--         text alone. Section 3 is that verification: it must check EVERY row,
--         not a sample.
--
-- This file lives under the underscore-prefixed _audit/ directory specifically so
-- the Supabase migration runner does NOT pick it up -- it only scans top-level
-- timestamped .sql files in supabase/migrations/. This script is never auto-
-- applied; it is read-only and must be run by the operator by hand (Supabase
-- SQL Editor or psql), mirroring the _audit/53-row-count-audit.sql convention.
--
-- No mutating statement appears anywhere below (no DDL, no INSERT/UPDATE/DELETE).
--
-- RUN ORDER:
--   Sections 1-2: run BEFORE applying 20260625000000_companies_role_rls.sql.
--     Section 1 confirms the exact existing constraint/index names on
--     business_paikka_links so the migration's DROP statements are not trusting
--     an assumed name (RESEARCH.md Assumption A2 -- Medium risk).
--     Section 2 surfaces how many business_accounts rows have an empty/blank
--     company_name, for awareness only (D-10 default behavior is migrate-as-is).
--   Section 3: run AFTER applying the migration. This is the Pitfall 1 gate --
--     it must show ZERO rows for the mismatch query and the two counts in the
--     count-equality query must be equal before production apply is trusted.

-- =============================================================================
-- 1. Constraint-name confirmation on business_paikka_links (run BEFORE migration)
-- =============================================================================
-- The original 20260605000000_business_accounts.sql table definition includes an
-- inline UNIQUE(paikka_id) table constraint (auto-named by Postgres convention,
-- assumed to be business_paikka_links_paikka_id_key -- RESEARCH.md Assumption A2)
-- plus 20260610000005_confirm_paikka_unique.sql's explicit named index
-- business_paikka_links_paikka_id_unique. Confirm both names below before
-- trusting the DROP CONSTRAINT / DROP INDEX statements in the migration.
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'business_paikka_links'::regclass;

-- Indexes (the explicit named unique index lives here, not in pg_constraint,
-- unless Postgres also registered it as a constraint -- check both result sets).
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'business_paikka_links';

-- =============================================================================
-- 2. Empty/placeholder company_name scan (run BEFORE migration) -- resolves
--    Open Question 2 / D-10. Default behavior is migrate-as-is; this query
--    exists to surface a large count for flagging, not to change behavior.
-- =============================================================================
SELECT count(*) AS empty_or_blank_company_name_count
FROM business_accounts
WHERE company_name IS NULL OR trim(company_name) = '';

-- =============================================================================
-- 3. Post-migration 1:1 backfill verification (run AFTER migration applies) --
--    Pitfall 1 load-bearing check. Must verify EVERY row, not a sample.
-- =============================================================================

-- 3a. Row-count equality check: every business_accounts row must have produced
--     exactly one companies row during the backfill.
SELECT
  (SELECT count(*) FROM business_accounts) AS business_accounts_count,
  (SELECT count(*) FROM companies) AS companies_count;
-- EXPECTATION: the two counts above must be equal. If companies_count is lower,
-- the backfill INSERT...SELECT skipped rows. If higher, something else inserted
-- extra companies rows (e.g. a concurrent registration during the migration
-- window) -- investigate before proceeding to production.

-- 3b. Name-mismatch detection: for every business_accounts row, the companies
--     row it now points to (via company_id) must have the exact name the
--     account's company_name held immediately before the DROP COLUMN step.
--     Because company_name no longer exists post-migration, this query instead
--     re-derives the expectation from the backfill's own correctness contract:
--     every account's company_id must resolve to a non-null companies row, and
--     no two accounts may have been mapped to the same companies row (which
--     would indicate the ROW_NUMBER() join collapsed two distinct accounts onto
--     one company -- the exact Pitfall 1 failure mode).
SELECT ba.user_id, ba.company_id, count(*) OVER (PARTITION BY ba.company_id) AS accounts_sharing_this_company_id
FROM business_accounts ba
WHERE ba.company_id IS NULL
   OR ba.company_id IN (
        SELECT company_id
        FROM business_accounts
        GROUP BY company_id
        HAVING count(*) > 1
      );
-- EXPECTATION: this query must return ZERO rows. Any row returned means either
-- (a) company_id is NULL for an existing account (backfill missed it), or
-- (b) two or more accounts were mapped to the same companies.id (the join
-- collapsed distinct accounts -- the Pitfall 1 warning sign). If this query is
-- non-empty, do NOT proceed to production; investigate the ROW_NUMBER() CTE's
-- two ORDER BY user_id clauses for an ordering mismatch.

-- 3c. role backfill check: every existing account must have role = 'owner'
--     regardless of approval_status (D-09 -- no filtering by status).
SELECT approval_status, role, count(*)
FROM business_accounts
GROUP BY approval_status, role
ORDER BY approval_status, role;
-- EXPECTATION: every row's role column is 'owner' (NULL role or any 'member'
-- row at this point indicates the backfill missed a row or D-09 was violated).
