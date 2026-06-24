-- Phase 57 fix-task: explicit submitted_at timestamp on business_paikka_links.
--
-- Distinguishes "claim_status='pending' because the venue was created but never
-- actually submitted for review" (submitted_at IS NULL) from "claim_status='pending'
-- because onboarding/submit ran and reset it for genuine admin review"
-- (submitted_at IS NOT NULL). Set exclusively by POST /api/business/onboarding/submit.
--
-- No backfill: existing rows are left NULL. They either predate this column and are
-- already approved/rejected (submitted_at irrelevant), or are genuinely-pending links
-- from before this fix shipped — those fall into the "pending, never explicitly
-- submitted" bucket post-fix (i.e. render as Kesken), which is an accepted one-time
-- reclassification per the user's decision.

ALTER TABLE business_paikka_links
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
