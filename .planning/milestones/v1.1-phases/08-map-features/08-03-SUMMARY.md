---
phase: 08-map-features
plan: "03"
subsystem: map
tags: [in-app-navigation, useSearchParams, auto-zoom, map-focus, MAP-07]
dependency_graph:
  requires: [08-01, 08-02]
  provides: [profile-to-map-link, id-param-map-focus]
  affects: [app/paikat/[id]/page.tsx, app/components/Etusivu.tsx]
tech_stack:
  added: []
  patterns: [useSearchParams-url-param, imperative-map-focus, in-app-link]
key_files:
  created: []
  modified:
    - app/paikat/[id]/page.tsx
    - app/components/Etusivu.tsx
decisions:
  - "URL format is /?id=<paikka_id> — no ?nakyma=kartta (dead param per CLAUDE.md)"
  - "setValittu NOT called on ?id= arrival — only map opens and zooms, bottom sheet stays closed (D-13)"
  - "Number(focusId) coerces non-numeric to NaN — paikat.find returns undefined safely, no error thrown (T-08-04)"
  - "Worktree baseline synced from master before applying changes (same pattern as 08-01 and 08-02)"
metrics:
  duration: "5 minutes"
  completed: "2026-05-22"
  tasks_completed: 2
  files_modified: 2
  files_created: 0
---

# Phase 08 Plan 03: Profile Map Link + URL Focus Summary

Internal "Näytä kartalla" link from profile page to /?id=paikka.id, with Etusivu reading the ?id= param via useSearchParams to auto-open fullscreen map and zoom to the target venue.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Change profile page Näytä kartalla to internal Link | bdc81fb | app/paikat/[id]/page.tsx |
| 2 | Etusivu reads ?id= param and opens map focused on venue | 034b6e1 | app/components/Etusivu.tsx |

## What Was Built

**Task 1 — Internal link on profile page:**
- Replaced `<a href="https://maps.google.com/?q=lat,lng" target="_blank">` with `<Link href={`/?id=${paikka.id}`}>` inside the Sijainti Row
- Removed `target="_blank"` and `rel="noopener noreferrer"` — navigation stays in-app
- No `?nakyma=kartta` added (dead param per CLAUDE.md)
- `font-medium` changed to `font-bold` per plan spec (consistent with design system)

**Task 2 — useSearchParams id param handler in Etusivu:**
- Added `import { useSearchParams } from 'next/navigation'` to import block
- Added `const searchParams = useSearchParams()` and `const focusId = searchParams.get('id')` after state declarations
- Added useEffect that reads focusId, finds matching paikka by numeric id, calls `setKartaAuki(true)` and `setAutoZoomTarget({ lat, lng })` when found
- `setValittu` deliberately NOT called — bottom sheet stays closed (D-13), user taps mini-card to open it
- Non-numeric or unknown id is a safe no-op: `Number(focusId)` returns NaN, `paikat.find` returns undefined, effect exits early

## Deviations from Plan

### Baseline sync (handled automatically)

Worktree branched from pre-Phase-7 commit was missing 08-02 changes to Etusivu.tsx (MapAutoZoom, autoZoomTarget, AdvancedMarker, expanded bottom sheet). Applied `git show master:app/components/Etusivu.tsx` to sync to correct 08-02 baseline before implementing 08-03 changes. Same resolution pattern as 08-01 and 08-02 executions.

### font-medium changed to font-bold

Plan spec shows `font-bold` for the Näytä kartalla link; the existing code had `font-medium`. Changed to `font-bold` to match plan and CLAUDE.md design guidelines (only two weights: 400 and 700).

## Acceptance Criteria Check

- [x] `app/paikat/[id]/page.tsx` uses `<Link href={`/?id=${paikka.id}`}>` — line 71
- [x] No `maps.google.com` href for Näytä kartalla remains
- [x] No `?nakyma=kartta` in the href
- [x] `target="_blank"` and `rel` removed from the link
- [x] `useSearchParams` imported from 'next/navigation' — line 4
- [x] `focusId = searchParams.get('id')` in component body — line 99
- [x] useEffect calls `setKartaAuki(true)` and `setAutoZoomTarget` on focusId match — lines 162–167
- [x] Effect does NOT call `setValittu` — confirmed by inspection
- [x] TypeScript compiles without errors

## Threat Surface Scan

No new security surface beyond plan threat model:
- `focusId` URL param parsed as Number, matched against loaded paikat array — no Supabase query fired (T-08-04 mitigated)
- In-app Link navigation — no privilege escalation (T-08-05 accepted)

## Known Stubs

None.

## Self-Check: PASSED

- [x] `app/paikat/[id]/page.tsx` modified and committed (bdc81fb)
- [x] `app/components/Etusivu.tsx` modified and committed (034b6e1)
- [x] `grep "/?id=" app/paikat/[id]/page.tsx` matches
- [x] `grep "maps.google.com" app/paikat/[id]/page.tsx` returns no results
- [x] `grep "useSearchParams" app/components/Etusivu.tsx` returns 2 results (import + usage)
- [x] `grep "focusId" app/components/Etusivu.tsx` returns 5 results (declaration + effect)
- [x] TypeScript build: PASSED
