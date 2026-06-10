-- Create onboarding_draft table and add onboarding_completed to business_accounts for Phase 34
-- Analog sources:
--   supabase/migrations/20260605000000_business_accounts.sql  -- header comment, RLS triple policy pattern
--   supabase/migrations/20260605000004_published_is_claimed.sql -- ALTER TABLE ADD COLUMN IF NOT EXISTS pattern
--
-- Decision log:
--   D-03: onboarding_completed BOOLEAN added to business_accounts — /business page checks this to gate
--         wizard vs. management panel. Only submit Route Handler (JWT-verified, supabaseAdmin) sets it true.
--   D-05: onboarding_draft is a staging table — live liikuntapaikat data is not touched until Step 6
--         atomic commit. Draft isolation ensures in-progress wizard cannot corrupt published listings.
--   D-06: Step 6 submit Route Handler copies draft fields atomically to liikuntapaikat and deletes draft.
--   D-07: Wizard loads existing onboarding_draft on mount — resumes from current_step if draft exists.
--   D-11: media_urls JSONB stores { logo: string | null, photos: string[] } — paths in business-media bucket.
--   D-14: hinnasto JSONB stores Array<{ kategoria, hinta, lisatieto }> — serialized to hinta_kuvaus on submit.
--   D-16: aukioloajat JSONB uses English day keys (monday–sunday) matching lib/aukiolo.ts shape.
--
-- NOT included (handled in code, not schema):
--   Atomic commit logic — Route Handler at app/api/business/onboarding/submit/route.ts (Plan 34-09)
--   Step 6 submit flow — wizard component (Plans 34-07, 34-08)

-- =============================================================================
-- ALTER TABLE: business_accounts — add onboarding_completed gate column
-- =============================================================================
-- D-03: DEFAULT false — all existing accounts start as "not completed".
-- Only the submit Route Handler (JWT-verified, supabaseAdmin) flips this to true.
-- Cannot be set via anon client due to RLS UPDATE policy (auth.uid() = user_id).

ALTER TABLE business_accounts
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- =============================================================================
-- TABLE: onboarding_draft — wizard staging table
-- =============================================================================
-- D-05: Draft data accumulates here step by step.
-- UNIQUE(business_account_id, paikka_id) — one draft per business per venue.
-- D-06: Deleted by submit Route Handler after successful atomic copy to liikuntapaikat.

CREATE TABLE IF NOT EXISTS onboarding_draft (
  id                   BIGSERIAL PRIMARY KEY,
  business_account_id  UUID    NOT NULL REFERENCES business_accounts(user_id) ON DELETE CASCADE,
  paikka_id            BIGINT  NOT NULL REFERENCES liikuntapaikat(id)          ON DELETE CASCADE,
  media_urls           JSONB,
  hinnasto             JSONB,
  aukioloajat          JSONB,
  yhteystiedot         JSONB,
  current_step         INT     NOT NULL DEFAULT 1,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT onboarding_draft_unique_business_paikka UNIQUE (business_account_id, paikka_id)
);

-- =============================================================================
-- Enable Row Level Security
-- =============================================================================

ALTER TABLE onboarding_draft ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS Policies — all scoped to auth.uid() = business_account_id
-- =============================================================================
-- T-34-02-01: SELECT/INSERT/UPDATE/DELETE all require auth.uid() = business_account_id.
-- An anon user cannot read or modify another business's draft.

CREATE POLICY "Business reads own draft"
  ON onboarding_draft FOR SELECT
  USING (auth.uid() = business_account_id);

CREATE POLICY "Business inserts own draft"
  ON onboarding_draft FOR INSERT
  WITH CHECK (auth.uid() = business_account_id);

CREATE POLICY "Business updates own draft"
  ON onboarding_draft FOR UPDATE
  USING (auth.uid() = business_account_id)
  WITH CHECK (auth.uid() = business_account_id);

CREATE POLICY "Business deletes own draft"
  ON onboarding_draft FOR DELETE
  USING (auth.uid() = business_account_id);
