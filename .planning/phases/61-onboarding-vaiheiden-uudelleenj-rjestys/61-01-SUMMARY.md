---
phase: 61-onboarding-vaiheiden-uudelleenj-rjestys
plan: "01"
subsystem: business-onboarding-api
tags: [api, i18n, validation, onboarding]
status: complete

dependency_graph:
  requires: []
  provides:
    - create-paikka-name-only-body
    - update-paikka-sijainti-section
    - onboarding-i18n-keys-6
  affects:
    - app/api/business/create-paikka/route.ts
    - app/api/business/update-paikka/route.ts
    - messages/fi.json
    - messages/en.json

tech_stack:
  added: []
  patterns:
    - finite-range-coordinate-validation
    - section-based-update-route

key_files:
  modified:
    - app/api/business/create-paikka/route.ts
    - app/api/business/update-paikka/route.ts
    - messages/fi.json
    - messages/en.json

decisions:
  - "latitude/longitude confirmed nullable (number | null in lib/types.ts, brandingResult.test.ts uses null values) — no NOT NULL DB constraint found in migrations; safe to insert null coordinates"
  - "sijainti section validates both coordinates as non-null before building payload, matching create-paikka range check exactly"

metrics:
  duration: ~5min
  completed: "2026-06-26T04:48:46Z"
  tasks_completed: 3
  files_modified: 4
---

# Phase 61 Plan 01: Data-Layer & i18n Foundation Summary

Non-UI data-layer foundation: relaxed create-paikka to name-only, added ownership-gated sijainti write section to update-paikka, and added 6 new onboarding i18n keys to both fi and en catalogs.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Relax create-paikka to require only yritysNimi | e41b087 | app/api/business/create-paikka/route.ts |
| 2 | Add 'sijainti' write section to update-paikka | 445f1df | app/api/business/update-paikka/route.ts |
| 3 | Add 6 onboarding i18n keys to fi.json and en.json | c697714 | messages/fi.json, messages/en.json |

## What Was Built

### Task 1 — create-paikka relaxed validation

Validation guard changed from requiring `yritysNimi + osoite + kaupunki + latitude + longitude` to requiring only `yritysNimi`. Insert payload now writes `osoite: osoite || null` and `kaupunki: kaupunki || null`. Coordinate parse logic (lines 47-53) was unchanged — it already returns `null` for missing/invalid values, which are now accepted.

**NOT NULL constraint check (Assumption A1):** `lib/types.ts` declares `latitude: number | null` and `longitude: number | null`. `lib/branding/brandingResult.test.ts` uses `latitude: null, longitude: null` in test fixtures. No migration in `supabase/migrations/` adds a NOT NULL constraint on these columns. Confirmed: nullable — safe to insert null coordinates.

### Task 2 — update-paikka 'sijainti' section

New `else if (section === 'sijainti')` branch added immediately before the `Invalid section` fallback. The branch:

- Validates `latitude` as finite number within -90..90 (returns 400 `{ error: 'Invalid coordinates' }` if null)
- Validates `longitude` as finite number within -180..180 (same)
- Builds update payload: `{ osoite, kaupunki, latitude, longitude }` with string fields trimmed and sliced at 500 chars
- Flows through the existing `business_paikka_links` ownership gate (T-61-01 IDOR mitigation)
- Coordinate validation mirrors create-paikka lines 47-53 exactly (T-61-02)

### Task 3 — i18n keys

Six new keys added to `Business` namespace in both files:

| Key | fi value | en value |
|-----|----------|----------|
| stepSubmit | Lahetys | Submit |
| stepNimiJaURLHeading | Paikkasi tiedot | Your venue details |
| stepNimiJaURLWebsiteLabel | VERKKO-OSOITE (VALINNAINEN) | WEBSITE (OPTIONAL) |
| stepNimiJaURLWebsiteHint | Verkko-osoitteen avulla taytamme tiedot automaattisesti | We'll use your website to prefill venue details |
| stepNimiJaURLWebsitePlaceholder | https://... | https://... |
| stepSijaintiHeading | Missa paikka sijaitsee? | Where is your venue? |

`stepPreview` key left in place (cleanup deferred per plan spec).

## Verification

- `npx tsc --noEmit`: no errors after each task
- `node -e "...i18n keys OK"`: all 6 keys present in both catalogs
- NOT NULL constraint check: confirmed nullable (lib/types.ts + test fixtures)

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Coverage

| Threat ID | Status |
|-----------|--------|
| T-61-01 (IDOR on paikka_id) | Mitigated — sijainti branch flows through existing business_paikka_links ownership gate |
| T-61-02 (out-of-range coordinates) | Mitigated — finite + +-90/+-180 range validation, returns 400 |
| T-61-03 (auth) | Preserved — supabaseAdmin.auth.getUser(token) unchanged |
| T-61-04 (junk venues) | Accepted — auth required + yritysNimi non-empty + published:false |

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundaries introduced.

## Self-Check: PASSED

- app/api/business/create-paikka/route.ts: modified and committed (e41b087)
- app/api/business/update-paikka/route.ts: modified and committed (445f1df)
- messages/fi.json: modified and committed (c697714)
- messages/en.json: modified and committed (c697714)
