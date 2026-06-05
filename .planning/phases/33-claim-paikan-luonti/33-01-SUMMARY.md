---
phase: 33-claim-paikan-luonti
plan: 01
subsystem: database
tags: [supabase, postgres, migration, rls]

# Dependency graph
requires:
  - phase: 31-db-skeema-storage-perusta
    provides: business_paikka_links schema, RLS policies on liikuntapaikat
  - phase: 32-yritysrekisterointi-auth
    provides: business_accounts table, supabaseAdmin pattern
provides:
  - published BOOLEAN column on liikuntapaikat (DEFAULT true, controls user-facing visibility)
  - is_claimed BOOLEAN column on liikuntapaikat (DEFAULT false, enables "Jo hallittu" display)
affects:
  - 33-02 (claim-paikka route handler sets is_claimed = true)
  - 33-03 (create-paikka route handler sets published = false, is_claimed = true)
  - 33-04 (hae-paikat API adds .eq('published', true) filter)
  - 33-06 (business/page.tsx shows "Jo hallittu" based on is_claimed)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ALTER TABLE ... ADD COLUMN IF NOT EXISTS pattern for safe idempotent migrations"
    - "Existing RLS public_read policy (USING true, no column list) covers all new columns without new policies"

key-files:
  created:
    - supabase/migrations/20260605000004_published_is_claimed.sql
  modified: []

key-decisions:
  - "published DEFAULT true — all existing venues stay visible immediately post-migration; only new venues created via create-paikka Route Handler get published = false"
  - "is_claimed DEFAULT false — all venues start unclaimed; claim-paikka and create-paikka handlers update to true after business_paikka_links insert"
  - "No new RLS policies needed — existing public_read policy in 20260519000001_enable_rls.sql has no column restriction and covers all columns automatically"

patterns-established:
  - "Migration comment pattern: cite CONTEXT.md decision ID (D-07, D-09) and explain DEFAULT choice rationale"

requirements-completed:
  - CLAIM-03

# Metrics
duration: 5min
completed: 2026-06-05
---

# Phase 33 Plan 01: DB-migraatio published ja is_claimed -sarakkeet

**Kaksi uutta boolean-saraketta liikuntapaikat-tauluun: published (DEFAULT true, uudet paikat piilotetaan) ja is_claimed (DEFAULT false, mahdollistaa "Jo hallittu" -tarkistuksen anon-kyselyissä)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-05T07:00:00Z
- **Completed:** 2026-06-05T07:05:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Luotiin migraatiotiedosto `20260605000004_published_is_claimed.sql` jossa molemmat ALTER TABLE -lauseet IF NOT EXISTS -suojauksella
- `published BOOLEAN NOT NULL DEFAULT true` — olemassa olevat paikat näkyvät automaattisesti, uudet paikat saavat `published = false` luontivaiheessa
- `is_claimed BOOLEAN NOT NULL DEFAULT false` — anon-kyselyt voivat tarkistaa claim-tilan suoraan liikuntapaikat-taulusta ilman RLS-ongelmia
- Vahvistettiin, ettei uusia RLS-politiikkoja tarvita (olemassa oleva `public_read` kattaa kaikki sarakkeet)

## Task Commits

1. **Task 1: Create migration 20260605000004_published_is_claimed.sql** - `0c5568c` (feat)

**Plan metadata:** (lisätään SUMMARY-commitissa)

## Files Created/Modified
- `supabase/migrations/20260605000004_published_is_claimed.sql` - Kaksi ALTER TABLE -lausetta, published ja is_claimed -sarakkeet, päätöslogikommenteilla (D-07, D-09)

## Decisions Made
- `published DEFAULT true` valittu siksi, että olemassa olevat tietueet pysyvät näkyvänä ilman erillistä UPDATE-skriptiä heti migraation jälkeen. Uudet paikat asetetaan `published = false` sovellustasolla (create-paikka Route Handler).
- `is_claimed` toteutettiin liikuntapaikat-tasolla (ei business_paikka_links-tarkistuksena) koska `business_paikka_links` SELECT-policy rajoittaa näkymän vain omiin riveihin — julkinen boolean-sarake on yksinkertaisempi ja turvallisempi ratkaisu.
- Ei uusia RLS-politiikkoja — 20260519000001_enable_rls.sql:n `public_read` (`USING (true)`, ei sarakelistaa) kattaa automaattisesti kaikki uudet sarakkeet.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Migration will be applied via `supabase db push` in Plan 33-07.

## Next Phase Readiness

- DB-skeema valmis: `published` ja `is_claimed` -sarakkeet olemassa
- Plan 33-02 (claim-paikka Route Handler) voi nyt asettaa `is_claimed = true` INSERT:n yhteydessä
- Plan 33-03 (create-paikka Route Handler) voi nyt asettaa `published = false` uusille paikoille
- Plan 33-04 (hae-paikat API) voi lisätä `.eq('published', true)` -suodattimen

---
*Phase: 33-claim-paikan-luonti*
*Completed: 2026-06-05*
