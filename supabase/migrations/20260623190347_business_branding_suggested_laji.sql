-- Phase 55 Task 1: additive column for Claude's raw laji suggestion (AI-06).
-- Analog source: 20260616110000_business_branding_selected_logo_url.sql
--
-- This column holds the UNCONFIRMED suggestion from the AI website analysis
-- pipeline (lib/branding/analyzer.ts). It is never read as the venue's actual
-- sport category — the user-confirmed value lives separately in
-- onboarding_draft.laji (see 20260623190348_onboarding_draft_add_laji.sql,
-- D-04) and is copied into liikuntapaikat.laji only after explicit user
-- confirmation.

ALTER TABLE business_branding
  ADD COLUMN IF NOT EXISTS suggested_laji TEXT;
