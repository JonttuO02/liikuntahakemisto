---
phase: 46-pre-vaihe-ui-velhointegraatio
plan: "03"
subsystem: business-onboarding
tags: [branding, wizard, pre-fill, onboarding, data-flow]
dependency_graph:
  requires:
    - lib/branding/brandingResult.ts (BrandingResult type — from 46-01)
  provides:
    - app/business/WizardInner.tsx (brandingData prop on OnboardingMode)
    - app/business/onboarding/StepHinnasto.tsx (initialBrandingHinnasto prop)
    - app/business/onboarding/StepAukioloajat.tsx (initialBrandingAukioloajat prop)
    - app/business/onboarding/StepYhteystiedot.tsx (initialBrandingWebsite prop)
  affects:
    - app/business/onboarding/StepEsikatselu.tsx (brandingData prop stub added)
tech_stack:
  added: []
  patterns:
    - Optional prop chaining for branding pre-fill with draft-priority fallback chain
    - IIFE for opening_hours array-to-record conversion in component function
key_files:
  created: []
  modified:
    - app/business/WizardInner.tsx
    - app/business/onboarding/StepHinnasto.tsx
    - app/business/onboarding/StepAukioloajat.tsx
    - app/business/onboarding/StepYhteystiedot.tsx
    - app/business/onboarding/StepEsikatselu.tsx
decisions:
  - brandingData prop is optional on WizardInner and OnboardingMode — existing page.tsx call site unaffected
  - brandingHours derived via IIFE inside OnboardingMode (array→Record conversion)
  - StepEsikatselu gets minimal brandingData prop stub so WizardInner compiles; 46-02 adds full logic
  - Draft data always wins over branding data in every priority chain (T-46-03-01 mitigated)
metrics:
  duration_seconds: 420
  completed_date: "2026-06-15"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 5
---

# Phase 46 Plan 03: WizardInner Branding Data Flow Summary

BrandingData prop thread-through from WizardInner OnboardingMode to wizard steps 3–6 with draft-priority pre-fill chains for hinnasto, aukioloajat, and website.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add new pre-fill props to StepHinnasto, StepAukioloajat, StepYhteystiedot | cd2c850 | StepHinnasto.tsx, StepAukioloajat.tsx, StepYhteystiedot.tsx |
| 2 | Add brandingData prop to WizardInner's OnboardingMode and pass through to steps 3–6 | 8ae6655 | WizardInner.tsx, StepEsikatselu.tsx |

## What Was Built

**StepHinnasto.tsx** — lisätty `initialBrandingHinnasto?: Array<{ label: string; price: string }> | null` -prop. Onboarding-moodissa prioriteettiketju: draft-data → branding-data (konvertoitu `{ kategoria, hinta }` -muotoon) → 4 kiinteää paikkamerkkiriviä. Edit-moodi on muuttumaton.

**StepAukioloajat.tsx** — lisätty `initialBrandingAukioloajat?: Record<string, { open: string; close: string }> | null` -prop. `useEffect`-prioriteettiketju: `initialDraftAukioloajat ?? initialBrandingAukioloajat ?? existingAukioloajat`. Dependency array päivitetty sisältämään uusi prop.

**StepYhteystiedot.tsx** — lisätty `initialBrandingWebsite?: string | null` -prop. `useState` alustus: `initialYhteystiedot?.website ?? initialBrandingWebsite ?? ''`. Kolmitasoinen prioriteetti yhdellä lausekkeella.

**WizardInner.tsx** — lisätty `BrandingResult`-import, `WizardInnerProps`-unioniin `brandingData?: BrandingResult | null` onboarding-haaraan, `OnboardingMode`-funktio vastaanottaa propin parametrina. Branding-johdetut esitäyttöarvot: `brandingPrices`, `brandingHours` (IIFE array→Record-konversio), `brandingWebsite` — kaikki lasketaan vain kun `brandingData?.status === 'analyzed'`. Välitetään step 3:lle, 4:lle, 5:lle ja 6:lle. Exportattu `WizardInner` välittää `brandingData={props.brandingData}`.

**StepEsikatselu.tsx** — lisätty minimaalinen `brandingData?: BrandingResult | null` -prop ja `BrandingResult`-import jotta WizardInner.tsx kompiloi puhtaasti wave 2 -ympäristössä. 46-02 laajentaa tämän täysimittaiseksi `buildBrandingPreview`-integraatioksi.

## Verification

1. WizardInner.tsx importoi BrandingResult — KYLLÄ (`import { type BrandingResult } from '@/lib/branding/brandingResult'`)
2. OnboardingMode välittää brandingData StepEsikatseluun — KYLLÄ
3. OnboardingMode välittää initialBrandingHinnasto StepHinnastolle — KYLLÄ
4. OnboardingMode välittää initialBrandingAukioloajat StepAukioloajatille — KYLLÄ
5. OnboardingMode välittää initialBrandingWebsite StepYhteystiedotille — KYLLÄ
6. `npx tsc --noEmit` ei raportoi virheitä — KYLLÄ (exit code 0)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] StepEsikatselu brandingData prop stub**
- **Found during:** Task 2
- **Issue:** WizardInner.tsx välitti `brandingData`-propin StepEsikatselulle, mutta StepEsikatselulla ei ollut kyseistä proppia (46-02 lisää sen rinnakkaisessa worktreessä). Tämä aiheutti TS2322-virheen.
- **Fix:** Lisätty minimaalinen `brandingData?: BrandingResult | null` -prop StepEsikatseluun (`_brandingData`-aliaksella koska props ei vielä käytetä). Luvassa 46-02 kirjoittaa tämän yli täydellä toteutuksella.
- **Files modified:** app/business/onboarding/StepEsikatselu.tsx
- **Commit:** 8ae6655 (sisältyy Task 2 -commitiin)

## Known Stubs

`StepEsikatselu.tsx`: `brandingData`-prop dekonstruoidaan aliaksella `_brandingData` — prop vastaanotetaan mutta ei käytetä vielä tässä filssä. 46-02 korvaa tämän täydellä `buildBrandingPreview`-toteutuksella.

Stub on intentionaalinen koordinointipiste rinnakkaiselle 46-02-suoritukselle.

## Threat Flags

None — muutokset ovat pelkästään prop-deklaraatioita ja UI-tilan alustuksia. Ei uusia verkko- tai tietokantarajapintoja.

## Threat Model Compliance

- **T-46-03-01 (Tampering — branding overwrites user edits):** MITIGATED — kaikissa kolmessa komponentissa draft-data on priorisoitu brandingdatan yli. StepHinnasto: `draftSource?.length ? draftSource : brandSource`. StepAukioloajat: `initialDraftAukioloajat ?? initialBrandingAukioloajat`. StepYhteystiedot: `initialYhteystiedot?.website ?? initialBrandingWebsite`.
- **T-46-03-02 (Information Disclosure — website_url):** ACCEPTED per plan.

## Self-Check: PASSED

- app/business/WizardInner.tsx: FOUND
- app/business/onboarding/StepHinnasto.tsx: FOUND
- app/business/onboarding/StepAukioloajat.tsx: FOUND
- app/business/onboarding/StepYhteystiedot.tsx: FOUND
- app/business/onboarding/StepEsikatselu.tsx: FOUND
- Commit cd2c850: FOUND (git log)
- Commit 8ae6655: FOUND (git log)
- TypeScript compilation: PASSED (exit code 0, no errors)
