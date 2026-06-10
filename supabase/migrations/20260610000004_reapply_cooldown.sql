-- Phase 35 WR-02: Add updated_at to business_paikka_links for reapply cooldown enforcement.
-- The reapply endpoint checks updated_at to enforce a 24-hour cooldown between reapply attempts,
-- preventing admin queue flooding by repeated reapplications.

ALTER TABLE business_paikka_links
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill existing rows: set updated_at = created_at for historical rows
UPDATE business_paikka_links SET updated_at = created_at WHERE updated_at = now() AND created_at < now();

-- Trigger to automatically update updated_at on row changes
CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_paikka_links_set_updated_at
  BEFORE UPDATE ON business_paikka_links
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
