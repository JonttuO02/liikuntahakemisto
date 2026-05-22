---
phase: 06-ui-polish-and-data-foundation
plan: "07"
subsystem: frontend/map
tags: [weather-widget, sponsoroitu-badge, map-bottom-sheet, ai-widget]
dependency_graph:
  requires: ["06-01"]
  provides: ["AI-04", "ADS-02-map"]
  affects: ["app/components/Etusivu.tsx"]
tech_stack:
  added: []
  patterns: ["module-scope constant", "conditional JSX render", "inline badge"]
key_files:
  created: []
  modified:
    - app/components/Etusivu.tsx
decisions:
  - "WEATHER_CITY hardcoded as 'Tampere' per D-24 — no i18n lookup, trivial Phase 10 update"
  - "Sponsoroitu badge added independently to bottom-sheet, not via PaikkaKortti — per D-07/Pitfall 1"
metrics:
  duration: "5 minutes"
  completed: "2026-05-22T03:25:19Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 1
---

# Phase 06 Plan 07: Weather City Label and Bottom-Sheet Sponsoroitu Badge Summary

One-liner: WEATHER_CITY constant added to AI widget temperature row and amber Sponsoroitu badge wired to map bottom-sheet via valittu.featured guard.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add WEATHER_CITY constant and render city name after temperature (AI-04) | 9830722 | app/components/Etusivu.tsx |
| 2 | Add Sponsoroitu badge to map bottom-sheet (ADS-02 map portion) | 6998ee8 | app/components/Etusivu.tsx |

## What Was Built

**Task 1 — WEATHER_CITY constant + city label (AI-04):**
- Added `const WEATHER_CITY = 'Tampere'` immediately after `const NAV_H = 56` at module scope
- Replaced temperature span content: `{saa.temp}°` followed by muted city name `<span className="font-normal text-[rgba(17,17,17,0.45)]">{WEATHER_CITY}</span>`
- Corrected `font-semibold` → `font-bold` on the temperature span (CLAUDE.md typography rule: 400/700 only)
- Result: AI widget shows e.g. `7° Tampere` with city in muted gray

**Task 2 — Sponsoroitu badge in map bottom-sheet (ADS-02 map portion):**
- Appended `{valittu.featured && (<span ...>Sponsoroitu</span>)}` as sibling immediately after sport-pill IIFE closing `})()`
- Badge classes: `inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 ml-1.5`
- `Varaa →` CTA left unchanged per D-17
- Bottom-sheet JSX structure not refactored — kept independent from PaikkaKortti per D-07

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. Both changes wire directly to live data: `saa.temp` from Open-Meteo API, `valittu.featured` from Supabase (plan 01 ensures field reaches client).

## Threat Flags

None. Changes are compile-time constant rendering (T-06-14 mitigated: React auto-escapes text nodes) and boolean flag conditional display (T-06-15, T-06-16 accepted per threat model).

## Self-Check

Files exist:
- app/components/Etusivu.tsx: modified

Commits exist:
- 9830722: feat(06-07): add WEATHER_CITY constant and render city name in weather widget (AI-04)
- 6998ee8: feat(06-07): add Sponsoroitu badge to map bottom-sheet for featured venues (ADS-02)

## Self-Check: PASSED
