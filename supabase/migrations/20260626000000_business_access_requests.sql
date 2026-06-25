-- Phase 60 ACCESS-03/ACCESS-06: business_access_requests table + RLS +
-- partial UNIQUE idempotency index + company_id nullability relaxation (D-09a).
--
-- Analog sources:
--   supabase/migrations/20260605000000_business_accounts.sql
--     -- table/RLS triple structure (SELECT/INSERT/UPDATE policies,
--        auth.uid() = owner-column), business_paikka_links shape this phase
--        composes with (business_account_id, paikka_id, claim_status FK targets)
--   supabase/migrations/20260625000000_companies_role_rls.sql
--     -- header/decision-log comment style, SECURITY DEFINER helper composition
--        via current_company_id(), REVOKE/GRANT column-privilege pattern,
--        Section 4 lines 122–124 that set company_id NOT NULL -- reversed here
--        in Step 1 for D-09a
--   supabase/migrations/20260625000001_fix_column_privilege_escalation.sql
--   supabase/migrations/20260625000002_tighten_business_accounts_grant.sql
--     -- CRITICAL precedent: table-wide REVOKE UPDATE before column allow-list
--        GRANT. A column-only REVOKE does NOT narrow Supabase's pre-existing
--        table-wide GRANT (discovered and fixed twice in Phase 59). Any future
--        column lockdown on business_access_requests MUST follow this two-step
--        shape. This migration avoids the problem entirely by adding NO UPDATE
--        RLS policy and NO authenticated UPDATE grant at all -- all status/
--        rejection_reason transitions happen exclusively via supabaseAdmin
--        (service role, bypasses RLS).
--
-- Decision log (.planning/phases/60-hallintaoikeuspyynn-t-backend-s-hk-posti/60-CONTEXT.md):
--   D-08: partial UNIQUE on (requester_id, paikka_id) WHERE status='pending'
--         enforces idempotent duplicate-submission handling at the DB layer.
--         A requester CAN have multiple historical rejected/approved rows for
--         the same venue -- uniqueness is only guarded while a request is
--         pending. Route handler catches unique-violation (Postgres 23505) and
--         returns the existing pending row rather than erroring (D-08 graceful).
--   D-09: If a requester already has company_id set, the submit endpoint blocks
--         the request -- switching companies is not a supported flow. Enforced
--         at the API layer (business-logic guard), not as a DB constraint, since
--         company_id can legitimately change (approval sets it).
--   D-09a (resolution, 2026-06-25): RESEARCH.md found that D-09's guard requires
--         invite-link signups to arrive with company_id = NULL -- but Phase 59
--         made company_id NOT NULL and /api/business/register always auto-creates
--         a company, making every existing account block D-09 literally. Resolved:
--         invite-link signup uses a registration path that does NOT auto-create a
--         company; this migration relaxes company_id back to nullable so those
--         accounts can exist until access-request approval sets it. This reverses
--         Phase 59's SET NOT NULL (20260625000000, lines 122-124) specifically
--         for the invite-link-signup code path. current_company_id() already
--         returns NULL gracefully for NULL-company rows (Phase 59 D-12, STABLE
--         SQL function), so no helper change is needed.
--   D-10: validated by the submit Route Handler BEFORE insert -- if the
--         invite link's paikka_id has no approved business_paikka_links row,
--         the endpoint rejects with a friendly Finnish error, no orphan row
--         created. This is a business-logic guard, not a DB constraint.
--   D-05: Approve/reject writes happen ONLY via supabaseAdmin (service role).
--         No UPDATE RLS policy is added for authenticated. No GRANT UPDATE on
--         business_access_requests to authenticated. Status transitions are
--         concurrency-safe via UPDATE ... WHERE status='pending' + count:'exact'
--         (Pattern 1, mirroring admin/approve route).
--
-- NOT included (deferred to Phase 64 or later):
--   Full approve/reject dashboard list (ACCESS-04) -- Phase 64 scope.
--   Company-wide business_paikka_links visibility widening (D-04/D-14) --
--     still deferred from Phase 59, not delivered here.
--   Member-removal flow (ACCESS-07) -- Phase 64 scope.
--   Any UPDATE RLS policy on business_access_requests -- status transitions
--     happen only via supabaseAdmin (D-05); no authenticated client ever
--     legitimately writes status/rejection_reason directly.
--
-- Existing RLS policy enumeration (T-60-01: every existing policy on tables
-- touched by this migration is explicitly enumerated; none changed by omission):
--   business_accounts (touched only to ALTER COLUMN company_id DROP NOT NULL):
--     "Business reads own account"   (SELECT, auth.uid() = user_id) -- KEEP AS-IS
--     "Business inserts own account" (INSERT, auth.uid() = user_id) -- KEEP AS-IS
--     "Business updates own account" (UPDATE, auth.uid() = user_id) -- KEEP AS-IS
--   business_access_requests (new table, all policies defined below):
--     "Requester reads own access requests" (SELECT) -- ADDED
--     "Owner reads requests for owned venues" (SELECT) -- ADDED
--     "Requester inserts own access request" (INSERT) -- ADDED
--     [no UPDATE policy by design -- D-05/T-60-02]

