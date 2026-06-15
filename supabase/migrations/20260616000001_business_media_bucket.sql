-- Phase 45: Create business-media Storage bucket for branding logos
--
-- Creates the public bucket that Phase 45 uploads logos to.
-- Path pattern: branding/{business_account_id}/logo.png
-- ON CONFLICT DO NOTHING makes this migration idempotent (safe to re-run).
-- No RLS policies needed — the bucket is public (logos are public images, per D-02).

INSERT INTO storage.buckets (id, name, public)
VALUES ('business-media', 'business-media', true)
ON CONFLICT (id) DO NOTHING;
