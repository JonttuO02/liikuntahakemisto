---
status: complete
phase: 06-ui-polish-and-data-foundation
source: 06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md, 06-04-SUMMARY.md, 06-05-SUMMARY.md, 06-06-SUMMARY.md, 06-07-SUMMARY.md
started: 2026-05-22T00:00:00Z
updated: 2026-05-22T12:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Privacy Page (GDPR)
expected: Navigate to /tietosuoja. The page loads with the title "Tietosuojaseloste", six Finnish prose sections (rekisterinpitäjä, mitä tietoja kerätään, evästeet ja selaintallennus, käyttäjän oikeudet, yhteydenotot, muutokset), controller name "Liikuntahakemisto", contact email "joona.orava@gmail.com", and a back-link (← or ChevronLeft) to /.
result: pass

### 2. Profile Page — Booking URL Row
expected: Open any venue's profile page that has a booking URL. The old full-width black "Varaa aika" button is gone. In its place, a "Varaussivu" row with an ExternalLink icon shows the booking URL as a styled anchor link (opens in new tab).
result: pass

### 3. List Cards — "Näytä tiedot" CTA on every card
expected: Open /?nakyma=lista. Every venue card has an outlined "Näytä tiedot" link at the bottom. No "Varaa aika" button appears on any list card regardless of whether the venue has a booking URL.
result: pass

### 4. List Cards — Price at position 4
expected: On venue cards in /?nakyma=lista, the price row appears between the open-status indicator and the address. Venues with numeric prices show them in bold. Venues with no price data show "Lisätään pian" in muted grey text.
result: pass

### 5. List Cards — Membership-only price
expected: A venue whose price description contains "jäsenyys" (and has no numeric hinta_min/hinta_max) shows "vain jäsenyys" in muted, non-bold text in the price position — not a numeric amount. (Skip if no such venue is visible in the current dataset.)
result: pass

### 6. Sponsoroitu Badge on List Cards
expected: Any venue marked as featured shows an amber "Sponsoroitu" badge in the card's badge row (between the sport pill and any Kertakäynti OK badge). Badge style: amber background, amber-700 text. (Skip if no featured venues exist in the database.)
result: skipped
reason: no featured venues in database yet

### 7. Sport Filter — Native Select Dropdown
expected: Open /?nakyma=lista. The sport filter is a native <select> dropdown (not a horizontal pill/button row). Selecting a sport from the dropdown filters the venue cards to show only matching venues.
result: pass

### 8. City Filter Dropdown
expected: Open /?nakyma=lista. If venues span multiple cities, a city filter <select> appears in the filter row alongside the sport dropdown. Selecting a city shows only venues in that city. With "Kaikki" selected, all venues appear. (Skip if all venues share one city — filter is intentionally hidden for single-city datasets.)
result: issue
reported: "all venues are in one city but dropdown isnt hidden"
severity: minor
fix_applied: "Changed kaupungit.length > 1 to > 2 — deriveKaupungit always prepends Kaikki sentinel so single-city returns length 2. Commit 2c283c6."

### 9. Hero Subtitle — Filtered Count
expected: In /?nakyma=lista, the hero subtitle shows the count of currently-visible venues (e.g. "Kaikki kaupungit · 42 paikkaa" or "Tampere · 42 paikkaa"). When a filter is applied, the count updates to reflect only the matching venues.
result: pass

### 10. Tietosuoja Footer Link
expected: Scroll to the bottom of /?nakyma=lista. A "Tietosuoja" link is visible in the footer area. Clicking it navigates to /tietosuoja.
result: pass

### 11. AI Weather Widget — City Name
expected: On the homepage (/ or Etusivu map view), the AI weather widget shows the city name after the temperature reading, e.g. "7° Tampere" — the city in muted grey text next to the temperature.
result: pass

### 12. Map Bottom-Sheet — Sponsoroitu Badge
expected: In the map/homepage view, tap a venue pin for a featured venue. The bottom-sheet popup shows an amber "Sponsoroitu" badge in the badge row. (Skip if no featured venues exist or map pins are not yet visible.)
result: skipped
reason: no featured venues in database yet

## Summary

total: 12
passed: 9
issues: 1
pending: 0
skipped: 2
blocked: 0

## Gaps

- truth: "City filter dropdown is hidden when all venues share one city"
  status: fixed
  reason: "User reported: all venues are in one city but dropdown isnt hidden"
  severity: minor
  test: 8
  root_cause: "kaupungit.length > 1 threshold was off-by-one — deriveKaupungit always prepends 'Kaikki' sentinel, so a single-city dataset returns ['Kaikki', 'Tampere'] (length 2), which passed the > 1 check"
  artifacts:
    - path: "app/components/LiikuntapaikatLista.tsx"
      issue: "kaupungit.length > 1 should be > 2"
  missing:
    - "Changed to kaupungit.length > 2 — commit 2c283c6"
  fix_status: applied_inline
