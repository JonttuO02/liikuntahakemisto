---
status: complete
phase: 49-esikatselu-ja-kontrastikorjaukset
source: [49-01-SUMMARY.md, 49-02-SUMMARY.md]
started: 2026-06-17T00:00:00Z
updated: 2026-06-17T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Logo Candidate Contrast
expected: In the business onboarding website-analysis step, when logo candidates are shown for selection, each logo now sits inside a light gray rounded backdrop box. A white or transparent-background logo is clearly visible against that gray box, not blending into the white card behind it. Clicking a candidate still shows a dark selection ring around it, the small type label under each logo is still there, and switching the selection still works.
result: pass

### 2. Step 6 Preview Card Style
expected: In the business onboarding wizard, Step 6 (preview) shows the first preview slot as a map-style "KARTTAKORTTI" (Finnish) / "MAP CALLOUT" (English) callout card — matching how the venue would look as a map pin callout — instead of the old list-style card. It renders fine even for a draft that has no coordinates yet (no crash, no broken/empty state). The DiagonaalKortti and PaikkaSheet preview sections below it are unchanged.
result: pass

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
