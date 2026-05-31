-- Add kiinnostukset (sport interests) column to profiles table.
-- text[] stores an array of sport keys (matching Object.keys(lajiKonfig) in lib/lajit.ts).
-- DEFAULT '{}' ensures existing rows return an empty array rather than NULL.
-- IF NOT EXISTS guard makes this migration idempotent on re-run.
-- No new RLS policies needed — the existing UPDATE policy already covers all columns.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kiinnostukset text[] DEFAULT '{}';
