---
phase: 61-onboarding-vaiheiden-uudelleenj-rjestys
plan: "05"
subsystem: onboarding
tags: [routing, state-machine, ux-flow, gap-closure]
wave: 4
requires: [61-04]
provides: [correct-onboarding-routing]
affects: [app/business/onboarding/page.tsx]
tech_stack:
  added: []
  patterns: [client-side-state-machine]
key_files:
  modified:
    - app/business/onboarding/page.tsx
decisions:
  - "analyze-phase poistettu käyttäjälle näkyvästä navigointipolusta: AI käynnistyy taustalla, wizard avataan suoraan"
  - "handleBackToPrePhase palaa sijaintiin (ei analyze-vaiheeseen), koska analyze ei ole enää eteenpäin-reitin askel"
metrics:
  duration: "5 min"
  completed: "2026-06-26"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 1
status: complete
requirements: [ONBOARD-19, ONBOARD-20, ONBOARD-21]
---

# Phase 61 Plan 05: Onboarding Routing Fix Summary

## One-liner

Kolme kohdistettua reittikorjausta page.tsx:ssä: sijainti onNext, fast-forward ja takaisin-navigointi ohjaavat suoraan wizardiin ohittaen analyze-vaiheen kokonaan.

## What Was Built

Korjattiin onboarding-tilakoneessa kolme väärin osoittavaa `setPagePhase`-kutsua, joiden takia käyttäjä ohjautui näkyvään `analyze`-vaiheeseen vaikka AI-analyysi oli jo käynnistetty taustalla.

### Muutokset

**Muutos 1 — fast-forward-polku `handleNimiUrlNext`-funktiossa (rivi 313):**
```
setPagePhase(url ? 'analyze' : 'laji-skip')
-> setPagePhase(url ? 'wizard' : 'laji-skip')
```
Kun käyttäjällä on jo tallennettu sijainti (alreadyHasLocation=true), UI ohittaa sekä sijainti- että analyze-askeleen ja menee suoraan wizardiin.

**Muutos 2 — StepSijainti-askeleen `onNext`-callback (rivi 371):**
```
onNext={() => (websiteUrl ? setPagePhase('analyze') : handleSkip())}
-> onNext={() => (websiteUrl ? setPagePhase('wizard') : handleSkip())}
```
Kun käyttäjä klikkaa Seuraava sijainti-askeleella ja websiteUrl on asetettu, virta menee suoraan wizardiin. AI-analyysi on jo käynnistetty `handleNimiUrlNext`-funktiossa.

**Muutos 3 — `handleBackToPrePhase`-funktio (rivit 351-353):**
```
setPagePhase(websiteUrl ? 'analyze' : 'laji-skip')
-> setPagePhase(websiteUrl ? 'sijainti' : 'laji-skip')
```
Wizard-askeleen 1 Takaisin-painike palaa nyt sijaintiin (ei analyze-vaiheeseen), koska analyze ei enää ole eteenpäin-navigointipolun askel.

## Verification Results

- `npx tsc --noEmit` — ei virheitä
- Kolme `setPagePhase('analyze')` -kutsua poistettu oikean suunnan polulta
- Analyze-renderöintilohko (`{pagePhase === 'analyze' && ...}`) säilyy tiedostossa — se on edelleen saavutettavissa suorilla deep-linkeillä mutta ei ole enää normaali navigointiaskel

## Deviations from Plan

None — suunnitelma toteutettiin täsmälleen kuten määritelty. Kolme kohtaa muutettiin, muuta logiikkaa ei kosketa.

## Commits

| Hash | Description |
|------|-------------|
| a97555c | fix(61-05): route sijainti onNext and fast-forward directly to wizard |

## Self-Check

- [x] `app/business/onboarding/page.tsx` muokattu — tiedosto löytyy
- [x] Commit a97555c olemassa
- [x] Ei vahinkopoistettujen tiedostojen warningeja
- [x] TypeScript tarkistus läpäisty (npx tsc --noEmit, ei tulosta = ei virheitä)
