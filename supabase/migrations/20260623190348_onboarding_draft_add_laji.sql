-- Phase 55 Task 1: additive column for the user-confirmed sport category (AI-06, D-04).
-- Analog source: 20260606000000_onboarding.sql
--
-- This column holds the CONFIRMED laji, written exclusively via
-- POST /api/business/onboarding/save-step field 'laji' after the user
-- explicitly confirms or changes (Vahvista/Vaihda) the AI-suggested category
-- (business_branding.suggested_laji). Copied into liikuntapaikat.laji at
-- submit time. Plans 02/03 implement the read/write/copy paths.

ALTER TABLE onboarding_draft
  ADD COLUMN IF NOT EXISTS laji TEXT;
