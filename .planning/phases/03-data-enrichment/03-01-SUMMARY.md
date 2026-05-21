---
phase: 03-data-enrichment
plan: 01
status: complete
completed: 2026-05-21
requirements_delivered:
  - DATA-01
  - DATA-02
---

# Summary — Plan 03-01: Ingestion Upgrade

## What was done

**Task 1 — lib/lajit.ts**
- Added `kiipeily` (lime green `#84cc16`) and `jääkiekko` (sky blue `#0ea5e9`) to `lajiKonfig`
- Added both to `LAJIT_FILTTERI` before 'Liikuntahalli'
- Added InfoWindow styles for both in `getInfoWindowStyle`

**Task 2 — Both API routes (identical changes)**
- Removed `detectLaji` function (replaced by query-based laji assignment)
- Removed `HAKU_RADIUS_M` constant
- Added `PlaceDetailsResult` and `OpeningHoursPeriod` interfaces
- Added `parseAukioloajat` — converts Google `opening_hours.periods` to day-keyed JSONB (`{ monday: { open: "06:00", close: "22:00" }, ... }`)
- Updated `fetchPlaceDetails` to request `opening_hours` field and return `aukioloajat`
- Added `SPORT_QUERIES` array (8 targeted searches) replacing single `"liikuntapaikat Tampere"` query
- Added `fetchSportQuery` function — runs one Text Search per sport, assigns laji by query context
- Rewrote GET handler: parallel sport queries → deduplicate by `place_id` → parallel Place Details → upsert with `aukioloajat`

## Verification
- `npx tsc --noEmit` exits 0
- Both route files: 8-entry SPORT_QUERIES, `parseAukioloajat`, `aukioloajat` in upsert
- lib/lajit.ts: 9 laji entries total

## Next
Run Plan 03-02 (pricing seed script), then call the sync endpoint to populate the DB.
