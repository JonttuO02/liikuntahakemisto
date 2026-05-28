---
status: complete
phase: 15-arvostelut
source: 15-01-SUMMARY.md, 15-02-SUMMARY.md, 15-03-SUMMARY.md, 15-04-SUMMARY.md
started: 2026-05-28T20:00:00Z
updated: 2026-05-28T20:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. ReviewSection visible on venue profile page
expected: Navigate to a venue profile page (e.g. /paikat/[any-id]). A glass card section for reviews is visible near the bottom of the page. It shows a star area (either a star average + count, or the empty-state "Ei vielä arvosteluja" text) and a form area below it.
result: pass

### 2. Empty state — no reviews yet
expected: On a venue with no reviews, the ReviewSection shows "Ei vielä arvosteluja" in the star average area (no numeric score, no filled stars displayed for the average). The review list below is empty.
result: pass

### 3. Unauthenticated — locked form with sign-in CTA
expected: When not logged in, the review form appears visually disabled (faded/greyed out with pointer-events blocked). An absolute "Kirjaudu arvostellaksesi" button is visible overlaid on the form. Clicking it opens the auth/login modal.
result: pass

### 4. StarPicker hover preview and click
expected: When logged in and on the new-review form, hovering over star buttons fills stars up to the hovered position (hover preview). Moving the mouse away reverts to the currently selected value. Clicking a star permanently selects that rating (1–5).
result: pass

### 5. Submit a new review
expected: Fill in a star rating (required) and optionally a text comment, then click submit. A "Arvostelu tallennettu" success message appears and auto-clears after ~2.5 seconds. The page refreshes to show the new review in the list.
result: pass

### 6. Submitted review appears in the list
expected: After submitting, the new review is visible in the ReviewCard list — showing the star rating (amber stars), the reviewer display name (email prefix or "Anonyymi"), and the review text (if provided). The star average and count update to reflect the new review.
result: pass

### 7. Edit existing review
expected: Visiting a venue where you've already left a review shows an ExistingReviewView (read-only display of your rating + text) plus a "Muokkaa arvostelu" outlined button. Clicking it switches to the edit form pre-populated with your existing values. Saving updates the review (upsert — no duplicate).
result: pass

### 8. Anonymous toggle
expected: When logged in and composing a review, there is an anonymous toggle. Toggling it on and submitting results in the review card showing "Anonyymi" as the author name instead of your email prefix.
result: pass

### 9. Näytä kaikki — expand full review list
expected: On a venue with more reviews than the default display limit (around 3), a "Näytä kaikki" text button is visible below the initial list. Clicking it shows all reviews and the "Näytä kaikki" button disappears (no collapse).
result: pass

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
