---
phase: 08-map-features
plan: "02"
subsystem: map
tags: [zoom-conditional-markers, mini-card, MapAutoZoom, bottom-sheet, HoursTable, AnimatePresence]
dependency_graph:
  requires: [08-01]
  provides: [zoom-pin-to-minicard, MapAutoZoom, expanded-bottom-sheet]
  affects: [app/components/Etusivu.tsx]
tech_stack:
  added: []
  patterns: [AnimatePresence-crossfade, useMap-imperative-zoom, zoom-conditional-render, 90vh-bottom-sheet]
key_files:
  created: []
  modified:
    - app/components/Etusivu.tsx
decisions:
  - "MapAutoZoom uses onComplete callback to reset autoZoomTarget after effect fires — ensures same-pin re-tap works"
  - "AnimatePresence mode=wait initial=false on each AdvancedMarker — crossfade without initial animation on mount"
  - "Pin click sets autoZoomTarget (not setValittu) — consistent with D-07, sheet only opens via mini-card"
  - "overflowY: auto on content div, maxHeight: 90vh on outer motion.div — scroll stays within sheet bounds"
  - "Booking URL shown twice intentionally: as Varaa→ CTA button AND as Varaussivu text link — CTA for direct booking, text for URL visibility"
metrics:
  duration: "8 minutes"
  completed: "2026-05-22"
  tasks_completed: 2
  files_modified: 1
  files_created: 0
---

# Phase 08 Plan 02: Zoom-Conditional Markers + Expanded Bottom Sheet Summary

Zoom-dependent pin→mini-card transformation on the fullscreen map using AnimatePresence crossfade at zoom threshold 16, MapAutoZoom component for imperative pan+zoom, and an expanded 90vh bottom sheet with full venue content (open status, hours table, phone, booking URL, description).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Pin→mini-card transformation with MapAutoZoom | 21a18c8 | app/components/Etusivu.tsx |
| 2 | Expand bottom sheet to 90vh with full venue content | ca84ede | app/components/Etusivu.tsx |

## What Was Built

**Task 1 — Pin→mini-card transformation + MapAutoZoom:**
- Added `MapAutoZoom` child component (above `getTimeBasedFallback`) that calls `useMap()` and runs `map.panTo(target) + map.setZoom(16)` imperatively when `target` changes.
- `onComplete` callback prop resets `autoZoomTarget` to null after effect fires, ensuring repeated taps on the same pin re-trigger the effect.
- Added `autoZoomTarget` state (`useState<{lat,lng}|null>(null)`) alongside `zoomLevel`.
- Replaced simple `<AdvancedMarker onClick={() => setValittu(p)}>` with zoom-conditional render:
  - `zoomLevel < 16`: renders `<motion.div key="pin">` with pin img; click sets `autoZoomTarget` (D-07)
  - `zoomLevel >= 16`: renders `<motion.div key="card">` with glass mini-card; click calls `setValittu(p)` (D-08)
- `AnimatePresence mode="wait" initial={false}` on each marker for smooth crossfade (duration 0.15s).
- Mini-card: `.glass rounded-xl` surface, minWidth 100px, maxWidth 140px, flex-col gap-1.
  - Sport pill with sport color background
  - Venue name (truncated)
  - Price string if available (hinta_kuvaus fallback to hintateksti)
- `<MapAutoZoom>` placed inside fullscreen Map after RecenterButton.
- Added `HoursTable` import and `formatGroupedHours`/`getOpenStatus` from `@/lib/aukiolo`.

**Task 2 — Expanded bottom sheet:**
- `maxHeight: '90vh'` added to outer `motion.div` style object.
- `overflowY: 'auto'` added to `px-5 pt-2 pb-2` content div.
- Open status inserted after address paragraph:
  - `getOpenStatus(valittu.aukioloajat)` — green "● Auki nyt · HH:MM–HH:MM" or muted "Suljettu · ..."
  - Skipped entirely when `status === 'no-data'`
- Hours table inserted after price+CTA row:
  - `formatGroupedHours(valittu.aukioloajat)` — grouped by matching day patterns
  - Section skipped when `groups.length === 0`
  - Separator `border-t border-[rgba(0,0,0,0.07)]` above section
- Phone section: `tel:` link when `valittu.puhelin` is non-null
- Booking URL section: external link guarded by `isSafeUrl(valittu.varauslinkki)` with `Varaussivu` label
- Description section: `valittu.kuvaus` paragraph when non-null
- Existing Varaa→ / Näytä tiedot CTA row preserved unchanged

## Deviations from Plan

### Baseline sync (handled automatically)

The worktree was branched from a pre-Phase-7 commit. The worktree's Etusivu.tsx still used `Marker` API (not `AdvancedMarker`), lacked `isSafeUrl`, `RecenterButton`, `zoomLevel` state, and GPS ripple rings from Phase 07 and 08-01.

**Resolution:** Applied `git show master:app/components/Etusivu.tsx` at start of execution to bring the worktree to the correct Phase 08-01 baseline before implementing Phase 08-02 changes. This is the same correction applied in 08-01 execution.

This is structural (the worktree was created from a stale branch point) but not architectural — the correct files to modify were always Etusivu.tsx. Handled automatically without user input.

## Acceptance Criteria Check

- [x] `MapAutoZoom` component definition with `useMap()` and `map.setZoom(16)` — line 68
- [x] `autoZoomTarget` state exists — line 95
- [x] `<MapAutoZoom target={autoZoomTarget} onComplete={...} />` inside fullscreen Map — line 402
- [x] Fullscreen markers use `AnimatePresence` with `key="pin"` (zoom<16) and `key="card"` (zoom>=16)
- [x] Pin click calls `setAutoZoomTarget` — NOT `setValittu`
- [x] Mini-card click calls `setValittu(p)` with `e.stopPropagation()`
- [x] Mini-card has `.glass rounded-xl` surface class
- [x] `HoursTable` import added — line 13
- [x] `formatGroupedHours` and `getOpenStatus` imported from lib/aukiolo — line 15
- [x] Bottom sheet outer motion.div has `maxHeight: '90vh'` — line 492
- [x] Content area has `overflowY: 'auto'` — line 506
- [x] Sheet renders open status when aukioloajat present
- [x] Sheet renders HoursTable when groups > 0
- [x] Sheet renders phone as tel: link
- [x] Sheet renders booking URL as external link (isSafeUrl guarded)
- [x] Sheet renders description
- [x] TypeScript compiles without errors (`npx tsc --noEmit` exits 0)
- [x] Each task committed individually (21a18c8, ca84ede)

## Threat Surface Scan

No new security surface beyond plan threat model:
- `varauslinkki` in new booking URL text section guarded by `isSafeUrl()` — T-08-02 mitigated
- `puhelin` in `tel:` link — no XSS risk (browser handles tel: scheme safely) — T-08-03 accepted

## Known Stubs

None — all data flows from Supabase via typed `Liikuntapaikka[]` prop. Hours, phone, booking URL and description render only when non-null; no hardcoded placeholders.

## Self-Check: PASSED

- [x] `app/components/Etusivu.tsx` — modified and committed (21a18c8, ca84ede)
- [x] Commit 21a18c8 exists (feat: MapAutoZoom + zoom-conditional markers)
- [x] Commit ca84ede exists (feat: expanded bottom sheet)
- [x] `grep -c "MapAutoZoom"` = 2 (definition + usage)
- [x] `grep -n "maxHeight.*90vh"` = line 492
- [x] `grep -c "HoursTable"` = 2 (import + usage)
- [x] TypeScript build: PASSED
