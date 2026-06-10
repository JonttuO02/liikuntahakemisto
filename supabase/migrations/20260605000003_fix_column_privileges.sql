-- Fix column-level privilege issues found in Phase 31 code review.
--
-- CR-01: Existing authenticated_update policy on liikuntapaikat uses WITH CHECK (true),
--   meaning any logged-in user could set business_managed = false and allow sync to
--   overwrite a managed venue. Revoke the column to prevent client-side clearing.
--
-- CR-02: The profiles UPDATE policy checks row ownership only (auth.uid() = user_id),
--   not column values. Any authenticated user could self-elevate to is_admin = true.
--   Revoke the column so only the service role (SQL Editor / server) can set it.
--
-- WR-01: business_paikka_links UPDATE policy allows a business to set claim_status = 'approved'
--   on their own rows, bypassing admin approval. Revoke the column.
--
-- WR-02: business_accounts UPDATE policy allows a business to set approval_status = 'approved'
--   on their own row, bypassing admin approval. Revoke the column.
--
-- Service role bypasses all column-level privileges, so admin operations via
-- supabaseAdmin / SQL Editor are unaffected.

-- CR-01: Prevent authenticated clients from clearing the business_managed flag
REVOKE UPDATE (business_managed) ON liikuntapaikat FROM authenticated;

-- CR-02: Prevent authenticated clients from self-elevating is_admin
REVOKE UPDATE (is_admin) ON profiles FROM authenticated;

-- WR-01: Prevent businesses from self-approving their own claim_status
REVOKE UPDATE (claim_status) ON business_paikka_links FROM authenticated;

-- WR-02: Prevent businesses from self-approving their own approval_status
REVOKE UPDATE (approval_status) ON business_accounts FROM authenticated;
