---
status: complete
phase: 62-venuepage-konsolidaatio
source: [62-VERIFICATION.md]
started: 2026-07-01T02:26:23Z
updated: 2026-07-01T08:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Full-card tap-to-open on DiagonaalKortti (CR-01 regression fix confirmation)
expected: Open the app (Etusivu), search for a venue so at least one result renders as a DiagonaalKortti card in the search list, and tap directly on the venue name / price / sport badge area (the LEFT info panel — NOT the photo thumbnail). Then open the TO DO (favorites) overlay and repeat on a saved card there. PaikkaSheet should open for the tapped venue in both cases, layering ON TOP of the overlay while it remains mounted underneath (so closing the sheet resumes browsing).
result: pass

### 2. PaikkaSheet should layer over the search/TO DO overlay, not dismiss it
expected: Opening PaikkaSheet from a card in the search results list or the TO DO overlay should NOT close that underlying list/overlay. The sheet should open on top of it. Closing the sheet should return the user directly to the list/overlay they were browsing, not to the closed/collapsed base state.
result: pass
originally_reported: "when opening paikkasheet from the list or todo overlay, the list or todo overlay that was browsed is closed as paikkasheet is opened. Thats bad because when browsing the list the user has to always reopen the list after opening any paikkasheet. So the fix would be that paikkasheet opens over the list or todo overlay, so when its closed again the user can continue browsing"
severity_at_report: major
resolved_by: "Gap-closure plan 62-04 (commit 035ebc1) removed the setSearchOpen(false)/setTodoOpen(false) calls; re-tested and confirmed in Test 3 (result: pass)"

### 3. Re-test — PaikkaSheet layers over the search list / TO DO overlay (post-fix)
expected: Open Etusivu, search so at least one venue renders in the search results list, tap its info panel to open PaikkaSheet, then close the sheet. Confirm the search list is still there / resumes without needing to be manually reopened. Repeat with the TO DO (favorites) overlay: open it, tap a saved card, close the sheet, confirm the TO DO overlay's items are still shown. This re-tests the exact scenario from Test 2 after gap-closure plan 62-04 (commit 035ebc1) removed the setSearchOpen(false)/setTodoOpen(false) calls that caused it.
result: pass

### 4. WR-01/WR-02 follow-up fixes block interaction with hidden background controls
expected: Open the TO DO overlay, tap a saved card to open PaikkaSheet, then tap where the floating bookmark/TodoButton normally sits (top-right, below the nav pill). Confirm nothing happens and the TO DO overlay's contents are unaffected when the sheet is later closed. Separately, with a search result open and PaikkaSheet showing, use Tab on a keyboard and confirm you cannot focus the (hidden) search input, city/sport filter pills, or list-toggle button until the sheet is closed. This tests the 62-04-REVIEW.md follow-up fixes (commit 5221e7f).
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Opening PaikkaSheet from the search list or TO DO overlay leaves that list/overlay open underneath, so closing the sheet resumes browsing where the user left off."
  status: closed
  reason: "User reported: when opening paikkasheet from the list or todo overlay, the list or todo overlay that was browsed is closed as paikkasheet is opened. Thats bad because when browsing the list the user has to always reopen the list after opening any paikkasheet. So the fix would be that paikkasheet opens over the list or todo overlay, so when its closed again the user can continue browsing"
  severity: major
  test: 2
  closed_by: "Test 3 re-test (result: pass), gap-closure commit 035ebc1"
  root_cause: "app/components/Etusivu.tsx's onOpen callbacks for both DiagonaalKortti usages unconditionally call setSearchOpen(false) (search list, lines 1422-1425) / setTodoOpen(false) (TO DO overlay, line 1026) in the same handler that opens PaikkaSheet via setValittu(clicked). Both overlays are wrapped in <AnimatePresence>{flag && (...)}</AnimatePresence>, so clearing the flag unmounts them instead of leaving them mounted underneath the sheet. PaikkaSheet's own z-index (65/66) is already higher than the search-results list (59) and TO DO overlay (62), so simply not clearing the flag would let it layer correctly with no z-index changes needed. PaikkaSheet's onClose (-> setValittu(null)) also never restores searchOpen/todoOpen, compounding the symptom. Note: this reverses the exact behavior UAT Test 1 (CR-01 fix confirmation) asserted and passed against — Test 1's real intent was that tapping the info panel must trigger onOpen at all, not specifically that it must dismiss the overlay; the fix should update Test 1's phrasing/expectation to match, not just Test 2's."
  artifacts:
    - path: "app/components/Etusivu.tsx"
      issue: "onOpen handlers at lines 1026 and 1422-1425 unconditionally clear searchOpen/todoOpen, unmounting the overlay instead of layering the sheet on top of it"
  missing:
    - "Remove setSearchOpen(false) from the search-list onOpen handler (line ~1423) and setTodoOpen(false) from the TO DO overlay onOpen handler (line ~1026) — z-index stacking already supports correct layering without them"
    - "Verify PaikkaSheet's onClose (setValittu(null)) does not need to also close searchOpen/todoOpen, since they should now remain true throughout"
    - "Update 62-UAT.md Test 1's wording (it currently asserts the old dismiss-on-open behavior) to reflect the corrected intent: tapping the info panel opens PaikkaSheet, without requiring the overlay to close"
  debug_session: .planning/debug/paikkasheet-dismisses-search-todo-overlay.md
