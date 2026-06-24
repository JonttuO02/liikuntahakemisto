---
status: complete
phase: 56-claim-create-rework-luo-paikka-alusta-nimik-yt-nt
source: [56-01-SUMMARY.md, 56-02-SUMMARY.md, 56-REVIEW-FIX.md]
started: 2026-06-24T06:09:46Z
updated: 2026-06-24T06:18:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Create venue with company name only
expected: On /business, clicking "+ Lisää paikka" opens a create-only form: "Luo paikka" heading, no search box, no "Luo uusi paikka sen sijaan" link. Fill only "Yrityksen nimi" + pick a map location, leave "Toimipisteen nimi" empty, submit. Venue is created and you land on /business/onboarding?paikka_id=... with no trailing space in the venue name.
result: pass

### 2. Create venue with company + branch name
expected: Fill both "Yrityksen nimi" and "Toimipisteen nimi (valinnainen)", submit. The created venue's name is the two values joined by a single space (e.g. "FitLife Oy Keskusta").
result: pass

### 3. Blank company name is rejected client-side
expected: Leave "Yrityksen nimi" empty, submit. An inline error "Yrityksen nimi on pakollinen." appears and no request is sent (no navigation, no loading state).
result: pass

### 4. Missing/failed location shows an actionable error
expected: Try to submit without picking a location (or in a state where reverse-geocoding the city fails). Instead of a silent failure, a visible error message appears telling you the location/city couldn't be determined, and submit is blocked until you provide one.
result: pass

### 5. Duplicate venue shows a conflict message
expected: Attempt to create a venue that conflicts with an existing claim (same place already linked to a business account). Submit returns a conflict, and the form shows the reworded "already taken" message instead of crashing or showing a generic error.
result: skipped
reason: "Not manually testable — the 409 path guards a race condition on the new row's own id (every submit creates a fresh liikuntapaikat row first), not duplicate venue names. There's no claim flow left to trigger a real collision through the UI. Already covered by automated tests added in the code-review fix (WR-05: explicit unit tests for the 409 and 500 rollback paths)."

### 6. English locale shows correct create-only copy
expected: Switch the app language to English, open the create form. Heading reads "Create a venue", fields are labeled "Company name" (required) and "Branch name (optional)" with helper text, and there is no search box. No console errors about missing translation keys.
result: pass

## Summary

total: 6
passed: 5
issues: 0
pending: 0
skipped: 1

## Gaps

[none yet]
