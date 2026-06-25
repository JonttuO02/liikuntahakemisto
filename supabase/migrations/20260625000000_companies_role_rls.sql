-- Phase 59 ACCESS-01/ACCESS-02: introduce the `companies` entity, add
-- business_accounts.company_id/role, loosen the business_paikka_links
-- UNIQUE constraint to a composite key, and rewrite RLS around a new
-- current_company_id() SECURITY DEFINER helper.
--
-- Analog sources:
--   supabase/migrations/20260616100000_business_branding_plural_and_paikka_scoping.sql
--     -- header/decision-log comment style, add-nullable -> backfill ->
--        SET NOT NULL, DROP CONSTRAINT -> ADD composite UNIQUE precedent
--   supabase/migrations/20260611000001_approval_trigger.sql
--     -- SECURITY DEFINER + SET search_path = public precedent
--   supabase/migrations/20260605000003_fix_column_privileges.sql
--     -- REVOKE UPDATE (column) ON ... FROM authenticated precedent
--   supabase/migrations/20260605000000_business_accounts.sql
--     -- current business_accounts/business_paikka_links table defs + RLS
--   supabase/migrations/20260610000005_confirm_paikka_unique.sql
--     -- business_paikka_links_paikka_id_unique index being dropped here
--   supabase/migrations/20260610000006_rls_business_paikka_links.sql
--     -- current business_paikka_links_select_own policy being rewritten here
--
-- Decision log (.planning/phases/59-multi-company-skeemamigraatio/59-CONTEXT.md):
--   D-05: companies.name is the single source of truth; business_accounts.
--         company_name is dropped entirely, no denormalized copy kept.
--   D-06: companies table is minimal for this phase: id, name, created_at.
--         Branding/contact fields stay on business_accounts/business_paikka_links.
--   D-07: business_accounts keeps its existing PK (user_id) unchanged. New
--         company_id (FK -> companies.id) and role ('owner'|'member' CHECK)
--         columns are additive. business_paikka_links.business_account_id FK
--         is untouched -- only its UNIQUE constraint changes (ACCESS-02).
--   D-08: each existing business_accounts row gets its own new companies row,
--         named via verbatim copy of company_name -- no trimming/dedup.
--   D-09: every business_accounts row is migrated uniformly to role='owner'
--         regardless of approval_status (pending/approved/rejected all included).
--   D-10: empty/placeholder company_name values are migrated as-is (default
--         behavior; _audit/59-backfill-verification.sql section 2 surfaces
--         the count for awareness only).
--   D-11: current_company_id() is a SECURITY DEFINER SQL function returning
--         business_accounts.company_id for the row where user_id = auth.uid().
--   D-12: for a user with no business_accounts row, the function returns NULL
--         -- no exception. RLS policies using company_id = current_company_id()
--         naturally deny access since NULL never matches a real company_id.
--   D-13: regression verification is a manual login check (2-3 real business
--         accounts, staging then prod) -- not part of this migration file.
--   D-14: business_paikka_links RLS SELECT stays SELF-SCOPED (resolves the
--         same identity as before, just expressed via current_company_id()
--         conceptually) -- NOT widened to company-wide visibility. Company-wide
--         visibility widening is explicitly deferred to Phase 60/64, alongside
--         the invite/role-management UI that would make a second company
--         member exist in the first place.
--
-- NOT included (deferred to Phase 60/64 per D-14):
--   Company-wide SELECT visibility on business_paikka_links (a member seeing
--   paikat managed by ANY business_account in their company, not just their
--   own). business_accounts "see your co-workers" SELECT policy. Member-invite
--   UX, access-request/approval flow, and any dashboard UI for managing roles.
--
-- Existing RLS policy enumeration (Security Domain T-59-06 -- every existing
-- policy on the two touched tables is explicitly marked, none changed by
-- omission):
--   business_accounts:
--     "Business reads own account" (SELECT, auth.uid() = user_id)  -- KEEP AS-IS
--     "Business inserts own account" (INSERT, auth.uid() = user_id) -- KEEP AS-IS
--     "Business updates own account" (UPDATE, auth.uid() = user_id) -- KEEP AS-IS
--       (own-row identity is unchanged by D-07; company-wide co-worker
--        visibility is Phase 60/64 scope, not added here)
--   business_paikka_links:
--     "Business reads own links" (SELECT, auth.uid() = business_account_id)
--       -- REWRITTEN below as "business_paikka_links_select_own" (D-14 self-scoped)
--     "business_paikka_links_select_own" (SELECT, business_account_id = auth.uid(),
--        from 20260610000006) -- REWRITTEN below (same name, recreated)
--     "Business inserts own links" (INSERT, auth.uid() = business_account_id)
--       -- KEEP AS-IS (D-07: write identity unchanged this phase)
--     "Business updates own links" (UPDATE, auth.uid() = business_account_id)
--       -- KEEP AS-IS (D-07: write identity unchanged this phase)

BEGIN;

