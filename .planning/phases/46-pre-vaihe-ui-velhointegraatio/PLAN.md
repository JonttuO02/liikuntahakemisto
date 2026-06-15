# Phase 46 — Pre-vaihe UI & velhointegraatio

## Goal

Business-käyttäjä näkee "Analysoi sivusto" -näkymän ennen onboarding-velhoa, voi tarkastella analyysin tuloksia esikatselussa ja jatkaa velhoon jossa steps 3–5 on esitäytetty ja step 6 renderöi brändivärit.

## Requirements covered

ONBOARD-08, ONBOARD-09, ONBOARD-10, ONBOARD-11, ONBOARD-12, ONBOARD-13, PREV-01

---

## Wave Structure

```
Wave 1 (no deps)
└── 46-01  Types & utilities (lib/branding/brandingResult.ts)

Wave 2 (parallel — all depend on 46-01, no file overlap between them)
├── 46-02  DiagonaalKortti + StepEsikatselu brand preview
├── 46-03  WizardInner + step pre-fill (steps 3–5)
└── 46-04  AnalysoiSivusto component (new file)

Wave 3 (depends on all of Wave 2)
└── 46-05  Wire-up: onboarding/page.tsx refactor + human verification
```

Total: 5 plan files, 3 waves. Wave 2 runs in parallel (saves ~50% execution time).

---

## Plans

### 46-01 — Types & utilities
**Wave:** 1  
**Files:** `lib/branding/brandingResult.ts` (new)  
**What it does:**
- Defines `BrandingResult` client-safe type (mirrors GET /api/business/analyze-website response)
- Implements `getContrastColor(hex)` using YIQ formula
- Implements `buildBrandingPreview(paikkaBase, brandingResult, draftPaikkaId)` helper that produces a `Liikuntapaikka` object from branding data

All downstream plans import from this file. Must complete before Wave 2 starts.

---

### 46-02 — DiagonaalKortti + StepEsikatselu (brand preview)
**Wave:** 2 — can run in parallel with 46-03 and 46-04  
**Files:**
- `app/components/DiagonaalKortti.tsx` — add optional `brandColor?: string` prop; left panel backgroundColor = brandColor; name and price text color = getContrastColor(brandColor)
- `app/business/onboarding/StepEsikatselu.tsx` — add optional `brandingData?: BrandingResult | null` prop; use `buildBrandingPreview` when brandingData is available; pass `brandColor={brandingData.colors[0]}` to DiagonaalKortti

**Requirements:** PREV-01, ONBOARD-13

---

### 46-03 — WizardInner + step pre-fill (steps 3–5)
**Wave:** 2 — can run in parallel with 46-02 and 46-04  
**Files:**
- `app/business/WizardInner.tsx` — add `brandingData?: BrandingResult | null` to onboarding mode props; compute brandingPrices/brandingHours/brandingWebsite; pass down to steps 3–5 and brandingData to step 6
- `app/business/onboarding/StepHinnasto.tsx` — add `initialBrandingHinnasto` prop; used when no draft hinnasto exists
- `app/business/onboarding/StepAukioloajat.tsx` — add `initialBrandingAukioloajat` prop; inserted in priority chain after draft, before Google Places data
- `app/business/onboarding/StepYhteystiedot.tsx` — add `initialBrandingWebsite` prop; pre-fills website field when no draft website

**Priority rule in all steps:** draft data > branding data > empty/default. User can always override.

**Requirements:** ONBOARD-10, ONBOARD-11, ONBOARD-12

---

### 46-04 — AnalysoiSivusto component
**Wave:** 2 — can run in parallel with 46-02 and 46-03  
**Files:** `app/business/onboarding/AnalysoiSivusto.tsx` (new, ~200 lines)

**State machine:**
```
checking → (on mount GET)
  → status=analyzed  → preview
  → status=analyzing → analyzing (starts poll)
  → otherwise        → url-input

url-input → user submits URL → POST → analyzing

analyzing → poll every 2s, max 30 tries
  → status=analyzed → preview
  → status=failed   → error
  → 30 tries done   → timeout

preview → "Jatka velhoon →" → calls onConfirm(brandingResult)
       → "Analysoi uudelleen" → url-input

error   → "Yritä uudelleen" → url-input  |  "Ohita" → onSkip()
timeout → same as error, different message
```

**Props:** `onConfirm: (brandingData: BrandingResult) => void` + `onSkip: () => void`

**Requirements:** ONBOARD-08, ONBOARD-09

---

### 46-05 — Wire-up: onboarding/page.tsx refactor
**Wave:** 3 — depends on 46-02, 46-03, 46-04  
**Files:** `app/business/onboarding/page.tsx`

Rewrites the thin server wrapper into a `'use client'` phase controller:
- `useState<'pre' | 'wizard'>('pre')` — starts in pre-vaihe
- `useState<BrandingResult | null>(null)` — holds confirmed branding data
- Renders `<AnalysoiSivusto>` when `pagePhase === 'pre'`
- On confirm: `setBrandingData(result)` + `setPagePhase('wizard')`
- On skip: `setBrandingData(null)` + `setPagePhase('wizard')`
- Renders `<WizardInner mode="onboarding" brandingData={brandingData} />` when `pagePhase === 'wizard'`
- Also fixes minor: WizardInner's OnboardingMode main wrapper changed to fragment to avoid nested main elements

Ends with a `checkpoint:human-verify` to confirm the end-to-end flow works.

**Requirements:** ONBOARD-08, ONBOARD-09, ONBOARD-13, PREV-01

---

## Architecture decisions honored

| Decision | Where implemented |
|----------|------------------|
| D-PA-01: pre-vaihe in page.tsx, URL stays /business/onboarding | 46-05 |
| D-PA-02: brandingData owned by page.tsx, passed to WizardInner | 46-05 |
| D-PA-03: on mount check if already analyzed | 46-04 (checking phase) |
| D-PA-04: Ohita sets wizard with brandingData=null | 46-05 |
| D-PI-01: AnalysoiSivusto independent paikkaInfo load | 46-04 (handled via existing WizardInner loadDraft pattern) |
| D-PU-01: spinner + Ohita always visible during analysis | 46-04 |
| D-PU-02: poll every 2s, max 30 tries | 46-04 |
| D-PU-03: failed state with Finnish error message | 46-04 |
| D-PU-04: timeout message when 60s elapsed | 46-04 |
| D-ES-01: preview shows CalloutCard equivalent, DiagonaalKortti, venue view | 46-02 (StepEsikatselu) |
| D-ES-02: separate buildBrandingPreview helper | 46-01 |
| D-ES-03: preview has Jatka/Analysoi uudelleen | 46-04 |
| D-BR-01: logo_url → paikka.logo_url in preview | 46-01 (buildBrandingPreview) |
| D-BR-02: colors[0] → DiagonaalKortti left panel backgroundColor | 46-02 |
| D-BR-03: getContrastColor YIQ for text color | 46-01 + 46-02 |
| D-BR-04: fallback to laji.color/Building2 when no brandColor | 46-02 |
| D-WI-01: StepHinnasto pre-fill from branding prices | 46-03 |
| D-WI-02: StepAukioloajat pre-fill from branding hours | 46-03 |
| D-WI-03: StepYhteystiedot website_url pre-fill | 46-03 |

---

## Execution order

```
/gsd:execute-phase 46        ← runs 46-01 first
/gsd:execute-phase 46        ← runs 46-02, 46-03, 46-04 in parallel
/gsd:execute-phase 46        ← runs 46-05 + human verify checkpoint
```

Or with the GSD orchestrator: `/gsd:execute-phase 46` handles wave sequencing automatically.
