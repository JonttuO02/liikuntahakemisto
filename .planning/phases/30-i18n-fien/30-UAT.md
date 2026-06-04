---
status: complete
phase: 30-i18n-fien
source:
  - .planning/phases/30-i18n-fien/30-01-SUMMARY.md
  - .planning/phases/30-i18n-fien/30-02-SUMMARY.md
  - .planning/phases/30-i18n-fien/30-03-SUMMARY.md
  - .planning/phases/30-i18n-fien/30-04-SUMMARY.md
started: 2026-06-04T00:00:00Z
updated: 2026-06-04T00:00:00Z
---

## Current Test

## Current Test

[testing complete]

## Tests

### 1. Language toggle on /profiili
expected: Navigate to /profiili while logged in. A "Kieli" section appears below interests with a button reading "Switch to English". Clicking it re-renders the page with the button now reading "Vaihda suomeksi". The NEXT_LOCALE cookie in DevTools → Application → Cookies shows "en". Reloading the page keeps the UI in English. Clicking "Vaihda suomeksi" returns to Finnish, and that also persists on reload.
result: pass

### 2. NavPill labels in EN locale
expected: With NEXT_LOCALE=en set (after toggling on /profiili), the navigation bar labels should appear in English — e.g. "Profile" instead of "Profiili", "Sign in" instead of "Kirjaudu sisään". The nav should be fully English.
result: pass

### 3. Card labels in EN locale (PaikkaKortti / DiagonaalKortti)
expected: With EN locale active, venue cards on the list/map show English text: "Open now" instead of "Auki nyt", "Closed" instead of "Suljettu", and "membership only" instead of "vain jäsenyys". Sport filter pills and distance text are also in English.
result: issue
reported: "sport names are not in English — they stay Finnish regardless of locale"
severity: major

### 4. Etusivu filter/search strings in EN
expected: With EN locale, the filter area on the homepage shows English text — city filter label, "All" option, search placeholder, filter button labels, and the To-do overlay strings (including "Submit review" and "Saving..." for the inline review button).
result: issue
reported: "sport names are not in English — same issue as test 3, sport filter pills stay Finnish"
severity: major

### 5. PaikkaSheet (detail side panel) in EN
expected: Opening a venue detail sheet with EN locale shows English section headings: "Price", "Hours", "Phone", "Book now", "Reviews" (or "No reviews yet"). The close button is accessible (has aria-label). Review count shows "1 review" or "N reviews" in English.
result: pass

### 6. AuthModal strings in EN — including loading state
expected: Opening the auth modal with EN locale shows English text throughout: title "Sign in", placeholders "Email" / "Password", Google button in English. Clicking submit shows "Signing in..." (not "Kirjaudutaan...") while the request is in flight. The toggle between sign-in and create-account modes shows "No account? Create account" and "Already have an account? Sign in".
result: pass

### 7. Venue detail page (/paikat/[id]) location row in EN
expected: Navigate to any venue detail page (e.g. /paikat/[any-id]) with EN locale. The location row label reads "Location" (not "Sijainti") and the map link reads "Show on map →" (not "Näytä kartalla →"). All other section labels (Hours, Phone, Price, etc.) are also in English.
result: pass

### 8. not-found page in EN
expected: Navigate to a non-existent URL (e.g. /does-not-exist) with EN locale. The 404 page shows English text for the title, description, and the back-home button (which uses font-bold, not font-semibold).
result: pass

## Summary

total: 8
passed: 6
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "Sport names shown on cards and filter pills should be in the active locale"
  status: failed
  reason: "User reported: sport names stay Finnish regardless of locale. lib/lajit.ts defines sport labels as hardcoded Finnish strings — they are not wired to the message files."
  severity: major
  test: 3
  artifacts:
    - lib/lajit.ts
  missing:
    - Add sport name translations to messages/fi.json and messages/en.json (Lajit namespace or similar)
    - Update components that render sport labels to use t() or pass locale-aware labels from lib/lajit.ts
