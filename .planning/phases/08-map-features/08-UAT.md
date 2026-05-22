---
status: complete
phase: 08-map-features
source: 08-01-SUMMARY.md, 08-02-SUMMARY.md, 08-03-SUMMARY.md
started: 2026-05-22T00:00:00Z
updated: 2026-05-22T00:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

## Current Test

[testing complete]

## Tests

### 1. GPS Ripple Ring Animation
expected: With GPS enabled (or simulated), the blue user-location dot on the map shows a white pulsing ripple ring that radiates outward and fades, repeating indefinitely. The ring is visible on both the homepage preview map and the fullscreen map, and is not clipped by the marker boundary.
result: pass

### 2. Pin → Mini-Card at Zoom 16 (Tap to Auto-Zoom)
expected: On the fullscreen map at zoom < 16, venue pins are visible. Tapping a pin does NOT immediately open the bottom sheet — instead the map auto-pans and zooms to level 16. At zoom 16+, the pin smoothly crossfades into a small glass mini-card showing the sport pill, venue name, and price (if available).
result: pass

### 3. Mini-Card Opens Bottom Sheet
expected: At zoom >= 16, tapping a venue mini-card opens the bottom sheet detail panel for that venue. Tapping a pin at zoom < 16 only triggers the auto-zoom (no sheet opens yet).
result: pass

### 4. Expanded Bottom Sheet — Content Completeness
expected: Tapping a mini-card expands it into a large centered card (not a bottom sheet). The animation should look like the mini-card growing into the large card. The large card is centered in the viewport with the map visible on all four sides (~90% viewport coverage). It shows open status, hours table, phone, booking URL, and description, and is scrollable.
result: issue
reported: "Toimii oikein, mutta ymmärsit tyylin väärin. Haluan että iso kortti aukeaa, haluan että kun pientä korttia klikataan niin animaatio näyttää pienen kortin suurenemisen isoksi. Ja ison kortin lopullinen paikka sivulla tulisi olla keskellä, ei alhaalla. 90% tarkoittaa, että kartta näkyy hieman ison kortin ympärillä, eli kortin mikään reuna ei peitä karttaa kokonaan."
severity: major

### 5. Profile Page "Näytä kartalla" — In-App Navigation
expected: On a venue's profile page (/paikat/<id>), clicking "Näytä kartalla" navigates to the homepage in the same tab (NOT to Google Maps, NOT opening a new tab). The URL becomes /?id=<venue_id>.
result: pass

### 5b. Map Reload on Navigation (performance observation)
expected: Navigating from profile page to homepage should not visibly reload/reinitialize the map — transition should feel instant.
result: issue
reported: "Nettisivu näyttää hitaalta siirtymissä koska kartta ladataan aina uudelleen."
severity: minor

### 6. URL Focus — /?id= Opens Map at Venue
expected: Navigating directly to /?id=<venue_id> (or arriving via the profile page link) automatically opens the fullscreen map and zooms to that venue's location. The bottom sheet does NOT open automatically — the user sees the venue's mini-card at zoom 16 and can tap it to open the sheet.
result: pass

## Summary

total: 6
passed: 5
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Tapping a mini-card expands it into a large centered card with map visible on all sides. Animation looks like the mini-card growing into the large card. Card is centered in viewport (~90% size), not anchored to the bottom."
  status: failed
  reason: "User reported: Toimii oikein, mutta ymmärsit tyylin väärin. Haluan että iso kortti aukeaa, haluan että kun pientä korttia klikataan niin animaatio näyttää pienen kortin suurenemisen isoksi. Ja ison kortin lopullinen paikka sivulla tulisi olla keskellä, ei alhaalla. 90% tarkoittaa, että kartta näkyy hieman ison kortin ympärillä, eli kortin mikään reuna ei peitä karttaa kokonaan."
  severity: major
  test: 4
  artifacts: []
  missing: []

- truth: "Navigation from profile page to homepage should not visibly reload the map — transition should feel instant."
  status: failed
  reason: "User reported: Nettisivu näyttää hitaalta siirtymissä koska kartta ladataan aina uudelleen."
  severity: minor
  test: "5b"
  artifacts: []
  missing: []
