---
status: complete
phase: 14-profiilisivu-ai-kotipaikkakunta
source: 14-01-SUMMARY.md, 14-02-SUMMARY.md, 14-03-SUMMARY.md, 14-04-SUMMARY.md, 14-05-SUMMARY.md
started: 2026-05-28T10:00:00Z
updated: 2026-05-28T10:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Profiili link in NavPill
expected: Open the NavPill (tap the floating pill at the bottom or corner of the page) so it expands. A "Profiili" link with a User icon appears in the menu, positioned ABOVE the Suosikit link. Tapping it navigates to /profiili.
result: pass

### 2. Profiili link in Etusivu inline pill
expected: On the home/map page, find the inline expanding pill (the one that expands in-place, not the floating NavPill). Expand it. A "Profiili" link with a User icon appears ABOVE the Suosikit link. Tapping it navigates to /profiili.
result: pass

### 3. Unauthenticated profile page
expected: Navigate to /profiili while logged out. The page shows a prompt/CTA asking you to log in (not the profile form). There should be a "Takaisin" (back) link — it goes to / (the home page), NOT to /?nakyma=lista.
result: pass

### 4. Authenticated profile page shows email and kotikaupunki field
expected: Log in to the app, then visit /profiili. The page shows your email address and a text input field labelled "Kotipaikkakunta" (or similar). The form allows you to type in a city name.
result: pass

### 5. Save kotikaupunki with feedback
expected: On the authenticated /profiili page, type a city name (e.g. "Tampere") in the kotipaikkakunta field and submit/save. A confirmation message "Kotikaupunki tallennettu" appears briefly (about 2.5 seconds) then disappears.
result: pass

### 6. Kotikaupunki persists after reload
expected: After saving a kotikaupunki value (from test 5), reload the /profiili page. The previously saved city is still shown in the input field — it was persisted to the database.
result: pass

### 7. AI reissussa context
expected: Set kotikaupunki to a different city than the one shown in the weather widget on the home page (e.g. if weather shows Helsinki, set kotikaupunki to Tampere). Trigger the AI sport recommendation widget. The recommendation text should reference being away / traveling (reissussa) context — it knows you're not in your home city.
result: skipped
reason: no API credits available

## Summary

total: 7
passed: 6
issues: 0
pending: 0
skipped: 1
blocked: 0

## Gaps

[none]
