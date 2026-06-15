---
phase: 46-pre-vaihe-ui-velhointegraatio
verified: 2026-06-16T00:00:00Z
status: human_needed
score: 14/14 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Navigate to /business/onboarding as a logged-in business user and confirm AnalysoiSivusto screen appears before any wizard steps"
    expected: "User sees 'Analysoi sivustosi' heading, URL input, 'Analysoi sivusto' CTA button, and 'Ohita' link — no wizard steps yet"
    why_human: "Page rendering with auth guard (layout.tsx RSC) and phase-state initial render cannot be verified by static analysis"
  - test: "Click 'Ohita' — verify transition to wizard step 1 with URL still /business/onboarding"
    expected: "Wizard ProgressBar appears at step 1; URL stays /business/onboarding (no navigation)"
    why_human: "Client-side state transition and URL behaviour require browser interaction"
  - test: "Submit a real URL (e.g. https://www.example.com), observe 'Analysoidaan sivustoasi...' spinner and 'Ohita' button are shown"
    expected: "Spinner visible, Ohita always accessible, poll loop starts"
    why_human: "Polling behaviour and network interaction require a live environment"
  - test: "After analysis completes (status=analyzed), confirm preview state shows logo, colour swatches, prices, opening hours, and 'Jatka velhoon ->' CTA"
    expected: "All four sections appear when data is present; clicking 'Jatka velhoon ->' transitions to wizard"
    why_human: "Preview rendering depends on real API response data"
  - test: "In wizard step 3 after confirming branding, check that price rows are pre-filled from branding when no draft hinnasto exists"
    expected: "Price rows show branding-extracted prices as editable fields"
    why_human: "Requires end-to-end data flow from analysis to step 3 form state"
  - test: "Navigate to wizard step 6 (Esikatselu) and verify DiagonaalKortti renders with brand colour on left panel"
    expected: "Left panel background uses brand hex; venue name and price text use YIQ-derived contrast colour"
    why_human: "Visual rendering of CSS inline styles requires browser inspection"
  - test: "Run: npm run build — verify no build errors"
    expected: "Build completes with exit code 0"
    why_human: "Next.js build validation is a runtime check"
---

# Phase 46: Pre-vaihe UI Velhointegraatio — Verification Report

**Phase Goal:** Business-käyttäjä näkee "Analysoi sivusto" -näkymän ennen onboarding-velhoa, voi tarkastella analyysin tuloksia esikatselussa ja jatkaa velhoon jossa steps 3–5 on esitäytetty ja step 6 renderöi brändivärit.

