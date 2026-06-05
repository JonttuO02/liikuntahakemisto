---
plan: 33-07
phase: 33-claim-paikan-luonti
status: complete
completed_at: 2026-06-06
---

# 33-07 Summary — supabase db push + smoke test

## What was done

**Task 1: Migration push**
- `supabase db push` confirmed `20260605000004_published_is_claimed.sql` already applied to remote (both columns aligned in `migration list`)
- Discovered and resolved a pre-existing migration history bug: `20260528_reviews.sql` sorted alphabetically after `20260528083110_profiles.sql` (underscore > digit in ASCII), causing the Supabase CLI's merge-join version comparison to break
- Fix: renamed to `20260528000000_reviews.sql` + updated remote `schema_migrations.version` to `20260528000000` via SQL editor
- Policies made idempotent via `DROP POLICY IF EXISTS` + `CREATE POLICY`
- `npx supabase db push` now returns "Remote database is up to date" cleanly

**Task 2: Smoke test — PASSED**
- Test 1: All previously visible venues appear on homepage ✅
- Test 2: Claim flow → search → select → "Ota haltuun" → Path B shows ✅
- Test 3: Create flow → "Luo uusi paikka" → fill form → "Luo paikka" → Path B shows ✅
- Test 4: Newly created venue does NOT appear on homepage (published=false) ✅
- Test 5: Implicit pass via Test 4 (user used different name than 'Testi Sali'; homepage absence confirms published=false) ✅

## Side effect noted

Once a business account has a linked venue, the /business page always shows Path B with no "back to search" button. This is by design for Phase 33 — full management/multi-venue support is Phase 36 (Hallintapaneeli).

## Migration history fix committed

`503048e` — fix(migrations): rename 20260528_reviews → 20260528000000_reviews to fix CLI sort order
