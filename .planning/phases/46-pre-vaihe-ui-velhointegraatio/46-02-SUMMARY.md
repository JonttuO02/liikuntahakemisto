---
phase: 46-pre-vaihe-ui-velhointegraatio
plan: "02"
subsystem: branding-ui
tags: [branding, preview, DiagonaalKortti, StepEsikatselu, YIQ, brandColor]
dependency_graph:
  requires:
    - lib/branding/brandingResult.ts (from 46-01)
  provides:
    - app/components/DiagonaalKortti.tsx (brandColor prop support)
    - app/business/onboarding/StepEsikatselu.tsx (brandingData prop + buildBrandingPreview)
  affects:
    - app/business/onboarding/AnalysoiSivusto.tsx (Wave 3+ caller)
tech_stack:
  added: []
  patterns:
    - Inline style spread for conditional backgroundColor (no regressions on undefined)
    - YIQ-derived contrastText applied via style prop only when brandColor is set
    - Either/or preview path: buildBrandingPreview when brandingData present, buildDraftAsPaikka otherwise
key_files:
  created: []
  modified:
    - app/components/DiagonaalKortti.tsx
    - app/business/onboarding/StepEsikatselu.tsx
decisions:
  - contrastText is derived from getContrastColor and applied only via inline style; Tailwind classes are left in place as fallback
  - brandColor is undefined (not null) when absent so React skips the style attribute entirely
  - StepEsikatselu uses either/or logic: when brandingData is truthy the branding path always wins
  - PaikkaKortti and PaikkaSheet do not receive brandColor — they use logo_url already embedded in the Liikuntapaikka object by buildBrandingPreview
metrics:
  duration_seconds: 420
  completed_date: "2026-06-16"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 2
---

# Phase 46 Plan 02: Brand Color UI Integration Summary

DiagonaalKortti left panel renders with brand hex color and YIQ-derived text contrast; StepEsikatselu wires brandingData through buildBrandingPreview for step 6 preview.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add brandColor prop to DiagonaalKortti left panel | c444372 | app/components/DiagonaalKortti.tsx |
| 2 | Add brandingData prop to StepEsikatselu and wire buildBrandingPreview | f2fd0b8 | app/business/onboarding/StepEsikatselu.tsx |

## What Was Built

**DiagonaalKortti** (`app/components/DiagonaalKortti.tsx`):

- Uusi valinnainen prop `brandColor?: string` lisätty `DiagonaalKorttiProps`-interfaceen ja komponentin destruktointiin.
- Importattu `getContrastColor` moduulista `@/lib/branding/brandingResult`.
- `contrastText` johdetaan `getContrastColor(brandColor)`-kutsulla kun `brandColor` on truthy; muutoin `undefined`.
- Vasemman paneelin `div` saa `backgroundColor: brandColor` inline-tyyliin levityksellä (`...brandColor ? { backgroundColor: brandColor } : {}`). `clipPath`-arvo pysyy muuttumattomana.
- Paikannimen `<p>`-elementti ja hintaspanit (marquee ja flex-wrap) saavat `style={contrastText ? { color: contrastText } : undefined}`. Tailwind-luokat pysyvät ennallaan.
- Urheilupilli (`backgroundColor: laji.color`), oikea paneeli (valokuva/kamera) ja alarivin tila-/etäisyystekstit eivät muutu.
- Kun `brandColor` on `undefined` (kaikki olemassa olevat kutsukohdat), komponentti renderöityy täsmälleen kuten ennen — ei regressiota.

**StepEsikatselu** (`app/business/onboarding/StepEsikatselu.tsx`):

- Uusi valinnainen prop `brandingData?: BrandingResult | null` lisätty `StepEsikatseluProps`-interfaceen.
- Importattu `{ type BrandingResult, buildBrandingPreview }` moduulista `@/lib/branding/brandingResult`.
- `draftAsPaikka`-logiikka korvattu joko/tai-haaralla:
  - Kun `brandingData && paikkaInfo && typeof draft?.paikka_id === 'number'`: käytetään `buildBrandingPreview(paikkaInfo, brandingData, draft.paikka_id)` (D-ES-01, D-ES-02).
  - Muutoin: käytetään `buildDraftAsPaikka(draft, paikkaInfo)` kun molemmat ovat saatavilla, muuten `null` (olemassa oleva käyttäytyminen säilynyt).
- `brandColor = brandingData?.colors?.[0] ?? undefined` johdetaan ja välitetään `DiagonaalKortti`-komponentille propina.
- `PaikkaKortti` ja `PaikkaSheet` saavat `draftAsPaikka`:n `paikka`-propina — brandColor-prop ei tarvita koska `buildBrandingPreview` asettaa jo `logo_url`:n paikkaobjektiin.
- Lataustilasiirtymät, submit-käsittelijä ja alatunniste pysyvät muuttumattomina.

## Verification

Kaikki 6 verifiointikohtaa läpäisty:

1. DiagonaalKortti.tsx sisältää `brandColor` Props-interfacessa: KYLLÄ
2. DiagonaalKortti.tsx importoi `getContrastColor` polusta `@/lib/branding/brandingResult`: KYLLÄ
3. StepEsikatselu.tsx sisältää `brandingData` Props-interfacessa: KYLLÄ
4. StepEsikatselu.tsx importoi `buildBrandingPreview` polusta `@/lib/branding/brandingResult`: KYLLÄ
5. StepEsikatselu.tsx välittää `brandColor={brandColor}` DiagonaalKortti-komponentille: KYLLÄ
6. `npx tsc --noEmit` — exit code 0, ei virheitä: KYLLÄ

## Deviations from Plan

None — suunnitelma toteutettu täsmälleen kirjatun mukaisesti.

## Known Stubs

None — molemmat komponentit on täysin integroitu. Ei placeholder-arvoja tai kovakoodattuja tyhjiä arvoja.

## Threat Flags

None — uhkamallin T-46-02-01 ja T-46-02-02 arvioidut uhat hyväksytty suunnitelmassa. `brandColor` käytetään ainoastaan inline-tyylin `backgroundColor`-arvona; React serialisoi style-propsit turvallisesti (ei XSS-vektoria). `logo_url` on liiketoiminnan oma Supabase-storage-assetti.

## Self-Check: PASSED

- app/components/DiagonaalKortti.tsx exists: FOUND
- app/business/onboarding/StepEsikatselu.tsx exists: FOUND
- Commit c444372 exists: FOUND
- Commit f2fd0b8 exists: FOUND
- brandColor in DiagonaalKortti: FOUND
- buildBrandingPreview in StepEsikatselu: FOUND
- brandingData in StepEsikatselu: FOUND
- TypeScript compilation (npx tsc --noEmit): PASSED (exit 0)
