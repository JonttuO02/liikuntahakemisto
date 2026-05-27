---
phase: 06-ui-polish-and-data-foundation
plan: "06"
subsystem: filtering-ui
tags: [filter, city, sport, select, gdpr, footer]
dependency_graph:
  requires:
    - 06-02  # /tietosuoja route (Plan 02 output)
    - 06-04  # deriveKaupungit (Plan 04 output)
  provides:
    - city-filter-ui       # kaupunki dropdown in LiikuntapaikatLista
    - sport-select-ui      # native select replacing pill scroll
    - tietosuoja-footer    # LEGAL-01 nav wiring
  affects:
    - app/components/LiikuntapaikatLista.tsx
tech_stack:
  added: []
  patterns:
    - native-select-for-filter  # replaces motion.button pill loop
    - useMemo-derived-options   # kaupungit derived from paikat via deriveKaupungit
    - conditional-dropdown      # city select hidden when kaupungit.length <= 1
key_files:
  modified:
    - app/components/LiikuntapaikatLista.tsx
decisions:
  - "City select rendered conditionally (kaupungit.length > 1) so single-city datasets hide the filter"
  - "Hero subtitle uses suodatettu.length (filtered count) not paikat.length (total)"
  - "AnimatePresence grid key extended with aktiivKaupunki to force re-render on city change"
  - "Link import placed between aukiolo and PaikkaKortti imports for readability"
metrics:
  duration: ~8 min
  completed: "2026-05-22"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 1
---

# Phase 06 Plan 06: Filter UI Upgrades + GDPR Footer Summary

LiikuntapaikatLista sai natiivin sport-selectin pillien tilalle, kaupunkisuodattimen deriveKaupungit-funktiolla, dynaamisen hero-alaotsikon sekä Tietosuoja-footerlinkin.

## Tasks Completed

| # | Name | Commit | Key change |
|---|------|--------|------------|
| 1 | Replace sport pill scroll with native select (UI-08) | dbd175e | LAJIT_FILTTERI.map motion.button poistettu, native select lisatty, font-semibold korjattu |
| 2 | Add city filter, hero subtitle update, reset wiring (DATA-07) | 5e5d8f2 | aktiivKaupunki tila, kaupungit useMemo, matchesKaupunki filteri, grid-avain, alaotsikko, reset |
| 3 | Add Tietosuoja footer Link (LEGAL-01 wiring) | 469233c | Link /tietosuoja footerissa sisältolohkon alla |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. City filter is intentionally hidden (`kaupungit.length > 1`) in single-city datasets — this is documented behavior per D-21/D-19, not a stub.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-06-11 accepted | LiikuntapaikatLista.tsx | kaupunki strings rendered into option values — React escapes text nodes; no dangerouslySetInnerHTML |
| T-06-12 accepted | LiikuntapaikatLista.tsx | /tietosuoja footer link intentionally public (LEGAL-01) |
| T-06-13 accepted | LiikuntapaikatLista.tsx | city/sport filter state ephemeral (no URL persistence per CLAUDE.md) |

## Self-Check: PASSED

- app/components/LiikuntapaikatLista.tsx: exists, verified
- Commit dbd175e: verified
- Commit 5e5d8f2: verified
- Commit 469233c: verified
- npx tsc --noEmit: 0 errors
- npx vitest run: 29/29 tests passing
