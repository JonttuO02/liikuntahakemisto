---
phase: 62-venuepage-konsolidaatio
plan: 04
subsystem: ui
tags: [react, framer-motion, animatepresence, state-management]

# Dependency graph
requires:
  - phase: 62-venuepage-konsolidaatio (plans 01-03)
    provides: PaikkaSheet consolidation and the DiagonaalKortti onOpen wiring this plan fixes
provides:
  - PaikkaSheet now layers on top of the search-results list and TO DO overlay instead of unmounting them
  - Closing PaikkaSheet resumes browsing in the originating overlay (search list or TO DO)
  - 62-UAT.md Test 1 wording reconciled with the corrected product intent
affects: [63-business-dashboardin-preview-uudistus]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "onOpen handlers select a venue only (setValittu) — never clear the overlay-open flag in the same handler; z-index stacking (PaikkaSheet 65/66 > overlays 59/62) does the layering, not conditional mounting"

key-files:
  created: []
  modified:
    - app/components/Etusivu.tsx
    - .planning/phases/62-venuepage-konsolidaatio/62-UAT.md

key-decisions:
  - "Root cause was two one-line state mutations (setSearchOpen(false), setTodoOpen(false)) inside onOpen handlers, not a z-index or stacking-context issue — z-index already supported correct layering, so the fix was purely subtractive."
  - "UAT Test 1's original wording asserted the old (incorrect) dismiss-on-open behavior; reconciled its expected text to match Test 2 and the fix rather than re-running Test 1, since its underlying assertion (onOpen fires PaikkaSheet at all) was already passing and unaffected by this change."

patterns-established:
  - "onOpen callback contract for DiagonaalKortti instances in Etusivu.tsx: select venue only; overlay visibility flags (searchOpen/todoOpen) are owned exclusively by openSearch/openTodoOverlay/closeOverlays and PaikkaSheet's onClose never touches them, which is what lets AnimatePresence keep the overlay mounted underneath."

requirements-completed: [VENUEPAGE-03]

coverage:
  - id: D1
    description: "Opening PaikkaSheet from the search results list card leaves the search list mounted underneath (via z-index layering); closing the sheet returns the user directly to the search list."
    requirement: "VENUEPAGE-03"
    verification:
      - kind: unit
        ref: "rg -Uq --multiline-dotall region-anchored grep confirming no onOpen handler clears setSearchOpen(false)"
        status: pass
      - kind: manual_procedural
        ref: "62-UAT.md Test 2 human-check: search for a venue, tap card info panel, confirm sheet layers over the still-visible list, close and confirm return to list"
        status: unknown
    human_judgment: true
    rationale: "Visual layering/animation behavior across AnimatePresence and z-index stacking requires human visual confirmation in the running app; static analysis (tsc + grep) proves the state mutation is gone but not the rendered outcome."
  - id: D2
    description: "Opening PaikkaSheet from a saved card in the TO DO (favorites) overlay leaves the overlay mounted underneath; closing the sheet returns the user directly to the TO DO overlay."
    requirement: "VENUEPAGE-03"
    verification:
      - kind: unit
        ref: "rg -Uq --multiline-dotall region-anchored grep confirming no onOpen handler clears setTodoOpen(false)"
        status: pass
      - kind: manual_procedural
        ref: "62-UAT.md Test 2 human-check: open TO DO overlay, tap a saved card, confirm sheet layers over the overlay, close and confirm return to overlay"
        status: unknown
    human_judgment: true
    rationale: "Same as D1 — requires human visual confirmation of the rendered browse-open-close-browse flow."
  - id: D3
    description: "62-UAT.md Test 1 wording no longer asserts the overlay must be dismissed on open; it now describes PaikkaSheet layering over a still-mounted overlay, consistent with Test 2 and this fix."
    verification:
      - kind: unit
        ref: "rg -q 'should be dismissed rather than remaining visible underneath the sheet' .planning/phases/62-venuepage-konsolidaatio/62-UAT.md (expect no match)"
        status: pass
    human_judgment: false

