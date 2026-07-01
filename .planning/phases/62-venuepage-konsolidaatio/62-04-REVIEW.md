---
phase: 62-venuepage-konsolidaatio
reviewed: 2026-07-01T00:00:00Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - app/components/Etusivu.tsx
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 62: Code Review Report

**Reviewed:** 2026-07-01T00:00:00Z
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found

## Summary

Reviewed the 62-04 gap-closure diff in `app/components/Etusivu.tsx` (`git diff a6421bc41d47ef9b4c1128fec6bfcff5b8779089..HEAD`). The diff matches the stated description exactly: two `onOpen` handlers (TodoOverlay's `DiagonaalKortti` at line 1026, and the search-results-list `DiagonaalKortti` at lines 1422-1424) no longer call `setTodoOpen(false)` / `setSearchOpen(false)` before `setValittu(clicked)`. No unrelated changes were introduced.

The z-index claim in the task description is confirmed correct by inspection: the PaikkaSheet backdrop (`zIndex: 65`, line 1447) and PaikkaSheet itself (`zIndex: 66`, `PaikkaSheet.tsx:78`) both sit above the TodoOverlay (`zIndex: 62`, line 975) and the search-results list (`zIndex: 59`, line 1400), so no stacking changes were required — the fix is minimal and correctly scoped.

However, tracing every other place that reads `searchOpen`/`todoOpen` (`closeOverlays`, `openSearch`, `openTodoOverlay`, the drag handlers, the top toolbars, `CombinedFilterPill`) surfaces two state combinations that were **previously unreachable anywhere in the component** and are now reachable specifically because of this fix: `todoOpen === true && valittu !== null` simultaneously, and `searchOpen === true && valittu !== null` simultaneously. Both combinations interact with pre-existing code in ways that were never exercised before, producing two new edge-case bugs described below. Neither breaks the core UAT scenario (open a card from an overlay, close the sheet, see the overlay preserved), but both are real, reachable regressions worth fixing.

## Warnings

### WR-01: Floating TodoButton (z-index 66) stays clickable above the PaikkaSheet backdrop and can silently discard the hidden TodoOverlay's open state

**File:** `app/components/Etusivu.tsx:1176-1195` (button), interacting with the diff at `app/components/Etusivu.tsx:1026`

**Issue:** The fix makes `todoOpen === true` and `valittu !== null` reachable simultaneously for the first time (previously `openTodoOverlay()` always called `setValittu(null)`, and every other path that sets `valittu` — map pins at line 850-853, callout cards at line 863-874, cluster taps at line 899-904 — always calls `setSearchOpen(false)`/has no `todoOpen` coupling issue, so this combination never occurred).

The bookmark toggle button (`TodoButton`, fixed at `top: ...+48px, right: 16, zIndex: 66`) shares the same z-index as `PaikkaSheet` itself (`PaikkaSheet.tsx:78`, `zIndex: 66`), which is **higher** than the full-screen PaikkaSheet backdrop (`zIndex: 65`, line 1447). Because the backdrop only blocks elements with a lower z-index, this button remains visible and clickable even while the venue sheet is open and covering the rest of the screen.

Now that `todoOpen` can be `true` while a PaikkaSheet is open (reachable via: open TodoOverlay → tap a saved venue card → PaikkaSheet opens on top, TodoOverlay stays mounted underneath), tapping this floating button executes:
```tsx
onClick={() => {
  if (todoOpen) { resetInlineReview(); setTodoOpen(false) }
  else openTodoOverlay()
}}
```
Since `todoOpen` is `true`, this silently sets `todoOpen` to `false` — closing the (invisible, hidden-behind-the-sheet) TodoOverlay — while `valittu` remains set and the PaikkaSheet stays open with no visible change. When the user later closes the PaikkaSheet expecting to land back on their favorites list (the exact behavior this gap-closure fix was meant to preserve), they instead land on the bare map, because `todoOpen` was flipped to `false` behind the scenes.

**Fix:** Either lower the TodoButton's z-index below the PaikkaSheet backdrop (66 → e.g. 64) so it's correctly blocked while the sheet is open, or explicitly disable/hide it while `valittu !== null`:
```tsx
<motion.button
  ...
  disabled={!!valittu}
  style={{ ..., zIndex: valittu ? -1 : 66, pointerEvents: valittu ? 'none' : undefined }}
>
```

### WR-02: Search filter controls remain keyboard-focusable and interactive behind the PaikkaSheet's invisible backdrop

**File:** `app/components/Etusivu.tsx:1330-1368` (`CombinedFilterPill` incl. its `<input type="search">`), `app/components/Etusivu.tsx:1063-1086` (list-toggle button), interacting with the diff at `app/components/Etusivu.tsx:1422-1424`

**Issue:** This is the search-results-list analogue of WR-01, but manifests as an accessibility gap rather than a state-corruption bug. Before this fix, `searchOpen` was always set to `false` the instant a card's `onOpen` fired, so `searchOpen === true && valittu !== null` was never reachable anywhere in this component (every other entry point into `valittu` — pins, callout cards, clusters, `onShowMap` handlers — explicitly closes `searchOpen` first). This diff makes that combination reachable via: open search → browse results list → tap a card → PaikkaSheet opens, search UI stays mounted underneath.

`CombinedFilterPill` (including its live `<input type="search">`, city/sport toggle buttons) and the top-left "list toggle" button all render at `zIndex: 64`, below the PaikkaSheet's full-screen backdrop (`zIndex: 65`, line 1447), which has no background fill. A mouse user's clicks on these controls are correctly intercepted by the transparent backdrop, but the backdrop does nothing to remove these elements from the tab order or the accessibility tree (no `aria-hidden`, `inert`, or focus trap is applied to the background content when the PaikkaSheet acts as a modal). A keyboard or screen-reader user can therefore Tab into the hidden search input and city/sport filter buttons and interact with them while the PaikkaSheet is visually presented as the active surface.

**Fix:** When `valittu` is set, mark the background overlay content `inert` (or `aria-hidden="true"` plus `tabIndex={-1}` on interactive descendants) so it's excluded from the tab order and AT tree while the PaikkaSheet is open:
```tsx
<div style={{ ... }} inert={!!valittu || undefined}>
  {/* CombinedFilterPill + search results */}
</div>
```

## Info

### IN-01: Inconsistent `onShowMap` behavior between TodoOverlay and search-results cards regarding overlay state

**File:** `app/components/Etusivu.tsx:1026` (TodoOverlay) vs. `app/components/Etusivu.tsx:1415-1421` (search results)

**Issue:** Not introduced by this diff, but adjacent to it and worth noting since both `onOpen` handlers were just touched. The search-results list's `onShowMap` explicitly closes the overlay (`setSearchOpen(false)`) when the user taps "show on map," while the TodoOverlay's `onShowMap` (line 1026) does not call `setTodoOpen(false)` — it only sets the auto-zoom target, leaving the TodoOverlay open. This pre-existing asymmetry means "show on map" behaves differently depending on which overlay the card lives in. Now that `onOpen` behavior has been intentionally unified (both preserve overlay state), this remaining asymmetry in `onShowMap` may be worth reconciling in a follow-up for consistency, though it's outside the scope of this gap-closure fix.

**Fix:** No action required for this fix; consider aligning both `onShowMap` handlers' overlay-closing behavior in a future pass if the current asymmetry is unintentional.

---

_Reviewed: 2026-07-01T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