BEGIN;

-- =============================================================================
-- 1. Relax company_id to nullable (D-09a)
--    Reverses 20260625000000_companies_role_rls.sql lines 122-124.
--    Invite-link signups need company_id = NULL until their access-request
--    approval sets it to the inviting venue's company. current_company_id()
--    (Phase 59 D-12) already handles NULL gracefully -- returns NULL, and
--    NULL = anything is false in Postgres RLS USING clauses, so such rows
--    are automatically denied company-scoped access until company_id is set.
-- =============================================================================
ALTER TABLE business_accounts
  ALTER COLUMN company_id DROP NOT NULL;

-- =============================================================================
-- 2. New table: business_access_requests (ACCESS-03)
--    Columns match the RESEARCH.md DDL spec exactly. All 7 columns present.
-- =============================================================================
CREATE TABLE IF NOT EXISTS business_access_requests (
  id               BIGSERIAL PRIMARY KEY,
  requester_id     UUID        NOT NULL REFERENCES business_accounts(user_id) ON DELETE CASCADE,
  paikka_id        BIGINT      NOT NULL REFERENCES liikuntapaikat(id) ON DELETE CASCADE,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 3. D-08 partial UNIQUE index -- genuinely new to this codebase (no prior
--    partial UNIQUE index exists in any migration). Enforces that only ONE
--    pending request per (requester, venue) pair can exist at the DB layer.
--    Rejected/approved rows for the same pair are permitted (re-submit after
--    rejection is a valid flow). The Route Handler catches Postgres unique-
--    violation code 23505 and returns the existing pending row idempotently.
-- =============================================================================
CREATE UNIQUE INDEX business_access_requests_pending_unique
  ON business_access_requests (requester_id, paikka_id)
  WHERE (status = 'pending');

-- =============================================================================
-- 4. Enable RLS -- no default-allow gap (T-60-01)
-- =============================================================================
ALTER TABLE business_access_requests ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 5. RLS policies
--    Three policies: 2 SELECT + 1 INSERT. Deliberately NO UPDATE policy.
--    T-60-02: status/rejection_reason transitions happen EXCLUSIVELY via
--    supabaseAdmin in the approve/reject Route Handlers. This avoids the
--    column-only-REVOKE-doesn't-narrow-table-grant pitfall (Phase 59 D-02
--    gate / 20260625000001) by construction -- no UPDATE policy at all
--    is simpler and more defensive than creating one and column-revoking it.
-- =============================================================================

-- Requester reads own access requests.
-- Drives the D-06 "Pyyntösi odottaa hyväksyntää" banner: client-side
-- query for pending rows WHERE requester_id = auth.uid() returns results
-- only for the authenticated requester's own rows.
CREATE POLICY "Requester reads own access requests"
  ON business_access_requests FOR SELECT
  USING (auth.uid() = requester_id);

-- Owner reads requests for owned venues.
-- Composed with current_company_id() (Phase 59 D-11/D-12 SECURITY DEFINER
-- helper, avoids same-table RLS recursion). Scoped to venues the caller
-- owns via an approved business_paikka_links row -- not company-wide, per
-- D-04 (venue-scoped access, not company-wide). Needed so the owner session
-- can read pending requests in the future Phase 64 dashboard and so the
-- approve/reject Route Handlers can optionally use the authenticated client
-- for their pre-approve read (though D-05 uses supabaseAdmin, bypassing RLS).
CREATE POLICY "Owner reads requests for owned venues"
  ON business_access_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM business_paikka_links bpl
      JOIN business_accounts ba ON ba.user_id = bpl.business_account_id
      WHERE bpl.paikka_id    = business_access_requests.paikka_id
        AND bpl.claim_status = 'approved'
        AND ba.company_id    = current_company_id()
        AND ba.role          = 'owner'
    )
  );

-- Requester inserts own access request.
-- WITH CHECK (not USING) because this is an INSERT policy. The submit
-- Route Handler also enforces D-09/D-10 business-logic guards BEFORE this
-- INSERT executes; RLS only enforces identity (auth.uid() = requester_id),
-- consistent with the codebase's existing division of labour between RLS
-- (identity) and Route Handler validation (business rules).
CREATE POLICY "Requester inserts own access request"
  ON business_access_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- NO client-writable UPDATE policy -- see header comment and T-60-02 above.
-- A future authenticated UPDATE policy must follow the two-step
-- REVOKE UPDATE ON business_access_requests FROM authenticated; then
-- GRANT UPDATE (allow-list) TO authenticated; shape (per Phase 59 precedent)
-- rather than a column-only REVOKE.

COMMIT;
