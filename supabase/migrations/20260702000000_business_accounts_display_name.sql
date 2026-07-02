-- Add business_accounts.display_name (D-05) — the real name of an
-- invite-link employee, collected at signup time and shown in the
-- Phase 64 "team management" popup (ACCESS-04) so a päähallitsija can
-- identify who is requesting access / who is on the team, instead of a
-- bare user_id or email.
--
-- Write path: display_name is written ONLY via supabaseAdmin (service
-- role, bypasses RLS/privileges) at registration time
-- (app/api/business/register/route.ts, invite branch). This mirrors the
-- existing lockdown of `role` and `company_id` on this table — those
-- columns also have zero authenticated-role UPDATE privilege, because
-- they are set exclusively by trusted server-side code paths (register,
-- approve, remove-member handlers), never directly by the client.
--
-- Deliberately NOT doing here:
-- - Not adding an UPDATE privilege on display_name for the authenticated
--   role — there is no legitimate client-side write path for this
--   column.
-- - Not adding a column-only UPDATE privilege removal for display_name
--   either. Per STATE.md's Active Decision (confirmed in Phase 59):
--   removing UPDATE privilege at the column level does NOT work in this
--   codebase's Supabase setup — a pre-existing table-wide UPDATE
--   privilege overrides it. The correct lockdown pattern (already
--   applied to this table in
--   20260625000002_tighten_business_accounts_grant.sql) is to remove the
--   table-wide UPDATE privilege for authenticated and then explicitly
--   re-add UPDATE for an allow-list of columns. Since display_name has
--   no place in that allow-list, simply not adding it there is
--   sufficient — no new privilege statement is needed in this migration.

BEGIN;

ALTER TABLE business_accounts ADD COLUMN IF NOT EXISTS display_name TEXT;

COMMIT;