**Verified:** 2026-06-16
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | BrandingResult client type is defined and exported from lib/branding/brandingResult.ts | VERIFIED | File exists at `lib/branding/brandingResult.ts`, `export type BrandingResult` present at line 27 with all required fields |
| 2 | getContrastColor returns #000000 for light hex and #ffffff for dark hex using YIQ formula | VERIFIED | Function at line 52; strips #, parses R/G/B, computes YIQ = (r*299+g*587+b*114)/1000, returns '#000000' when yiq>=128 else '#ffffff' |
| 3 | buildBrandingPreview returns a Liikuntapaikka object with logo_url from brandingResult.logo_url | VERIFIED | Function at line 92; maps all Liikuntapaikka fields, sets `logo_url: brandingResult.logo_url` at line 138, `business_managed: true` |
| 4 | AnalysoiSivusto component exists and implements full 6-phase state machine | VERIFIED | `app/business/onboarding/AnalysoiSivusto.tsx` — 424 lines, `'use client'`, `type Phase = 'checking' \| 'url-input' \| 'analyzing' \| 'preview' \| 'error' \| 'timeout'` |
| 5 | On mount, component calls GET /api/business/analyze-website and routes to correct phase | VERIFIED | `checkStatus()` in useEffect at line 103; routes to 'preview', 'analyzing', or 'url-input' based on `data.status` |
| 6 | Poll loop has 30-try cap; on timeout transitions to 'timeout' phase | VERIFIED | `tryCountRef.current > 30` check at line 158; `setInterval(poll, 2000)` at line 199 |
| 7 | onConfirm(brandingResult) called in preview phase; onSkip called from Ohita buttons | VERIFIED | `onConfirm(brandingResult)` at line 415; `onSkip` called in analyzing (line 309), error (line 322), timeout (line 335), url-input (line 294) |
| 8 | Preview state shows logo, colour swatches, prices, opening hours | VERIFIED | Conditional renders at lines 345-401: logo img, colors flex row with circular swatches, prices ul, opening hours dl |
| 9 | page.tsx is 'use client' and renders AnalysoiSivusto in 'pre' phase | VERIFIED | `'use client'` at line 1; `AnalysoiSivusto` import at line 5; rendered at line 28 when `pagePhase === 'pre'` |
| 10 | page.tsx renders WizardInner with brandingData prop in 'wizard' phase | VERIFIED | `WizardInner mode="onboarding" brandingData={brandingData}` at line 38 inside Suspense; phase transition via handleConfirm/handleSkip |
| 11 | DiagonaalKortti accepts brandColor prop; left panel uses it as backgroundColor | VERIFIED | `brandColor?: string` in Props at line 35; inline style `...(brandColor ? { backgroundColor: brandColor } : {})` at line 92; `contrastText` applied to name (line 123) and price spans (lines 165, 177) |
| 12 | StepEsikatselu uses buildBrandingPreview when brandingData is non-null | VERIFIED | Either/or logic at lines 37-43: `buildBrandingPreview(paikkaInfo, brandingData, draft.paikka_id)` when brandingData present; `buildDraftAsPaikka` fallback; `brandColor={brandColor}` passed to DiagonaalKortti at line 124 |
| 13 | WizardInner passes brandingData through OnboardingMode to steps 3-6 | VERIFIED | `brandingData` prop at line 35 of WizardInner; `initialBrandingHinnasto={brandingPrices}` (line 257), `initialBrandingAukioloajat={brandingHours}` (line 268), `initialBrandingWebsite={brandingWebsite}` (line 276), `brandingData={brandingData}` to StepEsikatselu (line 285) |
| 14 | Steps 3-5 accept branding pre-fill props with draft-priority fallback | VERIFIED | StepHinnasto: `initialBrandingHinnasto` at line 23, priority chain lines 67-80; StepAukioloajat: `initialBrandingAukioloajat` at line 32, priority `initialDraftAukioloajat ?? initialBrandingAukioloajat ?? existingAukioloajat` at line 71; StepYhteystiedot: `initialBrandingWebsite` at line 18, `initialYhteystiedot?.website ?? initialBrandingWebsite ?? ''` at line 41 |

