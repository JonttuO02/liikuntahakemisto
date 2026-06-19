# Phase 49: Esikatselu- ja kontrastikorjaukset - Pattern Map

**Mapped:** 2026-06-17
**Files analyzed:** 4 (2 modified, 1 new component, 2 translation files modified)
**Analogs found:** 4 / 4

This is a narrowly-scoped bugfix phase. The UI-SPEC.md already specifies exact markup for the new component and exact diffs for the two edits — this PATTERNS.md confirms those against the real current file contents (line numbers, exact strings) so the planner can write literal diffs instead of approximate ones.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/components/ContrastSafeLogo.tsx` | component (presentational primitive) | request-response (pure render, no data fetch) | `app/components/DiagonaalKortti.tsx` (logo-box subsection, lines 94-107) | exact (same visual pattern, smaller scope) |
| `app/business/onboarding/StepEsikatselu.tsx` | component (modified in place) | request-response (static props render) | itself — no external analog needed, swap is local | exact (self-analog) |
| `app/business/onboarding/AnalysoiSivusto.tsx` | component (modified in place) | request-response (static props render) | itself — no external analog needed, swap is local | exact (self-analog) |
| `messages/fi.json`, `messages/en.json` | config (i18n strings) | CRUD (key insertion) | existing `previewLabelCard`/`previewLabelDiag`/`previewLabelSheet` keys, same files lines 181-183 | exact |

## Pattern Assignments

### `app/components/ContrastSafeLogo.tsx` (new component, presentational)

**Analog:** `app/components/DiagonaalKortti.tsx` lines 94-107 (logo-box backdrop pattern)

**Analog excerpt — logo box with non-white backdrop:**
```tsx
// app/components/DiagonaalKortti.tsx lines 94-107
<div className="w-10 h-10 rounded-lg bg-[rgba(0,0,0,0.06)] flex items-center justify-center shrink-0">
  {paikka.logo_url ? (
    <img
      src={paikka.logo_url}
      alt=""
      aria-hidden
      className="w-full h-full object-cover rounded-lg"
    />
  ) : (
    <Building2 size={20} className="text-[rgba(0,0,0,0.25)]" />
  )}
</div>
```

**Target markup (per UI-SPEC.md, component inventory item 1)** — same `rgba(0,0,0,0.06)` tint and `rounded-lg` corner radius as the analog, but sized to the picker's existing `h-12 w-auto` footprint instead of DiagonaalKortti's fixed `w-10 h-10`, and using `object-contain` (not `object-cover`, since this is a logo candidate the user is evaluating, not a confirmed brand logo being cropped to a fixed tile):
```tsx
export default function ContrastSafeLogo({ src, alt, className }: { src: string; alt?: string; className?: string }) {
  return (
    <div className={`w-full h-12 rounded-lg bg-[rgba(0,0,0,0.06)] flex items-center justify-center overflow-hidden ${className ?? ''}`}>
      <img src={src} alt={alt ?? ''} className="h-full w-auto object-contain" />
    </div>
  )
}
```

**No fallback/empty-icon needed** (unlike `DiagonaalKortti`'s `Building2` fallback) — `ContrastSafeLogo` is only ever called with a real `candidate.url` string (the picker only renders `.map()` over actual candidates), so there is no "no logo" case to handle inside the primitive itself.

**No `'use client'` directive needed** — purely presentational, no hooks, no state. Confirm `AnalysoiSivusto.tsx` is already a client component (it uses `useState`/handlers) so importing this into it works either way.

---

### `app/business/onboarding/StepEsikatselu.tsx` (modify in place)

**Current state (confirmed by direct read):**

Imports (lines 1-12):
```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import { useTranslations } from 'next-intl'
import { buildDraftAsPaikka, type OnboardingDraft, type PaikkaBase } from '@/lib/onboardingUtils'
import { type BrandingResult, buildBrandingPreview } from '@/lib/branding/brandingResult'
import PaikkaKortti from '@/app/components/PaikkaKortti'
import DiagonaalKortti from '@/app/components/DiagonaalKortti'
import PaikkaSheet from '@/app/components/PaikkaSheet'
```

`draftAsPaikka` construction (lines 37-42) — confirms `latitude`/`longitude` come from `PaikkaBase`, typed `number | null` per `lib/onboardingUtils.ts`:
```tsx
const draftAsPaikka =
  brandingData && paikkaInfo && typeof draft?.paikka_id === 'number'
    ? buildBrandingPreview(paikkaInfo, brandingData, draft.paikka_id)
    : draft && paikkaInfo
      ? buildDraftAsPaikka(draft, paikkaInfo)
      : null
