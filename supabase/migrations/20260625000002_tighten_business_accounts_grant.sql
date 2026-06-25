-- Tighten the business_accounts UPDATE grant from 20260625000001 (CR-01,
-- 59-REVIEW.md). That migration's allow-list preserved every column that was
-- already implicitly grantable pre-phase-59, rather than auditing which
-- columns have an actual client (authenticated, non-service-role) write path.
--
-- Two problems with the previous allow-list
-- (GRANT UPDATE (user_id, created_at, role_in_company, contact_phone) ...):
--
-- 1. `user_id` is the table's identity column, referenced by every RLS policy
--    as `auth.uid() = user_id`. The existing "Business updates own account"
--    policy's WITH CHECK (auth.uid() = user_id) already blocks an authenticated
--    user from actually committing a row with a mismatched user_id -- so this
--    was not an *active* exploit -- but granting UPDATE on an identity column
--    at all is bad defense-in-depth: it makes the invariant depend entirely on
--    one RLS policy never changing, instead of being structurally impossible.
--    There is also no legitimate reason for a client to ever attempt this.
-- 2. `created_at` is an audit timestamp with no legitimate client write path
--    anywhere in the reviewed application code.
--
-- `role_in_company` is NOT the bug the original review flagged it as -- it is
-- a real, pre-existing, intentional column (20260610000002_admin_columns.sql),
-- correctly distinct from this phase's new `role` enum, which the previous
-- migration already correctly excludes. But auditing actual write paths
-- (grep across app/) confirms no authenticated-client route updates
-- role_in_company after registration -- it is only ever set once via
-- supabaseAdmin (service role, bypasses this grant entirely) in
-- app/api/business/register/route.ts. So it doesn't need to be in this grant
-- either, on ordinary least-privilege grounds, not because it was confused
-- with `role`.
--
-- Verified: contact_phone is the ONLY business_accounts column with a real
-- authenticated-client UPDATE path (app/business/profiili/BusinessProfiiliClient.tsx:29,
-- `.update({ contact_phone: phone.trim() })`).
--
-- profiles/liikuntapaikat/business_paikka_links' grants from 20260625000001
-- have the same shape (preserved pre-existing grantable columns rather than
-- auditing write paths) but were not flagged by this review cycle and are
-- intentionally left untouched here -- liikuntapaikat in particular already
-- has a much larger, separately-tracked row-level RLS gap (USING (true)) that
-- makes column-level tightening there largely moot until that is fixed.

BEGIN;

REVOKE UPDATE ON business_accounts FROM authenticated;
GRANT UPDATE (contact_phone) ON business_accounts TO authenticated;

COMMIT;
