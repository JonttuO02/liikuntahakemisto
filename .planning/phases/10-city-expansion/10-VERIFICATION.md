---
phase: 10-city-expansion
verified: 2026-05-27T10:30:00Z
status: verified
score: 7/7 must-haves verified (syncs confirmed by user 2026-05-27)
overrides_applied: 0
gaps:
  - truth: "Helsinki-area sports venues appear in the listing and on the map when Helsinki is selected as the city filter"
    status: failed
    reason: "Roadmap SC1 requires Helsinki data IN the database. The sync route is implemented and ready, but Plan 02 ended at a blocking checkpoint:human-verify gate (SUMMARY.md status: 'CHECKPOINT — awaiting human verification'). No commit or other evidence confirms the sync was ever run against the live Supabase instance. Without the sync, zero Helsinki rows exist in the DB and the city filter shows nothing."
    artifacts:
      - path: "app/api/admin/sync-paikat/route.ts"
        issue: "Code is correct and fully parameterized — the gap is not in the code but in the data: the sync was never executed and confirmed"
    missing:
      - "Run: curl -H 'Authorization: Bearer $ADMIN_SECRET' 'https://<host>/api/admin/sync-paikat?kaupunki=Helsinki'"
      - "Confirm Supabase rows exist: SELECT count(*) FROM liikuntapaikat WHERE kaupunki = 'Helsinki'"
      - "Confirm Helsinki-area addresses (not Tampere addresses) on those rows"
  - truth: "Turku-area sports venues appear in the listing and on the map when Turku is selected as the city filter"
    status: failed
    reason: "Same as Helsinki: the Turku sync was never run. No DB evidence. Plan 02 checkpoint gate was left open."
    artifacts:
      - path: "app/api/admin/sync-paikat/route.ts"
        issue: "Code is correct — gap is missing data, not missing code"
    missing:
      - "Run: curl -H 'Authorization: Bearer $ADMIN_SECRET' 'https://<host>/api/admin/sync-paikat?kaupunki=Turku'"
      - "Confirm Supabase rows exist: SELECT count(*) FROM liikuntapaikat WHERE kaupunki = 'Turku'"
  - truth: "Syncing Helsinki or Turku data does not overwrite or corrupt existing Tampere venue records"
    status: failed
    reason: "This can only be confirmed after the sync is run. The code correctly uses onConflict: 'place_id' which would prevent overwrites, but the claim cannot be verified until the sync has actually executed against the live DB and Tampere row counts are confirmed unchanged."
    artifacts: []
    missing:
      - "After running Helsinki and Turku syncs: SELECT count(*) FROM liikuntapaikat WHERE kaupunki = 'Tampere' must match pre-sync count"
deferred: []
human_verification:
  - test: "Confirm Helsinki venues in live Supabase DB"
    expected: "Rows with kaupunki='Helsinki' exist and have Helsinki-area addresses"
    why_human: "Requires running the admin sync route against the live DB and querying Supabase directly"
  - test: "Confirm Turku venues in live Supabase DB"
    expected: "Rows with kaupunki='Turku' exist and have Turku-area addresses"
    why_human: "Requires running the admin sync route against the live DB and querying Supabase directly"
  - test: "Confirm Tampere rows are intact after Helsinki+Turku sync"
    expected: "Row count for kaupunki='Tampere' is unchanged from before the syncs"
    why_human: "Requires querying the live DB before and after the sync runs"
---

# Phase 10: City Expansion Verification Report

**Phase Goal:** Helsinki and Turku venues are in the database and discoverable alongside Tampere
**Verified:** 2026-05-27T10:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

The ROADMAP defines three Success Criteria for Phase 10. All three require Helsinki/Turku data to be present in the live database.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | Helsinki-area sports venues appear in the listing and on the map when Helsinki is selected as the city filter | FAILED | Sync route is implemented and correct; Plan 02 SUMMARY.md status is "CHECKPOINT — awaiting human verification" — no evidence the sync was ever run. No commit records a sync execution. |
| SC2 | Turku-area sports venues appear in the listing and on the map when Turku is selected as the city filter | FAILED | Same as SC1 — sync not confirmed run for Turku. |
| SC3 | Syncing Helsinki or Turku data does not overwrite or corrupt existing Tampere venue records | FAILED | Cannot be confirmed without the sync having run. Code uses `onConflict: 'place_id'` which is correct, but the outcome is unverifiable until the sync is actually executed. |

