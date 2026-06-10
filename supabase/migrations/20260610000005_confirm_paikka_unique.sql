-- Phase 35 WR-03: Confirm UNIQUE(paikka_id) constraint on business_paikka_links.
--
-- The original migration 20260605000000_business_accounts.sql already defines
-- UNIQUE(paikka_id) as a table constraint (creates an implicit unique index).
-- This migration adds an explicit named index for clarity and idempotent safety.
-- IF NOT EXISTS ensures no error if the constraint was already enforced.
--
-- This constraint is critical for the "Jo hallittu" (already claimed) logic:
-- without it, concurrent claim requests for the same venue from different
-- businesses could both succeed, creating two 'pending' links for the same venue.

CREATE UNIQUE INDEX IF NOT EXISTS business_paikka_links_paikka_id_unique
  ON business_paikka_links(paikka_id);