**Score:** 14/14 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/branding/brandingResult.ts` | BrandingResult type, getContrastColor, buildBrandingPreview | VERIFIED | 144 lines, all three exports present and substantive |
| `app/business/onboarding/AnalysoiSivusto.tsx` | Full state machine component, min 150 lines | VERIFIED | 424 lines, default export, 'use client' |
| `app/business/onboarding/page.tsx` | 'use client' phase controller | VERIFIED | 44 lines, renders AnalysoiSivusto + WizardInner with brandingData |
| `app/components/DiagonaalKortti.tsx` | brandColor prop support | VERIFIED | brandColor in Props, getContrastColor imported, inline style on left panel |
| `app/business/onboarding/StepEsikatselu.tsx` | brandingData prop + buildBrandingPreview | VERIFIED | Full either/or logic, brandColor extracted and passed to DiagonaalKortti |
| `app/business/WizardInner.tsx` | brandingData prop on OnboardingMode, pass-through to steps 3-6 | VERIFIED | Union type includes brandingData, derived brandingPrices/Hours/Website, passed to all steps |
| `app/business/onboarding/StepHinnasto.tsx` | initialBrandingHinnasto prop | VERIFIED | Prop present, priority chain correct |
| `app/business/onboarding/StepAukioloajat.tsx` | initialBrandingAukioloajat prop | VERIFIED | Prop present, priority chain in useEffect |
| `app/business/onboarding/StepYhteystiedot.tsx` | initialBrandingWebsite prop | VERIFIED | Prop present, used in website useState initializer |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `AnalysoiSivusto.tsx` | `lib/branding/brandingResult.ts` | `import type BrandingResult` | WIRED | Line 5: `import type { BrandingResult } from '@/lib/branding/brandingResult'` |
| `DiagonaalKortti.tsx` | `lib/branding/brandingResult.ts` | `import getContrastColor` | WIRED | Line 15: `import { getContrastColor } from '@/lib/branding/brandingResult'` |
| `StepEsikatselu.tsx` | `lib/branding/brandingResult.ts` | `import buildBrandingPreview, BrandingResult` | WIRED | Line 9: `import { type BrandingResult, buildBrandingPreview } from '@/lib/branding/brandingResult'` |
| `WizardInner.tsx` | `lib/branding/brandingResult.ts` | `import BrandingResult` | WIRED | Line 10: `import { type BrandingResult } from '@/lib/branding/brandingResult'` |
| `page.tsx` | `AnalysoiSivusto.tsx` | import and render | WIRED | Line 5 import; line 28 `<AnalysoiSivusto onConfirm={handleConfirm} onSkip={handleSkip} />` |
| `page.tsx` | `WizardInner.tsx` | render with brandingData | WIRED | Line 4 import; line 38 `<WizardInner mode="onboarding" brandingData={brandingData} />` |
| `WizardInner.tsx` | `StepEsikatselu.tsx` | brandingData prop | WIRED | Line 285: `<StepEsikatselu draft={draft} paikkaInfo={paikkaInfo} brandingData={brandingData} onPrev={...} />` |
| `StepEsikatselu.tsx` | `DiagonaalKortti.tsx` | brandColor prop | WIRED | Line 124: `<DiagonaalKortti paikka={draftAsPaikka} brandColor={brandColor} />` |
| `AnalysoiSivusto.tsx` | `api/business/analyze-website` | GET + POST with Bearer | WIRED | Lines 110-111 (GET), lines 224-231 (POST) — both include `Authorization: Bearer ${token}` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `AnalysoiSivusto.tsx` | `brandingResult` | GET /api/business/analyze-website → `setBrandingResult(data)` | Yes — API route reads from `business_branding` table | FLOWING |
| `StepEsikatselu.tsx` | `draftAsPaikka` | `buildBrandingPreview(paikkaInfo, brandingData, draft.paikka_id)` | Yes — maps real branding data fields | FLOWING |
| `DiagonaalKortti.tsx` | `contrastText` / `brandColor` | Prop from StepEsikatselu → `brandingData?.colors?.[0]` | Yes — from analysis result | FLOWING |
| `StepHinnasto.tsx` | `rows` initial state | `brandingPrices` from WizardInner → `brandingData.raw_analysis.prices` | Yes — from analysis result (when status=analyzed) | FLOWING |
| `StepAukioloajat.tsx` | `hours` state | `brandingHours` Record from WizardInner IIFE | Yes — converted from `raw_analysis.opening_hours` | FLOWING |
| `StepYhteystiedot.tsx` | `website` state | `initialBrandingWebsite` = `raw_analysis.website_url` | Yes — from analysis result | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — checks require a running server. The human verification section covers all runnable behaviours.

---

### Probe Execution

Step 7c: No probe scripts declared or found for this phase.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ONBOARD-08 | 46-04, 46-05 | New "Analysoi sivusto" screen before 6-step wizard | SATISFIED | `AnalysoiSivusto.tsx` renders before WizardInner; page.tsx phase='pre' shows it first |
| ONBOARD-09 | 46-04 | "Analysoi" button sets status to analyzing, shows spinner; failed state shows error + skip | SATISFIED | POST in handleSubmit → `setPhase('analyzing')`; error phase shows "Analyysi epäonnistui" + Ohita |
| ONBOARD-10 | 46-04 | Analysis results shown in preview (logo, colours, prices, hours) | SATISFIED | All four sections conditionally rendered in 'preview' phase |
| ONBOARD-11 | 46-03 | Extracted prices pre-fill step 3 (Hinnasto) | SATISFIED | `initialBrandingHinnasto` prop with draft-priority chain in StepHinnasto |
| ONBOARD-12 | 46-03 | Extracted opening hours pre-fill step 4 (Aukioloajat) | SATISFIED | `initialBrandingAukioloajat` prop with `initialDraftAukioloajat ?? initialBrandingAukioloajat ?? existingAukioloajat` chain |
| ONBOARD-13 | 46-03, 46-05 | Website URL pre-fills step 5 website field | SATISFIED | `initialBrandingWebsite` prop; `initialYhteystiedot?.website ?? initialBrandingWebsite ?? ''` |
| PREV-01 | 46-02 | Step 6 preview renders DiagonaalKortti with logo and brand colours; fallback when no data | SATISFIED | `buildBrandingPreview` sets `logo_url`; `brandColor={brandColor}` passed to DiagonaalKortti; fallback to `buildDraftAsPaikka` when brandingData is null |

---

### Anti-Patterns Found

Scan of all phase 46 modified files:

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `AnalysoiSivusto.tsx` | 283 | `placeholder="https://example.fi"` | Info | Input placeholder — not a stub, correct UX pattern |

No TBD, FIXME, XXX, or unreferenced debt markers found in any file modified by this phase. The `_brandingData` stub from plan 03 (noted in SUMMARY as intentional coordination point) was correctly overwritten by plan 02 — `StepEsikatselu.tsx` now has the full `buildBrandingPreview` implementation and no underscore alias remains.

---

### Human Verification Required

7 items need human testing — all relate to live browser behaviour and build:

### 1. Pre-vaihe screen renders before wizard

**Test:** Navigate to `http://localhost:3000/business/onboarding` as a logged-in business user.
**Expected:** "Analysoi sivustosi" heading appears with URL input field, "Analysoi sivusto" button, and "Ohita" link. No wizard progress bar visible yet.
**Why human:** RSC auth guard in layout.tsx, page phase-state initial render, and CSS rendering cannot be verified by static analysis.

