-- Phase 48 Task 2: additive column for the user's validated logo selection.
-- Analog source: 20260616100000_business_branding_plural_and_paikka_scoping.sql
-- (selected_background_color / selected_accent_color were added the same way — bare
-- nullable TEXT, no default).
--
-- This column is written by PATCH /api/business/branding only after the submitted
-- logo URL has been validated as a member of the row's own logo_candidates array
-- (T-48-13). Plan 03 reads this column back and carries it into media_urls.logo.

ALTER TABLE business_branding
  ADD COLUMN IF NOT EXISTS selected_logo_url TEXT;
