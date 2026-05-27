---
phase: 10-city-expansion
plan: "02"
subsystem: api
tags: [sync, google-places, multi-city, admin-route, parameterization]
dependency_graph:
  requires:
    - phase: 10-01
      provides: SUOMI_KAUPUNGIT array with 25 Finnish cities (lib/constants.ts)
  provides:
    - Parameterized /api/admin/sync-paikat route accepting ?kaupunki= param
    - SPORT_LAJIT array replacing hardcoded SPORT_QUERIES
    - Dynamic city coordinates lookup via SUOMI_KAUPUNGIT
    - Dynamic address filtering (parseOsoite) replacing hardcoded /tampere/i
  affects:
    - 10-03 (saasuositus route parameterization — same pattern)
    - 10-04 (city filter UI — relies on multi-city DB data)
tech_stack:
  added: []
  patterns:
    - Query param routing — ?kaupunki= defaults to Tampere if absent
    - City coordinate lookup via Array.find on SUOMI_KAUPUNGIT (with coord fallback)
    - Dynamic search query composition — "${hakutermi} ${kaupunki}"
    - onConflict: place_id deduplication preserves existing city rows on multi-city upsert
key_files:
  created: []
  modified:
    - app/api/admin/sync-paikat/route.ts
key_decisions:
  - "SPORT_LAJIT uses { hakutermi, laji } shape — laji is the DB value, hakutermi is query term without city"
  - "parseOsoite takes kaupunki param and uses p.toLowerCase() !== kaupunki.toLowerCase() — case-insensitive, dynamic"
  - "cityCoords fallback hard-codes Tampere coords — unknown city names still work (admin-only route, T-10-02-01)"
  - "Merged master into worktree branch before commit to get SUOMI_KAUPUNGIT from Plan 01"
patterns_established:
  - "Multi-city admin sync: pass ?kaupunki=<nimi>, route resolves coords from SUOMI_KAUPUNGIT"
requirements_completed:
  - DATA-05
  - DATA-06
duration: 3m
completed: "2026-05-27"
---

# Phase 10 Plan 02: Sync-paikat route parameterization — Summary

**Status: CHECKPOINT — awaiting human verification of Helsinki sync against live database**

sync-paikat admin route now accepts ?kaupunki=Helsinki/Turku/any-city, looks up Google Places coordinates from SUOMI_KAUPUNGIT, builds sport queries dynamically, and writes the resolved city name to the DB column.

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-27T08:10:51Z
- **Completed:** 2026-05-27T08:13:51Z (checkpoint reached)
- **Tasks:** 1/2 (Task 2 is checkpoint:human-verify)
- **Files modified:** 1

## Accomplishments

- `SPORT_QUERIES` array (8 hardcoded Tampere queries) replaced by `SPORT_LAJIT` (laji-only terms, no city)
- `fetchSportQuery` now takes `coords` parameter — uses city coordinates from `SUOMI_KAUPUNGIT` instead of `TAMPERE` constant
- `parseOsoite` now takes `kaupunki` parameter — filters city name dynamically instead of hardcoded `/tampere/i`
- GET handler reads `?kaupunki` query param, defaults to `'Tampere'`, looks up coordinates from `SUOMI_KAUPUNGIT`
- DB writes `kaupunki: kaupunki` (resolved param) instead of hardcoded `'Tampere'`
- `onConflict: 'place_id'` unchanged — Helsinki/Turku rows are isolated from Tampere rows by Google Places ID uniqueness

## Task Commits

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Parameterize sync-paikat route for multi-city support | 3fb939e | app/api/admin/sync-paikat/route.ts |
| 2 | CHECKPOINT: Helsinki sync human verification | — | awaiting |

## Files Created/Modified

- `app/api/admin/sync-paikat/route.ts` — Parameterized multi-city sync route; SPORT_LAJIT replaces SPORT_QUERIES; fetchSportQuery/parseOsoite now city-aware

