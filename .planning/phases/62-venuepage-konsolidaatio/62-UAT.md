---
status: complete
phase: 62-venuepage-konsolidaatio
source: [62-VERIFICATION.md]
started: 2026-07-01T02:26:23Z
updated: 2026-07-01T03:53:45Z
---

## Current Test

[testing complete]

## Tests

### 1. Full-card tap-to-open on DiagonaalKortti (CR-01 regression fix confirmation)
expected: Open the app (Etusivu), search for a venue so at least one result renders as a DiagonaalKortti card in the search list, and tap directly on the venue name / price / sport badge area (the LEFT info panel — NOT the photo thumbnail). Then open the TO DO (favorites) overlay and repeat on a saved card there. PaikkaSheet should open for the tapped venue in both cases, and the overlay you tapped from should be dismissed rather than remaining visible underneath the sheet.
result: pass

### 2. PaikkaSheet should layer over the search/TO DO overlay, not dismiss it
expected: Opening PaikkaSheet from a card in the search results list or the TO DO overlay should NOT close that underlying list/overlay. The sheet should open on top of it. Closing the sheet should return the user directly to the list/overlay they were browsing, not to the closed/collapsed base state.
result: issue
reported: "when opening paikkasheet from the list or todo overlay, the list or todo overlay that was browsed is closed as paikkasheet is opened. Thats bad because when browsing the list the user has to always reopen the list after opening any paikkasheet. So the fix would be that paikkasheet opens over the list or todo overlay, so when its closed again the user can continue browsing"
severity: major

## Summary

total: 2
passed: 1
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Opening PaikkaSheet from the search list or TO DO overlay leaves that list/overlay open underneath, so closing the sheet resumes browsing where the user left off."
  status: failed
  reason: "User reported: when opening paikkasheet from the list or todo overlay, the list or todo overlay that was browsed is closed as paikkasheet is opened. Thats bad because when browsing the list the user has to always reopen the list after opening any paikkasheet. So the fix would be that paikkasheet opens over the list or todo overlay, so when its closed again the user can continue browsing"
  severity: major
  test: 2
  artifacts: []
  missing: []
