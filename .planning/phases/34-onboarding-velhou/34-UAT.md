---
status: complete
phase: 34-onboarding-velhou
source:
  - 34-12-SUMMARY.md
  - commit 07a5444
  - commit 680b5a8
started: "2026-06-10T18:30:00Z"
updated: "2026-06-10T19:00:00Z"
note: "Targeted re-test of 3 diagnosed gaps (fixed by 34-12 + follow-ups) + 1 new /business multi-venue test"
---

## Current Test

## Current Test

[testing complete]

## Tests

### 1. Step 6 preview — logo + photos visible, auto-updates on back-nav
expected: |
  Go through the wizard: upload a logo and 1–2 photos in Step 2 (Mediat), fill Steps 3–5,
  then advance to Step 6 (Esikatselu).
  Expected:
  - DIAGONAALIKORTTI left panel shows the uploaded logo image (not the grey Building2 icon).
  - PROFIILISIVU hero carousel slide 0 shows the first uploaded venue photo (not a Camera placeholder).
    Additional uploaded photos should appear as further slides.
  - Click Edellinen back to Step 4, change something, re-advance to Step 6.
    Expected: preview reflects the updated data automatically — no manual page refresh needed.
result: pass

### 2. Submit from Step 6 redirects to /business
expected: |
  On Step 6 (Esikatselu), click "Lähetä hyväksyttäväksi".
  Expected: submission succeeds without an error toast/message.
  You are redirected to /business (the business management panel).
  No "Submission failed" message appears.
result: pass

### 3. Back navigation preserves all step data + Step 5 done-state
expected: |
  Fill Step 3 (Hinnasto) with at least one price row and advance to Step 4.
  Fill Step 4 (Aukioloajat) with hours for at least one day and advance to Step 5.
  Fill Step 5 (Yhteystiedot) with phone/email and advance to Step 6.
  Expected: Step 5's icon in the top progress bar shows a done/checked state (not just the step number).
  Now click Edellinen back to Step 5, back to Step 4, back to Step 3.
  Expected: each step shows the data you entered — price rows, hours, and contact fields are all preserved.
result: pass

### 4. /business multi-venue management panel
expected: |
  After submitting (or log in as a business account that already has a submitted venue),
  go to /business.
  Expected:
  - The management panel lists your venue(s) with a claim_status badge (e.g. "Odottaa hyväksyntää" / pending).
  - A "+ Lisää paikka" button is visible.
  - Clicking it reveals a venue search form inline (without a full page navigation).
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