## Decisions Made

- SPORT_LAJIT uses `{ hakutermi: string; laji: string }` shape: `hakutermi` is the laji-only search term (no city), `laji` is the DB column value. City is appended at call site: `${hakutermi} ${kaupunki}`.
- `parseOsoite` uses `p.toLowerCase() !== kaupunki.toLowerCase()` (case-insensitive comparison) per D-03.
- `cityCoords` falls back to Tampere coordinates when supplied `kaupunki` is not in `SUOMI_KAUPUNGIT` — accepts unknown city names, uses them in query string and DB write but centers search on Tampere (admin-only route, low risk per T-10-02-01).
- Merged master into worktree branch before committing — required to pick up SUOMI_KAUPUNGIT from Plan 01.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Merged master into worktree to resolve missing SUOMI_KAUPUNGIT**
- **Found during:** Task 1 (TypeScript verification)
- **Issue:** The worktree branch was created from `b9aa567` (before Plan 01 merged). `lib/constants.ts` in the worktree did not have `SUOMI_KAUPUNGIT`, causing TS2305 error.
- **Fix:** `git merge master --no-edit` (fast-forward) — brought Plan 01 commits into the worktree branch: `lib/constants.ts`, `lib/geo.ts`, and their tests.
- **Files affected:** lib/constants.ts, lib/geo.ts (already correct from Plan 01)
- **Outcome:** TypeScript clean after merge; no route.ts changes needed

---

**Total deviations:** 1 auto-fixed (Rule 3 — blocking)
**Impact on plan:** Required merge was safe (fast-forward, no conflicts). No scope creep.

## Threat Surface Scan

No new trust surfaces introduced. The `?kaupunki` parameter is admin-only (gated by Bearer token), used only in Google Places query string and DB column value — Supabase SDK parameterizes the upsert (no SQL injection risk). Per T-10-02-01 disposition: accepted.

## Known Stubs

None — route is fully parameterized; no hardcoded city name except the fallback default `'Tampere'` in the GET handler.

## Checkpoint Details (Task 2)

**Type:** checkpoint:human-verify
**Gate:** blocking

**What was built:** sync-paikat route now accepts `?kaupunki=Helsinki`, `?kaupunki=Turku`, defaults to `Tampere`.

**How to verify:**

1. Start the dev server: `npm run dev`
2. Run a Helsinki sync (replace `$ADMIN_SECRET` with your actual secret):
   ```
   curl -H "Authorization: Bearer $ADMIN_SECRET" "http://localhost:3000/api/admin/sync-paikat?kaupunki=Helsinki"
   ```
3. Expected response: JSON with `loydetty`, `tallennettu`, `website_loydetty` fields and no `error` key.
4. Check Supabase: query `liikuntapaikat` table and confirm rows with `kaupunki = 'Helsinki'` exist and have Helsinki-area addresses (not Tampere addresses).
5. Verify Tampere rows are intact: `SELECT count(*) FROM liikuntapaikat WHERE kaupunki = 'Tampere'` should still return the original count.

**Resume signal:** Type "approved" if Helsinki venues appear in DB alongside intact Tampere rows, or describe what failed.

## Self-Check: PASSED

- app/api/admin/sync-paikat/route.ts: FOUND (in worktree)
- 10-02-SUMMARY.md: FOUND (this file)
- Commit 3fb939e (feat sync-paikat parameterization): FOUND
- Acceptance criteria all pass (verified above)
- TypeScript: zero errors

## Next Phase Readiness

- Plan 02 code complete — route is ready to sync Helsinki and Turku venues
- Wave 2 also includes Plan 03 (saasuositus parameterization) which runs in parallel
- Plan 04 (city filter UI) depends on both Plans 02 and 03 — requires Helsinki/Turku DB data

---
*Phase: 10-city-expansion*
*Completed: 2026-05-27 (checkpoint — awaiting human verification)*
