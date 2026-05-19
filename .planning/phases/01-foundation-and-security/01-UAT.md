---
status: complete
phase: 01-foundation-and-security
source: [01-PLAN.md (derived — no SUMMARY.md present)]
started: 2026-05-19T00:00:00.000Z
updated: 2026-05-19T12:00:00.000Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Dev server starts without errors. Homepage loads at http://localhost:3000/ and shows venue cards (or an empty state if no data). No console errors on load.
result: pass

### 2. SEC-01: /api/hae-paikat returns 401 without auth
expected: Running `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/hae-paikat` (or browser fetch) returns HTTP 401. No data is returned to unauthenticated callers.
result: pass

### 3. SEC-01: /api/admin/sync-paikat returns 401 without auth
expected: Running `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/admin/sync-paikat` returns HTTP 401. Admin endpoint is equally protected.
result: pass

### 4. SEC-02: /?nakyma=kartta shows map view
expected: Navigating to http://localhost:3000/?nakyma=kartta renders the map component (Google Maps iframe/canvas visible), not the Etusivu hero or list grid.
result: pass

### 5. SEC-02: /?nakyma=lista shows list view
expected: Navigating to http://localhost:3000/?nakyma=lista renders the card grid / list view (LiikuntapaikatLista), not the Etusivu hero.
result: pass

### 6. SEC-02: / without params shows Etusivu
expected: Navigating to http://localhost:3000/ (no ?nakyma param) shows the Etusivu hero section with the wave divider, not the card grid or map.
result: pass

### 7. SEC-02: BottomNav active states
expected: On mobile viewport (< 640px): Koti tab is indigo when on /, Kartta tab is indigo when on /?nakyma=kartta, Lista tab is indigo when on /?nakyma=lista. Clicking each tab updates the URL correctly.
result: pass

### 8. SEC-04: Loading skeleton on slow network
expected: In Chrome DevTools → Network → throttle to "Slow 3G", reload the homepage. Skeleton cards (6 animated grey placeholder rectangles) appear before real venue data loads. No blank white screen.
result: pass
note: Grey skeleton placeholders visible in AI widget area. Map slow on 3G is expected (Google Maps JS latency). Weather/AI widget are Phase 5 scope.

### 9. SEC-04: Finnish 404 page
expected: Navigating to http://localhost:3000/tata-sivua-ei-ole (or any non-existent route) shows a branded page with "Sivua ei löydy." heading and a "Palaa etusivulle" indigo button. Indigo-50 background.
result: pass

### 10. SEC-04: Finnish error boundary
expected: The error.tsx page exists and would show "Jotain meni pieleen." with "Yritä uudelleen" and "Palaa etusivulle" buttons if a runtime error were thrown. (Confirm file exists — manual trigger optional.)
result: pass

### 11. DATA-04 + SEC-03: Schema columns and RLS
expected: In Supabase SQL Editor, the query `SELECT column_name FROM information_schema.columns WHERE table_name = 'liikuntapaikat' AND column_name IN ('hinta_kuvaus','aukioloajat','lajit_lista','featured')` returns 4 rows. Anon-key write attempts are rejected.
result: pass

## Summary

total: 11
passed: 11
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