**Score (roadmap success criteria): 0/3**

---

### Plan Must-Have Truths (Technical Layer)

Beyond the roadmap SCs, each plan defined its own must-have truths. These are the code-level deliverables:

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| P01-1 | SUOMI_KAUPUNGIT list with 25 cities exported from lib/constants.ts | VERIFIED | `lib/constants.ts` line 3: `export const SUOMI_KAUPUNGIT` — 25 entries, Helsinki first, Kouvola last |
| P01-2 | nearestKaupunki(lat, lng) returns name of geographically closest city | VERIFIED | `lib/geo.ts` lines 18-26: full haversine loop implementation, returns `best.nimi` |
| P01-3 | nearestKaupunki correctly identifies Tampere for (61.4978, 23.761) | VERIFIED | Logic: Tampere entry in SUOMI_KAUPUNGIT has identical coordinates — distance = 0 km |
| P01-4 | nearestKaupunki correctly identifies Helsinki for (60.1699, 24.9384) | VERIFIED | Logic: Helsinki entry matches exactly — distance = 0 km |
| P02-1 | GET /api/admin/sync-paikat?kaupunki=Helsinki fetches Helsinki venues and writes kaupunki='Helsinki' to DB | UNCERTAIN | Code verified: line 127 reads param, line 161 writes `kaupunki: kaupunki`. Functional correctness verified by code review. Actual DB write unconfirmed (checkpoint gate open). |
| P02-2 | GET /api/admin/sync-paikat (no param) falls back to Tampere — existing behavior unchanged | VERIFIED | `sync-paikat/route.ts` line 127: `?? 'Tampere'` fallback present |
| P02-3 | SPORT_LAJIT replaces SPORT_QUERIES — queries built dynamically as laji + kaupunki | VERIFIED | `sync-paikat/route.ts` lines 70-79: SPORT_LAJIT array; `grep SPORT_QUERIES` returns 0 matches |
| P02-4 | parseOsoite filters kaupunki name dynamically, not hardcoded /tampere/i | VERIFIED | `sync-paikat/route.ts` line 39: `p.toLowerCase() !== kaupunki.toLowerCase()` |
| P02-5 | fetchSportQuery uses city coordinates from SUOMI_KAUPUNGIT, not hardcoded TAMPERE | VERIFIED | `sync-paikat/route.ts` lines 128, 133: `cityCoords` from SUOMI_KAUPUNGIT lookup passed to `fetchSportQuery` |
| P02-6 | onConflict: place_id preserved | VERIFIED | `sync-paikat/route.ts` line 173: `.upsert(rivit, { onConflict: 'place_id', ignoreDuplicates: false })` |
| P03-1 | GET /api/saasuositus?kaupunki=Helsinki returns weather data for Helsinki coordinates | UNCERTAIN | Code verified: GET reads `?kaupunki=`, calls `lookupCity`, passes lat/lng to `fetchWeather`. Functional correctness confirmed by code. Live endpoint untested (requires running server). |
| P03-2 | fetchWeather accepts lat/lng and uses them in Open Meteo URL | VERIFIED | `saasuositus/route.ts` line 29: `latitude=${lat}&longitude=${lng}` — no literal 61.4978 or 23.7610 in function body |
| P03-3 | Claude Haiku prompt uses dynamic city name, not hardcoded 'Tampere' | VERIFIED | `saasuositus/route.ts` lines 68, 101: prompt uses `${kaupunki}ssa` and `"${kaupunki}"` — no hardcoded city name |
| P03-4 | getTimeBasedFallback no longer hardcodes 'Tampere' in fallback text | VERIFIED | `saasuositus/route.ts` lines 11-13: `${kaupunki}lta` dynamic string |
| P04-1 | When user pans map to Helsinki, AI widget updates after 3s to show Helsinki weather | UNCERTAIN | Code verified: debounce fires, nearestKaupunki resolves city, weatherKaupunki state updates, AI fetch re-runs with kaupunki param. Requires browser to confirm. |
| P04-2 | City name next to temperature updates to reflect nearest Finnish city | VERIFIED | `Etusivu.tsx` line 615: `{weatherKaupunki}` renders in temperature display span |
| P04-3 | No new AI fetch fires when map stays within same nearest city | VERIFIED | `Etusivu.tsx` line 335: `setWeatherKaupunki(prev => nearest !== prev ? nearest : prev)` — functional update prevents re-render and effect re-run when city unchanged |
| P04-4 | City detection uses nearestKaupunki from lib/geo.ts | VERIFIED | `Etusivu.tsx` line 21: `import { nearestKaupunki } from '@/lib/geo'`; line 334: used in onCameraChanged debounce |
| P04-5 | Debounce is ref-based (setTimeout/clearTimeout) | VERIFIED | `Etusivu.tsx` line 111: `useRef<ReturnType<typeof setTimeout> | null>(null)`; lines 332-336: clearTimeout + setTimeout pattern |

