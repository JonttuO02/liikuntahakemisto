---
phase: 06-ui-polish-and-data-foundation
plan: "04"
subsystem: lib
tags: [tdd, helpers, price-utils, city-filter, vitest]
dependency_graph:
  requires: []
  provides:
    - lib/priceUtils.ts#isMembershipOnly
    - lib/cityFilter.ts#deriveKaupungit
  affects:
    - Plan 05 (PaikkaKortti price block consumer)
    - Plan 06 (LiikuntapaikatLista city dropdown consumer)
tech_stack:
  added: []
  patterns:
    - TDD (RED/GREEN vitest)
    - Pure function helpers
    - TypeScript Pick<> for minimal interface contracts
key_files:
  created:
    - lib/priceUtils.ts
    - lib/priceUtils.test.ts
    - lib/cityFilter.ts
    - lib/cityFilter.test.ts
  modified: []
decisions:
  - "isMembershipOnly uses three-condition rule: non-empty hinta_kuvaus AND 'jäsenyys' substring AND both prices null — Pitfall 2 handled by falsy guard"
  - "deriveKaupungit uses Set.delete('Kaikki') before prepending sentinel — avoids double 'Kaikki' when DB row contains literal 'Kaikki'"
  - "hinta_kuvaus typed as optional (string | null | undefined) — isMembershipOnly's falsy guard (!kuvaus) handles all three cases"
metrics:
  duration: ~8 minutes
  completed_date: "2026-05-22T03:19:09Z"
  tasks_completed: 2
  files_created: 4
  files_modified: 0
---

# Phase 6 Plan 04: Pure Helper Modules (isMembershipOnly + deriveKaupungit) Summary

**One-liner:** TDD-verified pure helper modules — isMembershipOnly (D-11 three-condition heuristic) and deriveKaupungit (D-21 dedup with null/whitespace exclusion) — ready for Wave 2 consumer imports.

## Tasks Completed

| Task | Name | Commit (RED) | Commit (GREEN) | Tests |
|------|------|--------------|----------------|-------|
| 1 | isMembershipOnly heuristic (UI-05, D-11) | 4d9839b | 0a05b67 | 9/9 |
| 2 | deriveKaupungit dedup helper (DATA-07, D-21) | b27b031 | 540eda5 | 9/9 |

## What Was Built

### lib/priceUtils.ts — isMembershipOnly

Exports `isMembershipOnly(p: Pick<Liikuntapaikka, 'hinta_kuvaus' | 'hinta_min' | 'hinta_max'>): boolean`.

Three-condition rule (D-11):
1. `hinta_kuvaus` on epätyhjä merkkijono (ei null, ei "")
2. `hinta_kuvaus.toLowerCase()` sisältää osajonon `"jäsenyys"`
3. sekä `hinta_min` että `hinta_max` ovat `null`

Pitfall 2: null `hinta_kuvaus` palauttaa `false` — ei oleteta jäsenyyttä ilman vahvistavaa tekstiä.

### lib/cityFilter.ts — deriveKaupungit

Exports `deriveKaupungit(paikat: Array<Pick<Liikuntapaikka, 'kaupunki'>>): string[]`.

Palautusmuoto: `['Kaikki', ...aakkostetut uniikit kaupungit]`

Pitfall 6: null, tyhjä merkkijono ja pelkkä välilyönti suodatetaan pois. `Set.delete('Kaikki')` ennen sentinelin lisäämistä estää kaksoismerkinnän jos DB sisältää literal-arvon "Kaikki".

## TDD Gate Compliance

Molemmat helperit noudattavat tiukkaa RED/GREEN-sykliä:

**isMembershipOnly:**
- RED commit `4d9839b` — `test(06-04): add failing tests for isMembershipOnly`
- GREEN commit `0a05b67` — `feat(06-04): implement isMembershipOnly heuristic`

**deriveKaupungit:**
- RED commit `b27b031` — `test(06-04): add failing tests for deriveKaupungit`
- GREEN commit `540eda5` — `feat(06-04): implement deriveKaupungit dedup helper`

Kummassakaan RED-vaiheessa yksikään testi ei läpäissyt (moduulia ei ollut olemassa).

## Verification Results

```
npx vitest run lib/priceUtils.test.ts lib/cityFilter.test.ts
  Test Files: 2 passed (2)
  Tests:      18 passed (18)

npx vitest run  (full suite)
  Test Files: 3 passed (3)
  Tests:      29 passed (29)

npx tsc --noEmit
  exit 0 — no type errors
```

## Deviations from Plan

None — plan executed exactly as written.

**Huomio:** `lib/types.ts`:ssa `hinta_kuvaus` on `optional` (`hinta_kuvaus?: string | null`), jolloin `Pick<>` kaappaa myös `undefined`-tapauksen. `isMembershipOnly`:n `!kuvaus`-falsy-tarkistus käsittelee sen oikein — ei poikkeama, vain tyyppiturvallisuuden vahvistus.

## Known Stubs

Ei stub-arvoja — tässä suunnitelmassa luotiin ainoastaan puhtaita (pure) funktioita ilman komponenttiriippuvuuksia tai UI-tilaa.

## Threat Flags

Ei uutta uhkapintaa — molemmat funktiot ovat puhtaita, I/O-vapaita apuфункцioita ilman verkkoyhteyksiä, tiedostojärjestelmää tai DOM-käyttöä.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| lib/priceUtils.ts | FOUND |
| lib/priceUtils.test.ts | FOUND |
| lib/cityFilter.ts | FOUND |
| lib/cityFilter.test.ts | FOUND |
| 06-04-SUMMARY.md | FOUND |
| Commit 4d9839b (test RED isMembershipOnly) | FOUND |
| Commit 0a05b67 (feat GREEN isMembershipOnly) | FOUND |
| Commit b27b031 (test RED deriveKaupungit) | FOUND |
| Commit 540eda5 (feat GREEN deriveKaupungit) | FOUND |
