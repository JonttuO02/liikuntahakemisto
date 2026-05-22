---
phase: 06-ui-polish-and-data-foundation
plan: "05"
subsystem: ui-cards
tags: [PaikkaKortti, ads, price, cta, glassmorphism]
dependency_graph:
  requires: [06-01, 06-04]
  provides: [updated-PaikkaKortti-with-badge-price-cta]
  affects: [app/components/PaikkaKortti.tsx]
tech_stack:
  added: []
  patterns: [isMembershipOnly, multi-line-price-split, always-rendered-cta]
key_files:
  created: []
  modified:
    - app/components/PaikkaKortti.tsx
decisions:
  - "Sponsoroitu badge placed between sport pill and Kertakäynti OK per UI-SPEC ADS-02 (not after as PATTERNS.md suggested)"
  - "priceLines split on literal newline character; fallback chain: membershipOnly -> priceLines -> priceText -> Lisataan pian"
  - "Bottom row simplified to CTA + distance only; pt-3 separator replaces pt-2.5"
metrics:
  duration: "~10min"
  completed: "2026-05-22"
  tasks_completed: 1
  tasks_total: 1
---

# Phase 06 Plan 05: PaikkaKortti — Badge, Price-at-Top, CTA Simplification Summary

One-liner: Amber Sponsoroitu badge for featured venues, price moved to position 4 with isMembershipOnly fallback, and Varaa aika button replaced by always-shown Nayta tiedot link.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Apply ADS-02 badge, UI-05/06 price-at-top, UI-07 CTA simplification | ed63bbf | app/components/PaikkaKortti.tsx |

## What Was Built

Applied four interlocking edits to `app/components/PaikkaKortti.tsx`:

1. **Sponsoroitu amber badge (ADS-02):** Added conditional `paikka.featured && <span bg-amber-100 text-amber-700 border-amber-200>Sponsoroitu</span>` between sport pill and Kertakäynti OK badge in the badge row.

2. **Price block at position 4 (UI-05, UI-06):** Replaced the `priceToShow` bottom-row price with a dedicated `<div>` block between open-status and address. Priority fallback chain:
   - `membershipOnly` -> muted "vain jaesenyys" (D-12)
   - `priceLines` (split on `\n`) -> multi-line block spans (D-13)
   - `priceText` -> single bold price span
   - fallback -> muted "Lisataan pian"

3. **CTA simplification (UI-07):** Removed the `paikka.varauslinkki ? Varaa aika : Nayta tiedot` ternary. Always renders the outlined "Nayta tiedot" Link with `font-bold` (was `font-medium`).

4. **Typography sweep (CLAUDE.md):** Converted sport pill and h3 from `font-semibold` to `font-bold`; h3 from `text-[15px]` to `text-sm`. File now contains zero occurrences of `font-semibold` or `font-medium`.

## Acceptance Criteria Results

| Check | Result |
|-------|--------|
| Sponsoroitu present | PASS |
| bg-amber-100 badge | PASS |
| isMembershipOnly imported | PASS |
| vain jaesenyys copy | PASS |
| Nayta tiedot copy | PASS |
| Varaa aika removed | PASS |
| no font-semibold | PASS |
| no font-medium | PASS |
| paikka.featured guard | PASS |
| pt-3 bottom row separator | PASS |
| npx tsc --noEmit | PASS (0 errors) |
| npx vitest run | PASS (29/29 tests) |

## Deviations from Plan

None — plan executed exactly as written. Badge order follows UI-SPEC (sport pill -> Sponsoroitu -> Kertakäynti OK) which was the design-of-record.

## Known Stubs

None — all price states render real data from Supabase fields (`hinta_kuvaus`, `hinta_min`, `hinta_max`, `featured`).

## Threat Surface Scan

No new network endpoints or auth paths introduced. All rendered text uses React text nodes (never `dangerouslySetInnerHTML`) — T-06-09 mitigated. T-06-10 accepted (featured boolean controls badge visibility only, no privileges).

## Self-Check: PASSED

- File exists: app/components/PaikkaKortti.tsx — FOUND
- Commit ed63bbf — FOUND (git log confirms)
- All 29 tests pass
- TypeScript exits 0
