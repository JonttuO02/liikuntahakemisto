-- Phase 40 CLEAN-01: Delete all test business accounts.
-- All business_accounts rows are test data — no production business users exist.
-- This is a one-time cleanup migration and must NOT be applied to a production
-- database that has real business users.
--
-- Deletion strategy: delete from auth.users WHERE id IN (SELECT user_id FROM business_accounts).
-- The subquery evaluates before the DELETE executes, so all current business user IDs
-- are correctly captured even though business_accounts will be emptied by the cascade.
--
-- Cascade chain (ON DELETE CASCADE foreign keys):
--   auth.users → business_accounts (user_id)
--   business_accounts → business_paikka_links (business_account_id)
--   business_accounts → onboarding_draft (business_account_id)
--
-- Note: onboarding_completed column was already dropped in
-- supabase/migrations/20260611000000_drop_onboarding_completed.sql.
-- Do NOT attempt to drop it again here.
--
-- Idempotency: if business_accounts is already empty, the subquery returns an
-- empty set and the DELETE is a no-op. Safe to run multiple times.

DELETE FROM auth.users
WHERE id IN (SELECT user_id FROM business_accounts);
