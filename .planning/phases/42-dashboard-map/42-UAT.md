---
status: passed
phase: 42-dashboard-map
source: [phases/42-dashboard-map/42-01-SUMMARY.md, 42-dashboard-map/42-02-SUMMARY.md]
started: "2026-06-15T00:00:00Z"
updated: "2026-06-15T10:45:00Z"
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
expected: Tap a SportPin marker on /business/map. Two-step interaction: pin tap zooms to level 16, nearest venue within 0.5km shows CalloutCard, tapping the card opens PaikkaSheet.
result: pass
note: Fixed in commit 61f08de — two-step zoom+CalloutCard flow implemented on /business/map matching main map behavior.

### 9. Auth gate on /business/map
expected: Open /business/map in an incognito window (not logged in). The page redirects to /business/kirjaudu instead of rendering the map or showing any venue data.
result: pass

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0
blocked: 0