-- =============================================================================
-- 1. New table: companies (D-05/D-06)
-- =============================================================================
CREATE TABLE IF NOT EXISTS companies (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. New columns on business_accounts (D-07) -- nullable first, backfilled below
-- =============================================================================
ALTER TABLE business_accounts
  ADD COLUMN IF NOT EXISTS company_id BIGINT REFERENCES companies(id),
  ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('owner', 'member'));

-- =============================================================================
-- 3. Backfill (D-08/D-09) -- ROW_NUMBER() CTE pattern guarantees 1:1
--    correspondence between business_accounts and the new companies rows even
--    when two accounts share an identical company_name (Pitfall 1). The two
--    ORDER BY user_id clauses below MUST be identical -- this is load-bearing.
-- =============================================================================
WITH new_companies AS (
  INSERT INTO companies (name)
  SELECT company_name FROM business_accounts ORDER BY user_id
  RETURNING id
),
numbered_new AS (
  SELECT id, ROW_NUMBER() OVER () AS rn FROM new_companies
),
numbered_accounts AS (
  SELECT user_id, ROW_NUMBER() OVER (ORDER BY user_id) AS rn FROM business_accounts
)
UPDATE business_accounts ba
SET company_id = nn.id, role = 'owner'
FROM numbered_accounts na
JOIN numbered_new nn ON nn.rn = na.rn
WHERE ba.user_id = na.user_id;

-- =============================================================================
-- 4. Lock down now that every row has a value (safe after backfill)
-- =============================================================================
ALTER TABLE business_accounts
  ALTER COLUMN company_id SET NOT NULL,
  ALTER COLUMN role SET NOT NULL;

-- =============================================================================
-- 5. Drop the denormalized column (D-05) -- LAST schema-mutating step on
--    business_accounts. This is the irreversible-without-PITR step coupled to
--    the app-code deploy (Pitfall 4) -- production execution and the matching
--    app-code release are a separate manual runbook step (Plan 04), not part
--    of this migration file.
-- =============================================================================
ALTER TABLE business_accounts DROP COLUMN company_name;

-- =============================================================================
-- 6. Column-privilege lockdown (Pattern 3 / Security Domain T-59-04): prevents
--    a member from self-elevating to owner, or self-reassigning company_id, via
--    the existing own-row "Business updates own account" UPDATE policy.
-- =============================================================================
REVOKE UPDATE (role, company_id) ON business_accounts FROM authenticated;

-- =============================================================================
-- 7. Constraint swap on business_paikka_links (ACCESS-02). Confirm the exact
--    inline-UNIQUE constraint name via _audit/59-backfill-verification.sql
--    section 1 in staging before trusting this DROP -- IF EXISTS makes a wrong
--    name a harmless no-op but ALSO leaves the old constraint in place.
-- =============================================================================
DROP INDEX IF EXISTS business_paikka_links_paikka_id_unique;
ALTER TABLE business_paikka_links
  DROP CONSTRAINT IF EXISTS business_paikka_links_paikka_id_key;
ALTER TABLE business_paikka_links
  ADD CONSTRAINT business_paikka_links_account_paikka_unique
  UNIQUE (business_account_id, paikka_id);

-- =============================================================================
-- 8. current_company_id() helper (D-11/D-12). LANGUAGE sql + STABLE (not
--    plpgsql) so the Postgres planner can inline it into the calling RLS
--    policy's query plan. Read-only, no user-supplied input, no write/
--    injection surface (Security Domain T-59-02/T-59-05).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM business_accounts WHERE user_id = auth.uid();
$$;

-- Explicit grant required -- PostgreSQL revokes EXECUTE from PUBLIC by default
-- on newly created functions; do not rely on Supabase project defaults (Pitfall 2).
GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated;

-- =============================================================================
-- 9. companies RLS SELECT policy (Pitfall 3, D-14 self-scoped). No INSERT/
--    UPDATE policy -- all writes happen via this migration or supabaseAdmin
--    (service role), per CLAUDE.md "anon key is read-only after RLS".
-- =============================================================================
CREATE POLICY "Business reads own company"
  ON companies FOR SELECT
  USING (id = current_company_id());

-- =============================================================================
-- 10. Rewrite the business_paikka_links SELECT policy -- mechanical
--     self-scoped swap per D-14, NOT widened to company-wide visibility.
--     Company-wide widening is deferred to Phase 60/64. INSERT/UPDATE
--     policies on business_paikka_links are left as-is (D-07 keeps write
--     identity unchanged this phase). business_accounts own-row policies are
--     also left as-is (members still read/update their own row; co-worker
--     visibility is Phase 60/64).
-- =============================================================================
DROP POLICY IF EXISTS "business_paikka_links_select_own" ON business_paikka_links;
DROP POLICY IF EXISTS "Business reads own links" ON business_paikka_links;
CREATE POLICY "business_paikka_links_select_own"
  ON business_paikka_links FOR SELECT
  USING (business_account_id = auth.uid());

COMMIT;
