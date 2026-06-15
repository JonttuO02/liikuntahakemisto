---
status: complete
phase: 42-dashboard-map
source: [phases/42-dashboard-map/42-01-SUMMARY.md, 42-dashboard-map/42-02-SUMMARY.md]
started: "2026-06-15T00:00:00Z"
updated: "2026-06-15T00:05:00Z"
---

## Current Test

[testing complete]

## Tests

### 1. Dashboard status card
expected: Visit /business while logged in as a business account with at least one venue. A glass card with a colored left border appears at the very top of the page — amber for pending, green for approved, red for rejected.
result: pass

### 2. Venue list with status badges
expected: Below the status card a "Paikkasi" section lists your venues. Each row shows the venue name, a colored pill (Hyväksytty / Odottaa / Hylätty), and Esikatselu + Muokkaa action buttons.
result: pass

### 3. Map quick-action card
expected: Below the venue list, a glass card link labelled "Avaa kartta" appears with a map icon on the right. Tapping it navigates to /business/map.
result: pass

### 4. Venue preview modal
expected: Tap "Esikatselu" on a venue row. A PreviewModal overlays the page showing that venue's details. Tapping the close button (X) dismisses it.
result: pass

### 5. Venue edit link
expected: Tap "Muokkaa" on a venue row. The browser navigates to /business/{paikka_id} opening the edit wizard for that venue.
result: pass

### 6. /business/map full-screen map
expected: Visit /business/map while authenticated. A full-screen map fills the viewport. SportPin markers appear for published venues. No page chrome — just the map with the floating toggle and recenter button.
result: pass

### 7. Kaikki / Omat paikat toggle
expected: At the top of /business/map a pill toggle shows "Kaikki paikat" (active by default) and "Omat paikat". Tapping "Omat paikat" filters the map to show only the business's own venues. Tapping "Kaikki paikat" restores all venues.
result: pass

### 8. PaikkaSheet on pin tap
expected: Tap a SportPin marker on /business/map. PaikkaSheet slides up from the bottom showing venue details (name, sport type, address, opening hours etc.). Tapping the X closes the sheet and the map is interactive again.
result: issue
reported: "It works like that, but its not the right behavior. The map should work the same as on the main page when it comes to pins. On main page when zooming in the pin turns into small card and when tapping that the bottomsheet opens. And when tapping a pin it zooms towards as much needed so the small card opens."
severity: major

### 9. Auth gate on /business/map
expected: Open /business/map in an incognito window (not logged in). The page redirects to /business/kirjaudu instead of rendering the map or showing any venue data.
result: pass

## Summary

total: 9
passed: 8
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Tapping a pin on /business/map zooms in, the pin expands to a small card (DiagonaalKortti), and tapping the card opens PaikkaSheet — matching the main map behavior"
  status: failed
  reason: "User reported: pin tap opens PaikkaSheet directly without zoom or small card step"
  severity: major
  test: 8
  artifacts: []
  missing: []
