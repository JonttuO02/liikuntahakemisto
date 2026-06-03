---
phase: 28-svg-ikonit
plan: "02"
subsystem: app/components
tags: [icons, svg, sport-icons, migration, lucide-cleanup]
dependency_graph:
  requires: [lib/sportIcons.tsx]
  provides: [migrated consumers]
  affects:
    - app/components/SportPin.tsx
    - app/components/PaikkaKortti.tsx
    - app/components/DiagonaalKortti.tsx
    - app/components/Etusivu.tsx
    - lib/lajit.ts
tech_stack:
  added: []
  patterns: [SportIcon component from lib/sportIcons, dangerouslySetInnerHTML compile-time constant]
key_files:
  created: []
  modified:
    - app/components/PaikkaKortti.tsx
    - app/components/DiagonaalKortti.tsx
    - app/components/Etusivu.tsx
    - lib/lajit.ts
decisions:
  - "SportPin.tsx was already migrated in Plan 28-01 (imported SPORT_ICONS from lib/sportIcons); Task 1 required no changes"
  - "Etusivu carousel and dropdown pills wrap SportIcon in a <span style={...}> because SportIcon does not accept a style prop"
  - "lib/lajit.ts cleaned of all Lucide imports and SPORT_ICONS export; only LajiKonfig, lajiKonfig, LAJIT_FILTTERI, getInfoWindowStyle remain"
metrics:
  duration: "~20 minutes"
  completed: "2026-06-03"
  tasks_completed: 3
  tasks_total: 3
  files_created: 0
  files_modified: 4
---

# Phase 28 Plan 02: Consumer Migration Summary

Migrated all 5 consumer files to draw sport icons from `lib/sportIcons.tsx`. Deleted the now-redundant `SPORT_ICONS` export and Lucide imports from `lib/lajit.ts`. TypeScript compiles with zero errors.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migrate SportPin to fill-based icons from lib/sportIcons | (pre-existing — done in 28-01) | app/components/SportPin.tsx |
| 2 | Migrate PaikkaKortti, DiagonaalKortti, and Etusivu to SportIcon | b1c574d | app/components/PaikkaKortti.tsx, app/components/DiagonaalKortti.tsx, app/components/Etusivu.tsx |
| 3 | Delete SPORT_ICONS and Lucide imports from lib/lajit.ts | bc28d8f | lib/lajit.ts |

## What Was Built

All sport icon render sites now use `SportIcon` or `SPORT_ICONS` from `lib/sportIcons.tsx`:

- **SportPin.tsx** — already migrated in Plan 28-01; imports `SPORT_ICONS` from `@/lib/sportIcons`, uses `dangerouslySetInnerHTML` to embed SVG paths inside the teardrop pin's `<g>` element with navy color (`#1e3a8a`)
- **PaikkaKortti.tsx** — sport badge renders `<SportIcon laji={paikka.laji} size={12} />` instead of a Lucide component
- **DiagonaalKortti.tsx** — sport badge (left panel, size 12) and fallback right panel (size 32) both use `SportIcon`
- **Etusivu.tsx** — three render sites all migrated:
  - `CalloutCard`: icon wrapped in `<span style={{ color: sportColor }}>` around `<SportIcon size={16} />`
  - Carousel filter pill: same `<span style>` pattern for color, `size={12}`
  - Dropdown filter list: same `<span style>` pattern, `size={12}`
- **lib/lajit.ts** — all Lucide imports removed, `SPORT_ICONS` export deleted; only `LajiKonfig`, `lajiKonfig`, `LAJIT_FILTTERI`, `getInfoWindowStyle` remain

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Observation] SportPin.tsx already migrated — Task 1 was a no-op**
- **Found during:** Task 1 read
- **Issue:** `app/components/SportPin.tsx` already imports `SPORT_ICONS` from `@/lib/sportIcons` (line 4), has no `const g =` helper, and has no local `const SPORT_ICONS` declaration. The migration was completed as part of the Plan 28-01 execution (even though 28-01's objective stated "no consumer files modified").
- **Fix:** Verified the file matches the Task 1 acceptance criteria exactly and proceeded to Task 2 without modification.
- **Commit:** n/a (no change needed)

## Verification Results

```
grep -r "SPORT_ICONS" app/components/
  → only SportPin.tsx (import from lib/sportIcons) — PASS

grep "lucide-react" app/components/PaikkaKortti.tsx
  → import { MapPin, Bookmark, BookmarkCheck } — PASS (no sport icons)

grep "lucide-react" app/components/DiagonaalKortti.tsx
  → import { MapPin, Check } — PASS (no sport icons, no Activity)

grep "SPORT_ICONS|lucide" lib/lajit.ts
  → zero matches — PASS

npx tsc --noEmit → Exit 0 — PASS
```

## Known Stubs

None — all render sites are wired to real SVG paths via `SPORT_ICONS` in `lib/sportIcons.tsx`.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes. `dangerouslySetInnerHTML` usage in `SportPin` and `SportIcon` is unchanged; `SPORT_ICONS` remains a compile-time constant (T-28-02 accepted per threat model).

## Self-Check: PASSED

- app/components/PaikkaKortti.tsx modified: CONFIRMED
- app/components/DiagonaalKortti.tsx modified: CONFIRMED
- app/components/Etusivu.tsx modified: CONFIRMED
- lib/lajit.ts modified: CONFIRMED
- Commit b1c574d exists: CONFIRMED
- Commit bc28d8f exists: CONFIRMED
- tsc --noEmit passes (exit 0): CONFIRMED
- SportPin.tsx imports from @/lib/sportIcons: CONFIRMED
- lib/lajit.ts has zero lucide/SPORT_ICONS references: CONFIRMED
