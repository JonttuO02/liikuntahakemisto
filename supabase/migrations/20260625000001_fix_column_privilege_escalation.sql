-- Fix column-level privilege escalation found during Phase 59 staging verification
-- (D-02 gate on 20260625000000_companies_role_rls.sql).
--
-- ROOT CAUSE: REVOKE UPDATE (col) ON table FROM authenticated only removes a
-- column-specific grant. It does NOT narrow a pre-existing table-wide UPDATE
-- grant (Supabase grants table-wide UPDATE to `authenticated` by default), so
-- the "revoked" column remained fully updatable via the broader grant. This
-- affected every prior column-level REVOKE in this project, not just this
-- phase's new role/company_id columns:
--
--   20260605000003_fix_column_privileges.sql (Phase 31 code review):
--     CR-02: profiles.is_admin            -- self-elevation to admin
--     CR-01: liikuntapaikat.business_managed -- clients clearing the managed flag
--     WR-01: business_paikka_links.claim_status -- self-approving claims
--     WR-02: business_accounts.approval_status  -- self-approving accounts
--   20260625000000_companies_role_rls.sql (Phase 59, T-59-04):
--     business_accounts.role / company_id -- self-elevation to owner
--
-- FIX: revoke the table-wide UPDATE grant entirely, then re-grant UPDATE on an
-- explicit column allow-list -- everything that was previously updatable,
-- minus the specific column each prior fix intended to block. This preserves
-- all existing legitimate write paths (e.g. business contact_phone, profile
-- kotikaupunki/kiinnostukset, venue kuvaus/hinta fields) while actually
-- closing the escalation columns this time.
--
-- Verified against the live project via has_column_privilege() for both the
-- blocked columns (must return false) and a sample of legitimate columns
-- (must remain true) -- see 59-01-SUMMARY.md for the verification transcript.
--
-- NOT included: liikuntapaikat's row-level RLS is separately wide-open
-- (`USING (true)` on "Kirjautunut voi kirjoittaa" / authenticated_update /
-- authenticated_delete) -- any authenticated user can write/delete ANY row,
-- not just clear business_managed. That is a distinct, larger finding,
-- intentionally out of scope for this corrective migration; tracked
-- separately rather than bundled into this fix.

BEGIN;

REVOKE UPDATE ON business_accounts FROM authenticated;
GRANT UPDATE (user_id, created_at, role_in_company, contact_phone) ON business_accounts TO authenticated;

REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (user_id, kotikaupunki, updated_at, kiinnostukset) ON profiles TO authenticated;

REVOKE UPDATE ON liikuntapaikat FROM authenticated;
GRANT UPDATE (id, nimi, laji, osoite, kaupunki, latitude, longitude, hinta_min, hinta_max, varauslinkki, kuvaus, created_at, place_id, puhelin, hinta_kuvaus, aukioloajat, lajit_lista, featured, published, is_claimed, image_url, photo_urls, logo_url) ON liikuntapaikat TO authenticated;

REVOKE UPDATE ON business_paikka_links FROM authenticated;
GRANT UPDATE (id, business_account_id, paikka_id, link_type, created_at, rejection_reason, updated_at, submitted_at) ON business_paikka_links TO authenticated;

COMMIT;
