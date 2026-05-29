---
phase: 17-toolbar-haku-ux
plan: "01"
subsystem: ui/toolbar
tags: [toolbar, search, filter, state-cleanup, ux]
dependency_graph:
  requires: []
  provides:
    - unified-sport-filter-state
    - two-icon-toolbar-pill
    - searchFocused-autofocus-control
  affects:
    - app/components/Etusivu.tsx
tech_stack:
  added: []
  patterns:
    - unified-state-over-parallel-state
    - conditional-autofocus
    - glassmorphism-pill-toolbar
key_files:
  modified:
    - app/components/Etusivu.tsx
decisions:
  - "searchLaji drives both map pins (paikatKartalla) and card list results (searchSuodatettu) — single source of truth"
  - "searchFocused boolean controls autoFocus: true for Search button (type-to-search), false for LayoutList (browse mode)"
  - "isFilterActive computed as derived const (not state) before return — covers all four filter axes"
  - "Left toolbar pill is a plain div (no motion.div layout) — no expand/collapse, static two-icon layout"
metrics:
  duration_minutes: 15
  completed_date: "2026-05-29"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 1
---

# Phase 17 Plan 01: Toolbar & Haku-UX Refactor Summary

## One-liner

Unified toolbar: two-icon glass pill (Search + LayoutList) backed by single `searchLaji` filter state driving both map pins and card list results.

## What Was Built

Refactored `app/components/Etusivu.tsx` to replace the old two-button toolbar (SlidersHorizontal + Search with separate filter dropdown) with a simplified two-icon pill (Search + LayoutList). Merged the parallel `aktiivinen` and `searchLaji` filter states into `searchLaji` as the single source of truth for both map pins and card list.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove dead states and unify sport filter | d20bbac | app/components/Etusivu.tsx |
| 2 | Simplify toolbar JSX and fix autoFocus | 3735747 | app/components/Etusivu.tsx |

## Key Changes

### States Removed
- `aktiivinen` / `setAktiivinen` — replaced by `searchLaji`
- `leftOpen` / `setLeftOpen` — toolbar expansion removed
- `filterOpen` / `setFilterOpen` — sport dropdown removed
- `suodatettu` useMemo — was driven by `aktiivinen`, no longer needed

### States Added
- `searchFocused: boolean` — controls `autoFocus={searchFocused}` on search input

### Logic Changes
- `paikatKartalla` useMemo now filters directly via `searchLaji` (not `suodatettu`)
- `closeOverlays()` simplified to only call `setRightOpen(false)`
- `toggleSearch(focused: boolean)` accepts focused param, sets `searchFocused` state
- `isFilterActive` computed const: true when any filter axis is non-default

### JSX Changes
- Left toolbar: `motion.div layout` + expand/collapse AnimatePresence removed; replaced with static `div` containing exactly two `motion.button` (Search, LayoutList) and one thin divider
- Search button active state: icon color `#111111` when `isFilterActive || searchOpen`; dot indicator below icon when `isFilterActive`
- LayoutList button active state: icon color `#111111` when `searchOpen && !searchFocused`
- Right toolbar: "Haku" shortcut button removed from `rightOpen` expansion
- Search input: `autoFocus` changed from bare attribute to `autoFocus={searchFocused}`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Left toolbar JSX replaced in Task 1 instead of Task 2**
- **Found during:** Task 1 acceptance criteria check
- **Issue:** Task 1 acceptance criteria required zero references to `aktiivinen`, `leftOpen`, `filterOpen`, `suodatettu` — but the old left toolbar JSX contained all of these. Waiting until Task 2 would have caused Task 1's commit to fail verification.
- **Fix:** Replaced the entire left toolbar JSX block (including the filter dropdown AnimatePresence) in Task 1's commit. Task 2 focused on the remaining items: right toolbar "Haku" removal, MoreHorizontal trigger cleanup, and autoFocus fix.
- **Files modified:** app/components/Etusivu.tsx
- **Commit:** d20bbac

**2. [Rule 1 - Bug] MoreHorizontal trigger still referenced deleted state setters**
- **Found during:** Task 2 JSX review
- **Issue:** The MoreHorizontal button's `onClick` still called `setLeftOpen(false)` and `setFilterOpen(false)` after those state setters were deleted in Task 1. These dead references were cleaned up in Task 2.
- **Fix:** Updated onClick to only call `setRightOpen(r => !r)`.
- **Files modified:** app/components/Etusivu.tsx
- **Commit:** 3735747

## Verification Results

| Check | Result |
|-------|--------|
| `grep -c "SlidersHorizontal"` | 0 |
| `grep -c "aktiivinen"` | 0 |
| `grep -c "leftOpen"` | 0 |
| `grep -c "filterOpen"` | 0 |
| `grep -c "suodatettu"` | 0 |
| `grep "toggleSearch(true)"` | 1 match (Search button) |
| `grep "toggleSearch(false)"` | 1 match (LayoutList button) |
| `grep "autoFocus"` | 1 match: `autoFocus={searchFocused}` |
| `grep -c "bare onClick={toggleSearch}"` | 0 |
| `npx tsc --noEmit` | exit 0 |

## Known Stubs

None.

## Threat Flags

None — all changes are client-side state mutations with no server trust boundary crossed. No new network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check: PASSED

- app/components/Etusivu.tsx exists and was modified
- Commit d20bbac exists (Task 1)
- Commit 3735747 exists (Task 2)
- All acceptance criteria verified above
