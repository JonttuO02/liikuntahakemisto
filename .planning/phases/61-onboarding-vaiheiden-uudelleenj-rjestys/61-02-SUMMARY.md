---
phase: "61"
plan: "02"
subsystem: onboarding
tags: [components, frontend, forms, location]
dependency_graph:
  requires: ["61-01"]
  provides: ["StepNimiJaURL", "StepSijainti", "ClaimSearchForm-simplified"]
  affects: ["app/business/onboarding/page.tsx (Plan 04)"]
tech_stack:
  added: []
  patterns:
    - "glass card shell reused from StepPaikka analog"
    - "handleNext fetch pattern from StepYhteystiedot analog"
    - "AnimatePresence error display from StepYhteystiedot"
    - "SijaintiPicker onChange from ClaimSearchForm"
key_files:
  created:
    - app/business/onboarding/StepNimiJaURL.tsx
    - app/business/onboarding/StepSijainti.tsx
  modified:
    - app/components/ClaimSearchForm.tsx
decisions:
  - "StepNimiJaURL CTA disabled only on paikkaId===null, never on URL field (website optional)"
  - "StepSijainti CTA disabled on lat===null OR loading; no extra error needed beyond disabled state"
  - "ClaimSearchForm CTA guard changed from coordinate check to yritysNimi.trim() non-empty"
metrics:
  duration: "~12min"
  completed: "2026-06-26"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 1
status: complete
---

# Phase 61 Plan 02: StepNimiJaURL, StepSijainti ja ClaimSearchForm-yksinkertaistus

**One-liner:** Kaksi uutta pre-wizard-askelta (nimi+URL, sijainti) sekä SijaintiPickerin poisto ClaimSearchFormista — lokalisointiin perustuvat uudet avaimet jo lisätty Plan 01:ssä.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create StepNimiJaURL component | 49b5f79 | app/business/onboarding/StepNimiJaURL.tsx (new) |
| 2 | Create StepSijainti component | 08d3b80 | app/business/onboarding/StepSijainti.tsx (new) |
| 3 | Remove location from ClaimSearchForm | fd06561 | app/components/ClaimSearchForm.tsx (modified) |

---

## What Was Built

### StepNimiJaURL (`app/business/onboarding/StepNimiJaURL.tsx`)

Uusi `'use client'` -komponentti joka korvaa vanhan `StepPaikka`-komponenttin. Näyttää paikan nimen vain-luku-tilassa ja kerää valinnaisen verkko-osoitteen. Propsit: `paikkaInfo: { nimi: string } | null`, `paikkaId: number | null`, `onNext: (websiteUrl: string | null) => void`.

- Käyttää `.glass rounded-2xl p-6` -korttirakennetta kuten StepPaikka-analogi
- Spinner-tila kun `paikkaInfo === null`
- URL-inputin luokka haettu StepYhteystiedot-analogista
- CTA ei koskaan disabled URL-kentän vuoksi; disabled vain kun `paikkaId === null`
- Ei tee AI-kutsuja — se on page.tsx:n vastuulla (Plan 04)

### StepSijainti (`app/business/onboarding/StepSijainti.tsx`)

Uusi `'use client'` -komponentti joka kerää paikan sijainnin. Propsit: `paikkaId: number`, `onNext: () => void`, `onPrev: () => void`.

- Renderöi `<SijaintiPicker onChange={...} />` muuttamattomana
- Tila: lat, lng, osoite, kaupunki, loading, error
- `handleNext()` POST → `/api/business/update-paikka` body: `{ paikka_id, section: 'sijainti', data: { osoite, kaupunki, latitude, longitude } }` + `Authorization: Bearer <token>`
- CTA disabled kun `lat === null || loading`; inline spinner loading-tilassa
- AnimatePresence-virheilmoitus epäonnistuneen tallennuksen jälkeen

### ClaimSearchForm (`app/components/ClaimSearchForm.tsx`)

Poistettu SijaintiPicker ja sijaintiin liittyvä tila/validointi:

- Poistettu `SijaintiPicker`-import
- Poistettu 4 tilamuuttujaa: `createOsoite`, `createKaupunki`, `createLat`, `createLng`
- Poistettu kolme sijainnin validointiblokkia `handleCreate`-funktiosta
- POST-body lähettää nyt vain `{ yritysNimi, toimipisteNimi }` (ei sijaintikenttiä)
- CTA `disabled` -ehto muutettu: `createLat === null` → `!yritysNimi.trim()`

---

## Deviations from Plan

None — plan executed exactly as written. All three tasks completed per spec.

---

## Known Stubs

None — komponentit ovat toiminnallisesti täydellisiä. page.tsx (Plan 04) kytkee ne yhteen.

---

## Threat Flags

No new trust boundaries introduced. StepSijainti submits coordinates to `/api/business/update-paikka` (T-61-05: already mitigated server-side in Plan 01 with coordinate range validation and ownership check). StepNimiJaURL URL stays in client state (T-61-06: accepted, standard form input).

---

## Self-Check: PASSED

- [x] `app/business/onboarding/StepNimiJaURL.tsx` exists (commit 49b5f79)
- [x] `app/business/onboarding/StepSijainti.tsx` exists (commit 08d3b80)
- [x] `app/components/ClaimSearchForm.tsx` modified (commit fd06561)
- [x] `npx tsc --noEmit` passed with no errors
- [x] No SijaintiPicker import remaining in ClaimSearchForm
- [x] No unused state variables remaining in ClaimSearchForm
