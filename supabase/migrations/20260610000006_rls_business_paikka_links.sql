-- Phase 35 WR-04: Confirm RLS on business_paikka_links protects rejection_reason.
--
-- The original migration 20260605000000_business_accounts.sql already:
--   1. Enables RLS on business_paikka_links
--   2. Creates "Business reads own links" SELECT policy: USING (auth.uid() = business_account_id)
--
-- Phase 35 added rejection_reason (a sensitive field) to the table. This migration
-- documents that the existing RLS policy already covers rejection_reason — no additional
-- policy is needed because the SELECT policy applies to all columns including rejection_reason.
--
-- Admin routes use the service role key (supabaseAdmin) which bypasses RLS automatically.
-- The client-side business dashboard (app/business/page.tsx) uses the anon key + user JWT,
-- which IS subject to RLS — the SELECT policy ensures users only see their own links.
--
-- This migration is a safety-net idempotent re-assertion. PostgreSQL silently no-ops
-- ENABLE ROW LEVEL SECURITY if RLS is already enabled, and CREATE POLICY IF NOT EXISTS
-- skips duplicate creation.

-- Re-assert RLS (no-op if already enabled)
ALTER TABLE business_paikka_links ENABLE ROW LEVEL SECURITY;

-- Re-assert the SELECT policy with a distinct name to document the Phase 35 audit.
-- Uses IF NOT EXISTS to avoid errors if the exact same policy name already exists.
CREATE POLICY IF NOT EXISTS "business_paikka_links_select_own"
  ON business_paikka_links FOR SELECT
  USING (business_account_id = auth.uid());
