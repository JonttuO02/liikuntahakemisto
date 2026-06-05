-- Create business_accounts and business_paikka_links tables for v1.7 Yritysportaali
-- Analog sources:
--   supabase/migrations/20260528083110_profiles.sql  -- UUID PK + SELECT/INSERT/UPDATE RLS triple
--   supabase/migrations/20260523_suosikit.sql        -- BIGSERIAL PK + UNIQUE + RLS
--   supabase/migrations/20260528_reviews.sql         -- inline CHECK constraint syntax
--
-- Decision log:
--   D-01: business_accounts.user_id = UUID PRIMARY KEY FK to auth.users (one account per user)
--   D-04: business_paikka_links.id = BIGSERIAL (many links per account)
--   D-05: UNIQUE(paikka_id) — one business owns each venue at a time
--   D-17: RLS SELECT/INSERT/UPDATE using auth.uid() = user_id
--   D-18: RLS SELECT/INSERT/UPDATE using auth.uid() = business_account_id
--
-- NOT included (deferred):
--   rejection_reason column — deferred to Phase 35 (D-03)
--   published column — deferred to Phase 33
--   admin-read policy — deferred to Phase 35

-- =============================================================================
-- TABLE: business_accounts
-- =============================================================================

CREATE TABLE IF NOT EXISTS business_accounts (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name    TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE business_accounts ENABLE ROW LEVEL SECURITY;

-- Business reads own account
CREATE POLICY "Business reads own account"
  ON business_accounts FOR SELECT
  USING (auth.uid() = user_id);

-- Business inserts own account (WITH CHECK -- not USING)
CREATE POLICY "Business inserts own account"
  ON business_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Business updates own account
CREATE POLICY "Business updates own account"
  ON business_accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- TABLE: business_paikka_links
-- =============================================================================
-- FK ordering: business_accounts must exist before business_paikka_links

CREATE TABLE IF NOT EXISTS business_paikka_links (
  id                  BIGSERIAL PRIMARY KEY,
  business_account_id UUID NOT NULL REFERENCES business_accounts(user_id) ON DELETE CASCADE,
  paikka_id           BIGINT NOT NULL REFERENCES liikuntapaikat(id) ON DELETE CASCADE,
  claim_status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (claim_status IN ('pending', 'approved', 'rejected')),
  link_type           TEXT NOT NULL
    CHECK (link_type IN ('claim', 'created')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(paikka_id)
);

-- Enable Row Level Security
ALTER TABLE business_paikka_links ENABLE ROW LEVEL SECURITY;

-- Business reads own links
CREATE POLICY "Business reads own links"
  ON business_paikka_links FOR SELECT
  USING (auth.uid() = business_account_id);

-- Business inserts own links (WITH CHECK -- not USING)
CREATE POLICY "Business inserts own links"
  ON business_paikka_links FOR INSERT
  WITH CHECK (auth.uid() = business_account_id);

-- Business updates own links
CREATE POLICY "Business updates own links"
  ON business_paikka_links FOR UPDATE
  USING (auth.uid() = business_account_id)
  WITH CHECK (auth.uid() = business_account_id);
