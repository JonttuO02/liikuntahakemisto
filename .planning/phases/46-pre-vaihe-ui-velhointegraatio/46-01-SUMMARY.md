---
phase: 46-pre-vaihe-ui-velhointegraatio
plan: "01"
subsystem: branding
tags: [types, utilities, client-safe, yiq, branding-preview]
dependency_graph:
  requires: []
  provides:
    - lib/branding/brandingResult.ts (BrandingResult, getContrastColor, buildBrandingPreview)
  affects:
    - app/business/onboarding/AnalysoiSivusto.tsx
    - app/components/DiagonaalKortti.tsx
    - app/business/onboarding/StepEsikatselu.tsx
tech_stack:
  added: []
  patterns:
    - YIQ luminance formula for contrast-colour selection
    - Client-safe type module pattern (no server imports)
key_files:
  created:
    - lib/branding/brandingResult.ts
  modified: []
decisions:
  - BrandingResult type mirrors GET /api/business/analyze-website response shape exactly (D-PA-02)
  - getContrastColor uses YIQ formula with NaN-safe parseInt fallback to 0 for malformed hex input
  - buildBrandingPreview does NOT embed colors into Liikuntapaikka fields — colours are passed as brandColor prop separately (D-BR-02)
  - opening_hours Array is converted to Record<day, {open,close}> keyed by English weekday strings matching lib/aukiolo.ts storage format
metrics:
  duration_seconds: 300
  completed_date: "2026-06-15"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 46 Plan 01: Branding Types & Utilities Summary

Client-safe BrandingResult type, YIQ-contrast utility getContrastColor, and buildBrandingPreview helper that maps branding API response to a Liikuntapaikka preview object.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create lib/branding/brandingResult.ts | 0b4e7b8 | lib/branding/brandingResult.ts |

## What Was Built

`lib/branding/brandingResult.ts` — yksittäinen client-turvallinen moduuli, joka tarjoaa kolme eksportia:

**BrandingResult** (type): Client-puolen tyyppi joka peilaa `GET /api/business/analyze-website` -reitin JSON-vastausta. Sisältää `status`, `logo_url`, `logo_type`, `colors`, `raw_analysis` (hinnat, aukioloajat, website_url) ja `error_message`. Kaikki Wave 2+ -suunnitelmat importoivat tästä.

**getContrastColor** (function): YIQ-luminanssikaava joka palauttaa `'#000000'` tai `'#ffffff'`. Ottaa hex-merkkijonon (# tai ilman), parsii R/G/B hex-segmenteistä (NaN → 0 turvakaatumiselle), laskee `yiq = (r*299 + g*587 + b*114) / 1000`. Palauttaa mustan kun yiq ≥ 128, valkoisen muuten. Käytetään DiagonaalKortissa (D-BR-03).

**buildBrandingPreview** (function): Rakentaa `Liikuntapaikka`-objektin onboarding-esikatselu-ruudun renderöintiä varten. `PaikkaBase`-kentät (nimi, laji, osoite jne.) tulevat aina paikkatietokannasta, ei brändidatasta. `opening_hours`-taulukko konvertoidaan `Record<string, {open, close}>`-muotoon englanniksi viikonpäivinimillä. `prices`-taulukko menee `hinnastaToHintaKuvaus`-funktion kautta hinta_kuvaus-merkkijonoksi. `business_managed: true` näyttää verifiointibadgen esikatselussa.

## Verification

- `npx tsc --noEmit` läpäistiin ilman virheitä koko projektissa
- getContrastColor('#ffffff') → '#000000' (YIQ = 254.9, vaalea → musta teksti)
- getContrastColor('#000000') → '#ffffff' (YIQ = 0, tumma → valkoinen teksti)
- buildBrandingPreview palauttaa Liikuntapaikka-yhteensopivan objektin kaikilla pakollisilla kentillä

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — kaikki kentät on täysin toteutettu. Ei placeholder-arvoja.

## Threat Flags

None — tiedosto on pelkkä type/utility-moduuli ilman uusia verkko- tai tietokantarajapintoja.

## Self-Check: PASSED

- lib/branding/brandingResult.ts exists: FOUND
- Commit 0b4e7b8 exists: FOUND
- TypeScript compilation: PASSED (no errors)
