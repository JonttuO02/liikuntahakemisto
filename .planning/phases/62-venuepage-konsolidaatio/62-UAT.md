---
status: testing
phase: 62-venuepage-konsolidaatio
source: [62-VERIFICATION.md]
started: 2026-07-01T02:26:23Z
updated: 2026-07-01T02:26:23Z
---

## Current Test

number: 1
name: Full-card tap-to-open on DiagonaalKortti (CR-01 regression fix confirmation)
expected: |
  PaikkaSheet opens for the tapped venue in both cases (search list and TO DO overlay),
  and the overlay you tapped from (search or TO DO) is dismissed rather than remaining
  visible underneath the sheet.
awaiting: user response

## Tests

### 1. Full-card tap-to-open on DiagonaalKortti (CR-01 regression fix confirmation)
expected: Open the app (Etusivu), search for a venue so at least one result renders as a DiagonaalKortti card in the search list, and tap directly on the venue name / price / sport badge area (the LEFT info panel — NOT the photo thumbnail). Then open the TO DO (favorites) overlay and repeat on a saved card there. PaikkaSheet should open for the tapped venue in both cases, and the overlay you tapped from should be dismissed rather than remaining visible underneath the sheet.
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
