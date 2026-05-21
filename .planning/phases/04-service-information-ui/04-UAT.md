---
phase: 04-service-information-ui
created: 2026-05-21
status: in_progress
automated_gate: PASS (11/11 vitest, tsc clean)
---

# Phase 4 UAT — Service Information UI

## Automated Gate
- [x] `npx vitest run` — 11/11 tests pass
- [x] `npx tsc --noEmit` — 0 errors

## Success Criteria Tests

### SC-1 (UI-01): Opening hours shown on card without tapping
**Test:** Open the homepage list view.
- [x] Code verified — "Aukioloajat lisätään pian" placeholder renders correctly for all null-aukioloajat venues (confirmed visually)
- [ ] Full visual verification pending — requires running /api/admin/sync-paikat + seed-hinnat.ts to populate DB

### SC-2 (UI-02): Open/closed badge + "Auki nyt" filter toggle
**Test:** Badge states + filter toggle behavior.
- [x] Code verified — "Auki nyt" button row visible with Clock icon; toggle state logic confirmed in code (lenient filter, grid key, reset handler)
- [ ] Full visual verification pending — open/closed badge states require aukioloajat data in DB

### SC-3 (UI-03): Drop-in badge
**Test:** "Kertakäynti OK" badge on card when hinta_kuvaus contains "kertakäynti".
- [x] Code verified — detection logic `hinta_kuvaus?.toLowerCase().includes('kertakäynti')` confirmed in PaikkaKortti.tsx
- [ ] Full visual verification pending — requires seed-hinnat.ts to populate hinta_kuvaus with kertakäynti venues

### SC-4 (UI-04): Profile page — weekly hours table + price description
**Test:** /paikat/[id] shows grouped hours + hinta_kuvaus prose.
- [x] Code verified — HoursTable client island, formatGroupedHours, hinta_kuvaus fallback chain all confirmed in code; profile page renders correctly for null data (rows silently omitted)
- [ ] Full visual verification pending — requires DB data population

## Issues Found
- **Data ops pending** — All four success criteria are code-complete but visual verification requires running Phase 3 data scripts:
  1. `POST /api/admin/sync-paikat` (Bearer token) — populates aukioloajat from Google Places
  2. `npx tsx scripts/seed-hinnat.ts` — populates hinta_kuvaus for top venues
  These are Phase 3 data ops, not Phase 4 code defects.

## Result
Status: ACCEPTED WITH CAVEAT
- Automated gate: PASS (11/11 vitest, tsc clean)
- Code review: PASS (all acceptance criteria verified in source)
- Visual UAT: PARTIAL — placeholder behavior confirmed; full badge/hours/price display pending DB population
- Blocker: none (Phase 5 can proceed; data ops can run in parallel)
