---
phase: 26-filtterit
plan: 01
subsystem: ui
tags: [react, framer-motion, sessionStorage, typescript, filter-state]

requires:
  - phase: 25-todo-overlay
    provides: Etusivu.tsx with TodoButton, TodoOverlay, PaikkaSheet — blast-radius file at stable state before filter refactor

provides:
  - searchLaji as string[] (multi-select foundation) throughout Etusivu.tsx
  - Dead filter state (searchKertakaynti, searchAukinyt) fully removed
  - sessionStorage _v:2 migration — old sessions rejected cleanly
  - Clean two-filter state model: searchLaji + searchKaupunki only

affects: [26-02-carousel-pills, 26-filtterit]

tech-stack:
  added: []
  patterns:
    - "sessionStorage versioning: _v field enables clean migration when state shape changes"
    - "Multi-select filter: string[] with length===0 meaning 'all', includes() for specific match"

key-files:
  created: []
  modified:
    - app/components/Etusivu.tsx

key-decisions:
  - "searchLaji is string[] throughout — empty array means all, array with items means multi-select"
  - "sessionStorage _v:2 version guard discards entire stored state if version mismatches — no partial restores"
  - "Dead buttons (Kertakäynti OK, Auki nyt) removed from filter row JSX to fix TypeScript errors caused by state removal"

patterns-established:
  - "Filter predicate: searchLaji.length === 0 || searchLaji.includes(p.laji.toLowerCase())"
  - "isFilterActive: searchLaji.length > 0 || searchKaupunki !== 'Kaikki'"
  - "sessionStorage restore: check _v !== 2 first, discard if mismatch"

requirements-completed: [FILTER-02]

duration: 15min
completed: 2026-06-02
---

# Phase 26 Plan 01: Filter State Refactor Summary

**Dead filter state (searchKertakaynti, searchAukinyt) removed and searchLaji migrated from string to string[] with sessionStorage _v:2 versioning**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-02T10:05:00Z
- **Completed:** 2026-06-02T10:20:00Z
- **Tasks:** 2 (executed atomically in one commit due to mutual dependency)
- **Files modified:** 1

## Accomplishments

- Removed searchKertakaynti and searchAukinyt state variables and all their usages from Etusivu.tsx
- Removed getOpenStatus and isMembershipOnly imports (no callers remain)
- Changed searchLaji from string to string[] with multi-select filter predicate
- Added sessionStorage _v:2 version field; restore rejects any stored state without it
- TypeScript compiles clean with 0 errors

## Task Commits

Each task was committed atomically:

1. **Task 1 + Task 2: Remove dead filter state and migrate sessionStorage** - `008a7fc` (refactor)

*Note: Tasks 1 and 2 were combined into a single commit because removing the state variables in Task 1 immediately caused TypeScript errors in the Task 2 code sites (handleCardClick and sessionStorage restore). Both tasks touched the same logical unit of change.*

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `app/components/Etusivu.tsx` - Removed dead filter state, updated searchLaji to string[], added _v:2 sessionStorage versioning, removed dead filter row buttons

## Decisions Made

- Tasks 1 and 2 committed atomically (single commit) — state removal and sessionStorage migration are mutually dependent; splitting would leave TypeScript errors between commits.
- Dead filter row buttons (Kertakäynti OK, Auki nyt) removed from JSX as part of Task 1 (blocking Rule 3) — Plan said "do not touch filter row", but the buttons referenced the now-deleted state variables, making TypeScript compilation impossible.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed dead filter buttons from filter row JSX**
- **Found during:** Task 1 (after removing state declarations)
- **Issue:** Filter row JSX referenced `searchKertakaynti`, `setSearchKertakaynti`, `searchAukinyt`, `setSearchAukinyt` — all deleted in Task 1. TypeScript compilation would fail without removing these JSX references.
- **Fix:** Removed the `<motion.button>` elements for "Kertakäynti OK" and "Auki nyt" from the filter row. The `<select>` elements and paikkaa count span were preserved. Plan 26-02 will replace the remaining `<select>` elements with carousel pills.
- **Files modified:** app/components/Etusivu.tsx
- **Verification:** `npx tsc --noEmit` returns 0 errors
- **Committed in:** 008a7fc

**2. [Rule 1 - Bug] Fixed paikatKartalla predicate to use string[] comparison**
- **Found during:** Task 1 (TypeScript check after state refactor)
- **Issue:** `paikatKartalla` useMemo at line 608 still used `searchLaji === 'Kaikki' || p.laji.toLowerCase() === searchLaji.toLowerCase()` — incompatible with string[] type
- **Fix:** Changed to `searchLaji.length === 0 || searchLaji.includes(p.laji.toLowerCase())`
- **Files modified:** app/components/Etusivu.tsx
- **Verification:** `npx tsc --noEmit` returns 0 errors
- **Committed in:** 008a7fc

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for TypeScript compilation. The JSX fix removes dead UI exactly as FILTER-02 requires. No scope creep.

## Issues Encountered

None beyond the auto-fixed TypeScript errors above.

## Next Phase Readiness

- Plan 26-02 (carousel pills) can now build on the clean string[] state model
- Filter row JSX currently has only the kaupunki `<select>` and count span — ready for carousel pill replacement
- sessionStorage _v:2 migration complete; no stale filter state can leak from old sessions

---
*Phase: 26-filtterit*
*Completed: 2026-06-02*
