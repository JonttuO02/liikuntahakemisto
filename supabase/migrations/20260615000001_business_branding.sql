-- Phase 44: Create business_branding table with RLS for v2.1 AI brand analysis
--
-- FK ordering: business_accounts must exist before business_branding
-- PK of business_accounts is user_id (UUID) — FK must reference business_accounts(user_id)
-- RLS pattern: SELECT/INSERT/UPDATE using auth.uid() = business_account_id
--   (same as business_paikka_links in 20260605000000_business_accounts.sql)
-- No DELETE policy — admin operations use service role key

CREATE TABLE IF NOT EXISTS business_branding (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_account_id  UUID        NOT NULL REFERENCES business_accounts(user_id) ON DELETE CASCADE,
  website_url          TEXT        NOT NULL,
  logo_url             TEXT,
  logo_type            TEXT        CHECK (logo_type IN ('icon', 'icon_with_text', 'text_only')),
  colors               JSONB,
  raw_analysis         JSONB,
  status               TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'analyzing', 'analyzed', 'failed')),
  error_message        TEXT,
  analyzed_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT business_branding_unique_account UNIQUE (business_account_id)
);

-- Index for FK lookups (keyed on business_account_id for UPSERT in Phase 45)
CREATE INDEX idx_business_branding_business_account_id
  ON business_branding(business_account_id);

-- Enable Row Level Security
ALTER TABLE business_branding ENABLE ROW LEVEL SECURITY;

-- Business reads own branding
CREATE POLICY "Business reads own branding"
  ON business_branding FOR SELECT
  USING (auth.uid() = business_account_id);

-- Business inserts own branding (WITH CHECK -- not USING)
CREATE POLICY "Business inserts own branding"
  ON business_branding FOR INSERT
  WITH CHECK (auth.uid() = business_account_id);

-- Business updates own branding
CREATE POLICY "Business updates own branding"
  ON business_branding FOR UPDATE
  USING (auth.uid() = business_account_id)
  WITH CHECK (auth.uid() = business_account_id);
