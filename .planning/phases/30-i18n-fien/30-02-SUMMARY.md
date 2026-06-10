---
phase: 30-i18n-fien
plan: "02"
subsystem: i18n
tags: [next-intl, i18n, useTranslations, components, NavPill, Etusivu, PaikkaKortti, DiagonaalKortti]
dependency_graph:
  requires: [30-01]
  provides: [translated-nav-labels, translated-filter-strings, translated-todo-strings, translated-card-labels]
  affects:
    - app/components/NavPill.tsx
    - app/components/Etusivu.tsx
    - app/components/PaikkaKortti.tsx
    - app/components/DiagonaalKortti.tsx
tech_stack:
  added: []
  patterns: [useTranslations hook in client components, multi-namespace hooks per component]
key_files:
  created: []
  modified:
    - app/components/NavPill.tsx
    - app/components/Etusivu.tsx
    - app/components/PaikkaKortti.tsx
    - app/components/DiagonaalKortti.tsx
decisions:
  - "Etusivu paakomponenttiin lisatty tTodo, tFilters ja tNav -hookit — kaikki kolme namespace tarvittiin suoraan"
  - "CombinedFilterPill sub-funktio sai oman tFilters -hookin, RecenterButton oman tMap -hookin"
  - "Toolbar nav-tekstit (Profiili/TO DO/Kirjaudu ulos/Kirjaudu) Etusivussa korvattu — ne ovat Etusivun sisaisia, ei NavPillin"
  - "sentinel useState('Kaikki') ja searchKaupunki === 'Kaikki' sailyvat muuttumattomina (T-30-05 mitigation)"
metrics:
  duration: "~20 minutes"
  completed: "2026-06-04"
  tasks_completed: 3
  files_created: 0
  files_modified: 4
---

# Phase 30 Plan 02: Core UI Component i18n — Summary

**One-liner:** useTranslations-hookit NavPill, Etusivu, PaikkaKortti ja DiagonaalKortti -komponentteihin — kaikki suomenkieliset UI-stringit korvattu translation key -kutsuilla, 'Kaikki'-sentinel sailyy.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | NavPill.tsx — translate nav labels | d18e233 | app/components/NavPill.tsx |
| 2 | Etusivu.tsx — translate filter/map/todo/auth strings | 214c661 | app/components/Etusivu.tsx |
| 3 | PaikkaKortti.tsx + DiagonaalKortti.tsx — translate card labels | c502884 | app/components/PaikkaKortti.tsx, app/components/DiagonaalKortti.tsx |

## Verification Results

```
npx tsc --noEmit --skipLibCheck | grep -E "NavPill|Etusivu|PaikkaKortti|DiagonaalKortti"
  0 lines (no errors)

npx vitest run
  7 test files, 64 tests — all passed

Sentinel check:
  grep "useState('Kaikki')" Etusivu.tsx -> 1 (preserved)
  grep "searchKaupunki === 'Kaikki'" Etusivu.tsx -> 1 (preserved)
```

## Key Decisions

- **Multi-namespace per component (Etusivu):** Etusivu kayttaa kolmea namespacea suoraan (tTodo, tFilters, tNav) seka kahtaa sub-komponentin hookia (tMap RecenterButtonissa, tFilters CombinedFilterPillissa). Tama on tarkoituksellista — yksi komponentti hallinnoi monia UI-alueita.
- **Toolbar nav-tekstit Etusivussa:** Etusivu sisaltaa oman oikean toolbar -alueen jossa on "Profiili", "TO DO", "Kirjaudu ulos" ja "Kirjaudu" — naat ovat Etusivun sisaisia eika NavPillin instansseja. Korvattu tNav ja tTodo -kutsuilla.
- **Sentinel-sailyttaminen (T-30-05):** useState('Kaikki') alustus ja kaikki searchKaupunki === 'Kaikki' -vertailut jattetty koskematta. Vain display-label kayttaa t()-kutsua tarvittaessa.
- **DiagonaalKortti jakaa PaikkaKortti -namespacen:** PATTERNS.md:n mukaan DiagonaalKortti kayttaa useTranslations('PaikkaKortti') — ei omaa namespacea.

## Deviations from Plan

### Extra translations applied

**[Rule 2 - Missing coverage] Etusivu toolbar nav-labels translated**
- **Found during:** Task 2
- **Issue:** Plan kuvaa todoOpen/todoButton -aluetta, mutta Etusivun oikea toolbar sisaltaa myos "Profiili", "TO DO", "Kirjaudu ulos" ja "Kirjaudu" -teksteja jotka eivat olleet NavPill.tsx:ssa vaan Etusivu.tsx:ssa
- **Fix:** Lisatty tNav hook paakomponenttiin ja korvattu toolbar-tekstit
- **Files modified:** app/components/Etusivu.tsx
- **Note:** Plan mainitsee "Kirjaudu ulos (inline in Etusivu if present)" — naat loytyivat; korjattu automaattisesti

## Known Stubs

None — kaikki translation key -kutsut kytketty olemassa oleviin messages/fi.json ja messages/en.json avaimiin (plan 30-01 toimitti).

## Threat Surface Scan

Ei uusia turvallisuusrelevanteja pintoja. Kaikki muutokset ovat puhtaita string-korvauksia — ei uusia verkkopyyntoja, ei auth-polkuja, ei tiedostopaaasya. T-30-05 (Tampering — 'Kaikki' sentinel) mitigoitu: sentinel sailyy muuttumattomana.

## Self-Check: PASSED

Files exist:
- FOUND: app/components/NavPill.tsx (contains useTranslations('Nav'))
- FOUND: app/components/Etusivu.tsx (contains useState('Kaikki') sentinel)
- FOUND: app/components/PaikkaKortti.tsx (contains useTranslations('PaikkaKortti'))
- FOUND: app/components/DiagonaalKortti.tsx (contains useTranslations('PaikkaKortti'))

Commits exist:
- d18e233: feat(30-02): translate NavPill nav labels with useTranslations('Nav')
- 214c661: feat(30-02): translate Etusivu filter/todo/nav strings with useTranslations
- c502884: feat(30-02): translate PaikkaKortti and DiagonaalKortti card labels