```

First preview section — exact current markup to replace (lines 118-124):
```tsx
{/* LISTAKORTTI */}
<div className="flex flex-col gap-2">
  <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
    {t('previewLabelCard')}
  </span>
  <PaikkaKortti paikka={draftAsPaikka} />
</div>
```

**Required replacement (D-01/D-02, exact target per UI-SPEC.md):**
```tsx
{/* KARTTAKORTTI */}
<div className="flex flex-col gap-2">
  <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
    {t('previewLabelCallout')}
  </span>
  <CalloutCard p={{ ...draftAsPaikka, latitude: draftAsPaikka.latitude ?? 0, longitude: draftAsPaikka.longitude ?? 0 }} />
</div>
```

**Import swap:** remove `import PaikkaKortti from '@/app/components/PaikkaKortti'`, add `import CalloutCard from '@/app/components/CalloutCard'`. Before deleting, grep this file for any other `PaikkaKortti` usage (the only call site found in this read is line 123 — none elsewhere in the file).

**Sibling sections untouched** (confirmed, do not modify, lines 126-140):
```tsx
{/* DIAGONAALIKORTTI */}
<div className="flex flex-col gap-2">
  <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
    {t('previewLabelDiag')}
  </span>
  <DiagonaalKortti paikka={draftAsPaikka} brandColor={brandColor} />
</div>

{/* PROFIILISIVU */}
<div className="flex flex-col gap-2">
  <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
    {t('previewLabelSheet')}
  </span>
  <PaikkaSheet paikka={draftAsPaikka} preview={true} todo={false} onClose={() => {}} onToggleTodo={() => {}} />