### 2. Ohita transitions to wizard without URL change

**Test:** Click the "Ohita" button on the pre-vaihe screen.
**Expected:** Wizard appears at step 1; URL stays `/business/onboarding` (no navigation to a different path).
**Why human:** Client-side state transition and URL invariant require browser observation.

### 3. URL submission triggers analyzing state

**Test:** Enter `https://www.example.com` in the URL field and click "Analysoi sivusto".
**Expected:** "Analysoidaan sivustoasi..." spinner appears; "Ohita" button is visible and clickable during analysis.
**Why human:** Network interaction and polling behaviour require a live environment.

### 4. Preview state displays extracted data

**Test:** Wait for analysis to complete (or use an account with existing `status=analyzed` branding data).
**Expected:** Preview shows logo image (if found), colour swatches (circular, coloured), prices list, opening hours list. "Jatka velhoon ->" CTA calls onConfirm and transitions to wizard.
**Why human:** Preview rendering depends on real API response content.

### 5. Step 3 pre-fill from branding

**Test:** After clicking "Jatka velhoon ->", navigate to wizard step 3 (Hinnasto) with no prior draft.
**Expected:** Price rows are pre-filled with branding-extracted prices as editable fields (not fixed placeholder rows).
**Why human:** Requires real end-to-end data flow from analysis result through WizardInner to StepHinnasto.

### 6. Step 6 DiagonaalKortti renders brand colours

**Test:** Navigate to wizard step 6 (Esikatselu).
**Expected:** DiagonaalKortti left panel background matches brand hex colour; venue name and price text use the YIQ-derived contrast colour (black or white depending on brand colour lightness).
**Why human:** Visual rendering of inline CSS styles requires browser inspection.

### 7. Production build succeeds

**Test:** Run `npm run build` from the project root.
**Expected:** Build completes with exit code 0, no TypeScript or bundling errors.
**Why human:** Next.js build validation is a runtime check; TypeScript strict mode in build can catch issues missed by `tsc --noEmit`.

---

### Gaps Summary

No gaps found. All 14 must-have truths are VERIFIED in the codebase. All 7 requirements are SATISFIED. All key links are WIRED. No debt markers found.

The phase requires human verification only because the feature involves browser-rendered UI, live API polling, CSS visual rendering, and build confirmation — none of which can be determined by static code analysis alone.

---

_Verified: 2026-06-16_
_Verifier: Claude (gsd-verifier)_