# Metrics
duration: 6min
completed: 2026-07-01
status: complete
---

# Phase 62 Plan 04: PaikkaSheet Overlay-Layering Gap Closure Summary

**Removed two one-line state mutations in Etusivu.tsx so PaikkaSheet layers over the search results list and TO DO overlay (via existing z-index stacking) instead of unmounting them; reconciled UAT Test 1's wording with the corrected behavior.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-01T07:44:00Z
- **Completed:** 2026-07-01T07:50:02Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `app/components/Etusivu.tsx`: TO DO overlay card's `onOpen` handler no longer calls `setTodoOpen(false)` — only `setValittu(clicked)` remains, so the AnimatePresence-wrapped TO DO overlay stays mounted beneath PaikkaSheet.
- `app/components/Etusivu.tsx`: search results list card's `onOpen` handler no longer calls `setSearchOpen(false)` — only `setValittu(clicked)` remains, so the search list stays mounted beneath PaikkaSheet.
- `.planning/phases/62-venuepage-konsolidaatio/62-UAT.md`: Test 1's `expected:` wording corrected from "the overlay you tapped from should be dismissed" to describing PaikkaSheet layering on top of a still-mounted overlay — reconciling it with Test 2 and this fix.
- `npx tsc --noEmit` passes with zero errors after both edits.

## Task Commits

Each task was committed atomically:

1. **Task 1: Stop the onOpen handlers from unmounting their overlay** - `035ebc1` (fix)
2. **Task 2: Correct UAT Test 1 wording to match the fixed intent** - `20c8296` (docs)

_Note: This gap-closure plan required no test scaffolding (tdd not applicable) — both tasks were direct one-line/wording edits verified by `tsc` and region-anchored `rg` checks._

## Files Created/Modified
- `app/components/Etusivu.tsx` - Removed `setTodoOpen(false)` (line ~1026) and `setSearchOpen(false)` (line ~1422-1425) from the two DiagonaalKortti `onOpen` handlers; `onShowMap` handlers, `openSearch`/`openTodoOverlay`/`closeOverlays`, and PaikkaSheet's `onClose` were left untouched per plan instructions.
- `.planning/phases/62-venuepage-konsolidaatio/62-UAT.md` - Reworded Test 1's `expected:` field; `result: pass` and Summary counts unchanged.

## Decisions Made
- Confirmed via the pre-existing debug session (`.planning/debug/paikkasheet-dismisses-search-todo-overlay.md`) that PaikkaSheet's z-index (65/66) already exceeds both overlays (search list 59, TO DO 62), so the fix is purely subtractive — no z-index or stacking-context changes were made.
- Left PaikkaSheet's `onClose` (`setValittu(null)`) unchanged — it never touched the overlay flags to begin with, which is exactly why the overlay resumes visibility once the sheet closes (the flags were never cleared to start with, only re-cleared incorrectly by the two onOpen handlers now fixed).

## Deviations from Plan

None - plan executed exactly as written. Both tasks matched the plan's specified line-level edits precisely; the tsc and region-anchored grep verifications both passed on first attempt with no additional fixes required.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- VENUEPAGE-03 browse-continuity gap closed; the orchestrator's human-check step (62-UAT.md Test 2) should be re-run by a human to visually confirm the layering behavior in the running app, since this SUMMARY only proves the state-mutation removal via static analysis (tsc + grep), not the rendered AnimatePresence/z-index outcome.
- No blockers for Phase 63 (business-dashboardin & preview-näkymien uudistus), which depends on the consolidated venuepage from Phase 62 being feature-complete — this gap-closure plan does not change venuepage's feature surface, only its overlay-layering behavior when opened from these two specific surfaces.

## Self-Check: PASSED

---
*Phase: 62-venuepage-konsolidaatio*
*Completed: 2026-07-01*
