---
phase: 46-pre-vaihe-ui-velhointegraatio
plan: "05"
subsystem: onboarding-ui
tags: [client-component, state-machine, branding, phase-controller, wizard, pre-vaihe]
dependency_graph:
  requires:
    - app/business/onboarding/AnalysoiSivusto.tsx (from 46-04)
    - app/business/WizardInner.tsx with brandingData prop (from 46-03)
    - lib/branding/brandingResult.ts BrandingResult type (from 46-01)
  provides:
    - app/business/onboarding/page.tsx (phase controller: pre → wizard)
  affects:
    - app/business/WizardInner.tsx (OnboardingMode double-wrap fixed)
tech_stack:
  added: []
  patterns:
    - page.tsx as 'use client' phase controller (pre/wizard state machine)
    - State ownership: page.tsx owns brandingData, passes down to WizardInner
    - Fragment wrapper pattern: OnboardingMode returns <> instead of <main> to avoid double-wrapping
key_files:
  created: []
  modified:
    - app/business/onboarding/page.tsx
    - app/business/WizardInner.tsx
key_decisions:
  - "page.tsx converted to 'use client' so it can own pre/wizard phase state — layout.tsx RSC guard still runs first and protects the route"
  - "OnboardingMode outer <main> replaced with React Fragment to avoid nested <main> elements after page.tsx took ownership of the layout wrapper"
  - "Suspense wrapper retained for WizardInner because it uses useSearchParams() which requires Suspense in Next.js App Router"
requirements-completed:
  - ONBOARD-08
  - ONBOARD-09
  - ONBOARD-13
  - PREV-01
duration: 15min
completed: "2026-06-16"
---

# Phase 46 Plan 05: Onboarding Page Phase Controller Summary

**page.tsx muutettu palvelinkomponentista 'use client' -vaiheohjaajana, joka hallitsee pre/wizard-tilan ja välittää brandingData-propsin WizardInnerille koko Phase 46 -integraation viimeisenä liimana.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-16T00:00:00Z
- **Completed:** 2026-06-16T00:15:00Z
- **Tasks:** 1 (+ checkpoint:human-verify)
- **Files modified:** 2

## Accomplishments

- app/business/onboarding/page.tsx kirjoitettu uudelleen 'use client' -komponentiksi, joka hallitsee `PagePhase` ('pre' | 'wizard') ja `brandingData` (BrandingResult | null) -tiloja
- AnalysoiSivusto renderöidään 'pre'-vaiheessa; WizardInner (Suspense-käärissä) renderöidään 'wizard'-vaiheessa brandingData-propsin kanssa
- WizardInner.tsx:n OnboardingMode-komponentin ulompi `<main>` vaihdettu React Fragmentiksi — poistetaan kaksinkertainen `<main>`-elementti, kun page.tsx ottaa layout-omistajuuden
- URL pysyy /business/onboarding läpi koko virtauksen (ei navigointia, vain tilamuutos)
- TypeScript-tarkistus läpäisty ilman virheitä

## Task Commits

1. **Task 1: Rewrite onboarding/page.tsx as 'use client' phase controller** - `7b8e8ed` (feat)

## Files Created/Modified

- `app/business/onboarding/page.tsx` — Uudelleenkirjoitettu 'use client' -vaiheohjaajana; hallitsee pre/wizard-tilaa; omistaa brandingData-tilan
- `app/business/WizardInner.tsx` — OnboardingMode: ulompi `<main>` vaihdettu `<>` -fragmentiksi ja latausspinneri siirretty `<div>`-elementtiin double-wrap-ongelman korjaamiseksi

## Decisions Made

- page.tsx muutettu 'use client' -komponentiksi niin että se voi omistaa UI-tilan; layout.tsx RSC-suojaus ajaa ensin Next.js:n renderöintiputkessa eikä ohitu
- OnboardingMode käyttää nyt React Fragmentia `<main>`-elementin sijaan koska page.tsx tarjoaa oman layout-wrapperin — vältetään sisäkkäiset `<main>`-elementit jotka ovat semanttisesti virheellisiä
- Suspense-käärinen säilytetty WizardInnerille koska se käyttää `useSearchParams()`:iä, joka vaatii Suspensen Next.js App Routerissa

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — kaikki Phase 46 -komponentit toimivat oikealla datalla.

## Threat Flags

None — page.tsx:n muuttaminen 'use client' -komponentiksi ei ohita layout.tsx RSC-suojausta (T-46-05-01 hyväksytty suunnitelmassa).

## Self-Check: PASSED

- app/business/onboarding/page.tsx exists: FOUND
- app/business/WizardInner.tsx exists (modified): FOUND
- Commit 7b8e8ed exists: FOUND
- TypeScript compilation: PASSED (no errors)
- page.tsx starts with 'use client': VERIFIED
- page.tsx imports AnalysoiSivusto: VERIFIED
- page.tsx imports WizardInner: VERIFIED
- page.tsx imports BrandingResult: VERIFIED
- WizardInner OnboardingMode no longer has outer main: VERIFIED

## Next Phase Readiness

Phase 46 -integraatio on valmis. Kaikki viisi suunnitelmaa on toteutettu:
- 46-01: BrandingResult-tyyppi ja perusta
- 46-02: DiagonaalKortti brandi-väreillä
- 46-03: WizardInner brandingData-prop-putki
- 46-04: AnalysoiSivusto-komponentti
- 46-05: page.tsx vaiheohjaajana (tämä suunnitelma)

Lopullinen integraatio odottaa ihmisen tarkistusta (checkpoint:human-verify): käyttäjä voi nyt vierailla /business/onboarding -sivulla ja nähdä Analysoi sivustosi -näkymän ennen ohjatun toiminnon vaiheita.

---
*Phase: 46-pre-vaihe-ui-velhointegraatio*
*Completed: 2026-06-16*