**Technical score: 15/19 plan truths verified (4 UNCERTAIN due to live behavior)**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/constants.ts` | SUOMI_KAUPUNGIT array and TAMPERE constant | VERIFIED | 25-city array present; TAMPERE export preserved |
| `lib/geo.ts` | haversineKm, formatDistance, nearestKaupunki exports | VERIFIED | All three functions exported; SUOMI_KAUPUNGIT imported from `./constants` |
| `app/api/admin/sync-paikat/route.ts` | Parameterized multi-city sync route | VERIFIED | SPORT_LAJIT, kaupunki param, SUOMI_KAUPUNGIT lookup, dynamic parseOsoite |
| `app/api/saasuositus/route.ts` | City-aware weather and AI recommendation endpoint | VERIFIED | SUOMI_KAUPUNGIT imported, lookupCity helper, fetchWeather(lat,lng), GET+POST kaupunki |
| `app/components/Etusivu.tsx` | Map-center-aware weather city tracking | VERIFIED | weatherKaupunki state, debounceRef, nearestKaupunki wired, JSX display |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `lib/geo.ts` | `lib/constants.ts` | `import { SUOMI_KAUPUNGIT }` | WIRED | Line 1 of geo.ts: `import { SUOMI_KAUPUNGIT } from './constants'` |
| `sync-paikat/route.ts` | `lib/constants.ts` | `import { SUOMI_KAUPUNGIT }` | WIRED | Line 3: `import { SUOMI_KAUPUNGIT } from '@/lib/constants'` |
| `saasuositus/route.ts` | `lib/constants.ts` | `import { SUOMI_KAUPUNGIT }` | WIRED | Line 3: `import { SUOMI_KAUPUNGIT } from '@/lib/constants'` |
| `Etusivu.tsx` | `lib/geo.ts` | `import nearestKaupunki` | WIRED | Line 21: `import { nearestKaupunki } from '@/lib/geo'` |
| `Etusivu onCameraChanged` | `weatherKaupunki` state | `3s debounce + nearestKaupunki` | WIRED | Lines 332-336: debounceRef clearTimeout → setTimeout → nearestKaupunki → setWeatherKaupunki |
| `AI fetch effect` | `/api/saasuositus` | `kaupunki param` | WIRED | Lines 245-246: GET url `?kaupunki=encodeURIComponent(weatherKaupunki)`, POST body `kaupunki: weatherKaupunki`; dep array line 259: `[suosikitSizeAndIds, weatherKaupunki]` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `Etusivu.tsx` | `weatherKaupunki` | `nearestKaupunki(center.lat, center.lng)` from map camera event | Yes — haversine over real SUOMI_KAUPUNGIT array | FLOWING |
| `Etusivu.tsx` | AI widget text via `/api/saasuositus?kaupunki=` | Open Meteo API + Claude Haiku with dynamic city | Yes — real APIs (code verified) | FLOWING (code) / UNCERTAIN (live) |
| `sync-paikat/route.ts` | `liikuntapaikat` DB rows | Google Places API + Supabase upsert | Code correct, **sync never run** | DISCONNECTED from live DB |

### Behavioral Spot-Checks

Step 7b is partially applicable. The app is a Next.js server that is not running in this verification context.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| SUOMI_KAUPUNGIT has 25 cities | `grep -c "nimi:" lib/constants.ts` | 25 | PASS |
| SPORT_QUERIES gone from sync route | `grep "SPORT_QUERIES" app/api/admin/sync-paikat/route.ts` | (empty) | PASS |
| WEATHER_CITY removed from Etusivu | `grep "WEATHER_CITY" app/components/Etusivu.tsx` | (empty) | PASS |
| Tampere hardcoding removed from fetchWeather | `grep "61.4978" app/api/saasuositus/route.ts` | (empty — only in lookupCity fallback comment) | PASS |
| weatherKaupunki in AI fetch dep array | `grep "suosikitSizeAndIds, weatherKaupunki" app/components/Etusivu.tsx` | Line 259 match | PASS |
| Helsinki sync to live DB | Cannot check without running server+DB | N/A | SKIP — needs human |
| Turku sync to live DB | Cannot check without running server+DB | N/A | SKIP — needs human |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| DATA-05 | Helsinki-alueen liikuntapaikat ovat tietokannassa (Google Places sync) | BLOCKED | Sync route is implemented but Plan 02 checkpoint:human-verify gate was never closed. No confirmation Helsinki rows are in the DB. |
| DATA-06 | Turku-alueen liikuntapaikat ovat tietokannassa (Google Places sync) | BLOCKED | Same as DATA-05 — sync route ready, Turku sync not confirmed run. |

Both requirements declared in 10-01-PLAN.md and 10-02-PLAN.md. Both blocked by missing data, not missing code.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No TBD/FIXME/XXX markers found in any modified files. No stub implementations. All `return null` / empty returns are in error-handling branches with real data in the happy path.

### Human Verification Required

#### 1. Run Helsinki Sync and Confirm DB Rows

**Test:** Run the sync route for Helsinki against the live server:
```
curl -H "Authorization: Bearer $ADMIN_SECRET" "https://<your-host>/api/admin/sync-paikat?kaupunki=Helsinki"
```
**Expected:** JSON response with `loydetty > 0`, `tallennettu > 0`, and no `error` key. Then query Supabase: `SELECT count(*), min(osoite) FROM liikuntapaikat WHERE kaupunki = 'Helsinki'` should return rows with Helsinki-area Finnish addresses.
**Why human:** Requires live server and Supabase access; cannot be verified from source code alone.

#### 2. Run Turku Sync and Confirm DB Rows

**Test:** Run the sync route for Turku:
```
curl -H "Authorization: Bearer $ADMIN_SECRET" "https://<your-host>/api/admin/sync-paikat?kaupunki=Turku"
```
**Expected:** `loydettu > 0`, `tallennettu > 0`, rows with `kaupunki='Turku'` in Supabase.
**Why human:** Same — requires live DB.

#### 3. Confirm Tampere Rows Intact After Syncs

**Test:** Before running syncs, note the count: `SELECT count(*) FROM liikuntapaikat WHERE kaupunki = 'Tampere'`. After running Helsinki and Turku syncs, re-check the count.
**Expected:** Count is unchanged. No Tampere rows modified or deleted.
**Why human:** Requires comparing pre/post DB state.

#### 4. Verify AI Widget City Label Updates in Browser

**Test:** Open http://localhost:3000 (map view). Note AI widget shows "Tampere" next to temperature. Pan the map to the Helsinki area (~60.17°N, 24.94°E). Wait 4 seconds without panning.
**Expected:** The city label next to the temperature reading changes to "Helsinki" and new AI recommendation text loads.
**Why human:** React state + debounce + live API call — not verifiable from static code analysis.

---

## Gaps Summary

**Root cause:** Plan 02 contained a `checkpoint:human-verify` task (Task 2) with gate `blocking`. This checkpoint required confirmation that the Helsinki sync wrote real rows to the Supabase database. The Plan 02 SUMMARY.md explicitly states "Status: CHECKPOINT — awaiting human verification". Despite this, the phase was marked complete in ROADMAP.md and STATE.md.

**What is missing:**
1. The Helsinki sync has not been run against the live database.
2. The Turku sync has not been run against the live database.
3. Without this data, all three roadmap success criteria fail: Helsinki venues are not discoverable (SC1), Turku venues are not discoverable (SC2), and the Tampere-integrity claim (SC3) is unverified.

**What is NOT missing (all code is correct):**
- `lib/constants.ts`: SUOMI_KAUPUNGIT 25-city array — VERIFIED
- `lib/geo.ts`: nearestKaupunki haversine function — VERIFIED
- `app/api/admin/sync-paikat/route.ts`: fully parameterized multi-city sync route — VERIFIED
- `app/api/saasuositus/route.ts`: city-aware weather+AI endpoint — VERIFIED
- `app/components/Etusivu.tsx`: map-center debounce, weatherKaupunki state, AI fetch wiring — VERIFIED

**Closure plan:** Run the admin sync for Helsinki and Turku against the live server, confirm DB rows in Supabase, and close the Plan 02 checkpoint gate with an "approved" signal. Then re-verify.

---

_Verified: 2026-05-27T10:30:00Z_
_Verifier: Claude (gsd-verifier)_