</div>
```

**CalloutCard's prop signature confirmed (no latitude/longitude read in render body):**
```tsx
// app/components/CalloutCard.tsx line 24
export default function CalloutCard({ p }: { p: Liikuntapaikka & { latitude: number; longitude: number } }) {
```
Render body only destructures `p.laji`, `p.nimi`, `p.hinta_min`, `p.hinta_max`, `p.hinta_kuvaus` — confirms D-02's `?? 0` shim is purely type-level, no visual impact.

---

### `app/business/onboarding/AnalysoiSivusto.tsx` (modify in place)

**Current state — logo-candidate picker (lines 584-623, confirmed by direct read):**
```tsx
{/* Logo picker (ONBOARD-14) */}
{brandingResult.logo_candidates && brandingResult.logo_candidates.length > 0 ? (
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <LabelCaps>Logo</LabelCaps>
      {savingSection === 'logo' && <Spinner className="w-4 h-4" />}
    </div>
    {brandingResult.logo_candidates.length > 1 && (
      <p className="text-sm text-[rgba(17,17,17,0.45)]">
        Valitse logo, jota käytetään profiilissasi
      </p>
    )}
    <div className="flex flex-row flex-wrap gap-2">
      {brandingResult.logo_candidates.map(candidate => {
        const isSelected = selectedLogoUrl === candidate.url
        return (
          <button
            key={candidate.url}
            type="button"
            onClick={() => selectLogo(candidate.url)}
            className={`flex flex-col items-center gap-1 border rounded-lg p-2 transition-colors ${
              isSelected
                ? 'border-[#111111] ring-2 ring-[#111111]'
                : 'border-[rgba(0,0,0,0.12)]'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={candidate.url}
              alt=""
              className="h-12 w-auto object-contain rounded"
            />
            <span className="text-[10px] text-[rgba(17,17,17,0.45)]">
              {candidate.type}
            </span>
          </button>
        )
      })}
    </div>
  </div>
) : ( /* empty-state branch, untouched */ ... )}
```

**Required change — exact line 611-615 bug site swap:**
```tsx
{/* before */}
<img
  src={candidate.url}
  alt=""
  className="h-12 w-auto object-contain rounded"
/>

{/* after */}
<ContrastSafeLogo src={candidate.url} />
```
Remove the now-unused `{/* eslint-disable-next-line @next/next/no-img-element */}` comment above it (no longer needed since `<img>` moves inside `ContrastSafeLogo`).

**Import to add:**
```tsx
import ContrastSafeLogo from '@/app/components/ContrastSafeLogo'
```

**Everything else in this block (button wrapper, `isSelected` ring logic, `candidate.type` label, empty-state branch) is untouched** — `ContrastSafeLogo` nests inside the existing `<button>`, it does not replace the button.

---

### `messages/fi.json` / `messages/en.json` (i18n key addition)

**Analog — existing sibling keys, same object, Business namespace (both files, lines 181-183):**
```json
// messages/fi.json:181-183
"previewLabelCard": "LISTAKORTTI",
"previewLabelDiag": "DIAGONAALIKORTTI",
"previewLabelSheet": "PROFIILISIVU",
```
```json
// messages/en.json:181-183
"previewLabelCard": "LIST CARD",
"previewLabelDiag": "DIAGONAL CARD",
"previewLabelSheet": "VENUE PAGE",
```

**Required addition (D-01, new key, do not repoint `previewLabelCard`):**
```json
// fi.json — insert alongside the three above
"previewLabelCallout": "KARTTAKORTTI",
```
```json
// en.json — insert alongside the three above
"previewLabelCallout": "MAP CALLOUT",
```
Insert in the same object as `previewLabelCard`/`previewLabelDiag`/`previewLabelSheet` (Business namespace) — do not create a new namespace or duplicate the object. `previewLabelCard` itself remains unchanged because `PreviewModal.tsx` (out of scope) still depends on it.

## Shared Patterns

### Logo backdrop tint consistency
**Source:** `app/components/DiagonaalKortti.tsx` lines 94-107 (`rgba(0,0,0,0.06)`)
**Apply to:** `app/components/ContrastSafeLogo.tsx` only (new primitive). Do NOT propagate to `PaikkaSheet.tsx` (which uses a different tint, `rgba(255,255,255,0.15)`, lines 158-170) or refactor `DiagonaalKortti.tsx` itself — both are explicitly out of scope per CONTEXT.md D-03 and the UI-SPEC's "Explicitly NOT touched" note.

### Label caps caption styling
**Source:** `app/business/onboarding/StepEsikatselu.tsx` lines 119-121 (existing, reused verbatim for the new section)
```tsx
<span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
  {t('previewLabelCallout')}
</span>
```
**Apply to:** Only the swapped first section in `StepEsikatselu.tsx`. No new styling — the class string is identical to the other two sections, only the translation key/string content changes.

### Static type-shim for missing optional fields
**Source:** D-02's `?? 0` nullish-coalescing pattern, matches the codebase's existing inline-shim style (no codebase precedent for a separate named constant for this kind of one-off type satisfaction was found in `StepEsikatselu.tsx` — the file does not have a "constants" section, so inline `?? 0` at the call site is the simplest match to existing conventions).
**Apply to:** Only the `CalloutCard p={...}` prop construction in `StepEsikatselu.tsx`.

## No Analog Found

None. All four files/edits have a directly confirmed real-code analog or are themselves the target file with line-level content already read and verified.

## Metadata

**Analog search scope:** `app/components/`, `app/business/onboarding/`, `messages/`
**Files scanned:** `StepEsikatselu.tsx`, `AnalysoiSivusto.tsx` (lines 575-630), `CalloutCard.tsx` (full), `DiagonaalKortti.tsx` (lines 85-114), `PaikkaKortti.tsx` (referenced, not re-read — confirmed dead import target per CONTEXT.md), `messages/fi.json` / `messages/en.json` (lines 181-183)
**Pattern extraction date:** 2026-06-17
