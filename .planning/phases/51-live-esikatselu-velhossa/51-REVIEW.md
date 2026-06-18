---
phase: 51-live-esikatselu-velhossa
reviewed: 2026-06-18T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - app/business/WizardInner.tsx
  - app/business/onboarding/LivePreviewPane.tsx
  - app/business/onboarding/LivePreviewToggle.tsx
  - app/business/onboarding/StepAukioloajat.tsx
  - app/business/onboarding/StepHinnasto.tsx
  - app/business/onboarding/StepMediat.tsx
  - app/business/onboarding/StepYhteystiedot.tsx
  - lib/livePreview/LivePreviewContext.tsx
  - lib/livePreview/useDebouncedPreviewField.ts
  - messages/en.json
  - messages/fi.json
findings:
  critical: 1
  warning: 4
  info: 4
  total: 9
status: issues_found
---

# Phase 51: Code Review Report

**Reviewed:** 2026-06-18T00:00:00Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

This review supersedes the prior 51-REVIEW.md pass and was performed against the current state of all 6 plans' files, including plan 51-06's gap-closure fix for WR-01 (StepMediat unmount-cleanup staleness).

**WR-01 re-verification (required by task brief):** the `latestMediaRef` + sync-effect fix in `StepMediat.tsx` (commit `adcdf4b`) is correct. The ref is refreshed via a `useEffect` keyed on `[existingLogoUrl, existingPhotoUrls]`, and the unmount-only cleanup effect reads `latestMediaRef.current` instead of closing over mount-time state. Because React commits effects in declaration order on every render — including the final render before unmount — the ref is guaranteed to hold the latest persisted media by the time the cleanup can possibly run. This resolves the original bug (cleanup re-broadcasting pre-save URLs after a successful edit-mode save) without introducing a new staleness or stale-ref issue. No further action needed on WR-01.

However, this pass found a **new, more severe defect of the same class** in `LivePreviewContext.tsx`: the `buildBrandingPreview` derivation branch never threads the reducer's live `hinnasto`/`aukioloajat`/`yhteystiedot` state through, so the entire live-preview feature silently fails to reflect pricing/hours/contact edits for any venue that went through the website-analysis (branding) onboarding path — which is the flow the product steers most businesses toward. This is classified as a blocker (CR-01) because it doesn't just omit data, it displays stale/wrong data under the "live preview" label with no indication anything is wrong.

The remaining findings (carried over from the prior pass, re-verified as still present in the current code, plus two new ones) are robustness/consistency/accessibility gaps.

## Critical Issues

### CR-01: Live preview ignores pricing/hours/contact edits whenever brandingData is present

**File:** `lib/livePreview/LivePreviewContext.tsx:138-146`
**Issue:** The `livePreviewPaikka` derivation:

```ts
const livePreviewPaikka = useMemo<Liikuntapaikka | null>(() => {
  if (brandingData && paikkaInfo && typeof state.paikka_id === 'number') {
    return buildBrandingPreview(paikkaInfo, brandingData, state.paikka_id, state.media_urls?.logo)
  }
  if (paikkaInfo) {
    return buildDraftAsPaikka(state as OnboardingDraft, paikkaInfo)
  }
  return null
}, [state, paikkaInfo, brandingData])
```

When `brandingData` is truthy, `buildBrandingPreview` is called with only `paikkaInfo`, `brandingData`, `state.paikka_id`, and `state.media_urls?.logo`. Per its implementation (`lib/branding/brandingResult.ts:117-169`), pricing (`hinta_kuvaus`) and opening hours (`aukioloajat`) are always derived solely from `brandingResult.raw_analysis`, and contact fields (`puhelin`, `kuvaus`) are hardcoded to `null`. None of the reducer's `SET_HINNASTO` / `SET_AUKIOLOAJAT` / `SET_YHTEYSTIEDOT` payloads — dispatched on every debounced keystroke by `StepHinnasto`, `StepAukioloajat`, and `StepYhteystiedot` — ever reach the rendered preview in this branch.

Concretely: a branding-onboarded business edits pricing in Step 2. The `CalloutCard`/`DiagonaalKortti` stack in `LivePreviewPane` keeps showing the AI-scraped prices (or nothing, if none were scraped) and never reflects what the user is typing. The same applies to opening-hours and contact-info edits — only the `buildDraftAsPaikka` branch (used when `brandingData` is absent) correctly threads `state` through. This silently breaks the feature's core purpose for the most common onboarding path, with no visual indication the preview is stale.

**Fix:** Overlay the live draft state onto the branding-derived base object:

```ts
const livePreviewPaikka = useMemo<Liikuntapaikka | null>(() => {
  if (brandingData && paikkaInfo && typeof state.paikka_id === 'number') {
    const base = buildBrandingPreview(paikkaInfo, brandingData, state.paikka_id, state.media_urls?.logo)
    return {
      ...base,
      hinta_kuvaus: state.hinnasto?.length ? hinnastaToHintaKuvaus(state.hinnasto) : base.hinta_kuvaus,
      aukioloajat: state.aukioloajat ?? base.aukioloajat,
      puhelin: state.yhteystiedot?.puhelin ?? base.puhelin,
      kuvaus: state.yhteystiedot?.kuvaus ?? base.kuvaus,
      varauslinkki: state.yhteystiedot?.website ?? base.varauslinkki,
    }
  }
  if (paikkaInfo) {
    return buildDraftAsPaikka(state as OnboardingDraft, paikkaInfo)
  }
  return null
}, [state, paikkaInfo, brandingData])
```

Note: `StepEsikatselu.tsx` (the existing final-step preview) has the same gap in its own `buildBrandingPreview` call, but it re-fetches `draft` from Supabase on each visit rather than tracking live keystrokes, so its practical impact is "reflects last save, not last keystroke" — much less severe than the live-preview pane never updating during steps 2-4 at all. Consider applying the same fix there for consistency, though it is out of this phase's file scope.

## Warnings

### WR-01: useDebouncedValue resets its timer on every render in StepYhteystiedot, not just on field edits

**File:** `app/business/onboarding/StepYhteystiedot.tsx:50`
**Issue:**
```ts
const debouncedYhteystiedot = useDebouncedValue({ puhelin, email, website, kuvaus }, 280)
```
A fresh object literal is constructed every render of `StepYhteystiedot`. `useDebouncedValue`'s internal effect has dependency array `[value, delayMs]` (`lib/livePreview/useDebouncedPreviewField.ts:29-35`); a new object reference is a new dependency on every render, so the debounce timer restarts whenever `StepYhteystiedot` re-renders for *any* reason (not only when the user edits a field) — e.g. a parent state change bubbling down from `WizardInner`. In the worst case the debounced value may never settle within the intended 250-300ms window. `StepHinnasto` and `StepAukioloajat` don't have this problem because they pass their `rows`/`hours` state directly rather than a freshly-constructed literal.
**Fix:**
```ts
const yhteystiedotValue = useMemo(
  () => ({ puhelin, email, website, kuvaus }),
  [puhelin, email, website, kuvaus]
)
const debouncedYhteystiedot = useDebouncedValue(yhteystiedotValue, 280)
```

### WR-02: StepHinnasto inputs and row controls are not disabled during save/loading

**File:** `app/business/onboarding/StepHinnasto.tsx:253-291`
**Issue:** Unlike `StepYhteystiedot` (whose `<input>`/`<textarea>` elements are `disabled={loading}`), none of `StepHinnasto`'s table inputs (`kategoria`, `hinta`, `lisatieto`) or the add-row/remove-row buttons are disabled while `saving` or `loading` is true. A user can add/remove/edit pricing rows while a save request is in flight, racing the in-flight request's snapshot of `rows` against the user's subsequent edits — inconsistent with the rest of the wizard's pattern of disabling inputs during async operations.
**Fix:** Gate the table inputs and row buttons on `saving || loading`, mirroring `StepYhteystiedot`'s pattern, e.g. `disabled={saving || loading}` on each `<input>` and on `addPriceRow`/`removeRow`.

### WR-03: Day-toggle aria-label is identical for all seven days in StepAukioloajat

**File:** `app/business/onboarding/StepAukioloajat.tsx:248-263`
**Issue:** Every day's open/closed toggle switch uses the same static `aria-label={t('hoursToggleLabel')}` with no day name interpolated. A screen-reader user tabbing through the seven switches hears the identical label seven times with no way to distinguish which day's switch has focus — the preceding `<span>{EN_TO_FI[dayKey]}</span>` is a visual sibling, not referenced via `aria-labelledby`, so it isn't part of the button's accessible name.
**Fix:**
```ts
aria-label={`${t('hoursToggleLabel')} – ${EN_TO_FI[dayKey]}`}
```
or use `aria-labelledby` pointing at an id on the day-abbreviation span.

### WR-04: StepHinnasto's editMode save-success banner uses an inconsistent conditional idiom

**File:** `app/business/onboarding/StepHinnasto.tsx:305-319`
**Issue:** The condition is written as `(editMode ? saveSuccessVisible : false)` — functionally equivalent to `editMode && saveSuccessVisible`, but it's the only one of the four step components written this way; `StepAukioloajat` (line 300) and `StepYhteystiedot` (line 219) both use the simpler `editMode && saveSuccessVisible` form. The inconsistency raises the risk that a future edit "simplifies" this one differently (e.g. to bare `saveSuccessVisible`) without noticing the `editMode` guard is meant to be preserved.
**Fix:** Align with the other two components: `{editMode && saveSuccessVisible && ( ... )}`.

## Info

### IN-01: RESET action defined and handled but never dispatched

**File:** `lib/livePreview/LivePreviewContext.tsx:55,82-83`
**Issue:** `LivePreviewAction` includes a `RESET` variant and `livePreviewReducer` handles it, but no component in the reviewed file set ever dispatches `{ type: 'RESET', ... }`. This is dead code — either unused scaffolding for a future use case (e.g. resetting preview state when `paikkaId` changes) or a sign an intended behavior was never wired up.
**Fix:** Either remove the `RESET` action/case until it has a caller, or wire it up where needed and document why.

### IN-02: removeLogoFile ignores its parameter via blanket eslint-disable

**File:** `app/business/onboarding/StepMediat.tsx:138-141`
**Issue:**
```tsx
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function removeLogoFile(_i: number) {
  setLogoFiles([])
}
```
The function accepts an index parameter (to match `UploadDropZone`'s `onRemove` contract) but never uses it, suppressing the lint instead of fixing the type mismatch. Functionally fine today (there's only ever one logo file), but it hides intent — a future change supporting multiple logo slots could silently do the wrong thing here without the type system flagging it.
**Fix:** Type `onRemove` to accept no arguments for single-file zones, or keep the parameter and make the no-op explicit (e.g. `if (_i === 0) setLogoFiles([])`).

### IN-03: EN_TO_FI mapping duplicates FI_TO_EN from onboardingUtils without reuse

**File:** `app/business/onboarding/StepAukioloajat.tsx:12-20`
**Issue:** `StepAukioloajat` defines its own `EN_TO_FI` display map while `lib/onboardingUtils.ts` already exports the inverse `FI_TO_EN` map. The two must be kept in sync by hand (same 7 day keys, inverted), with no shared source of truth enforcing consistency between them.
**Fix:** Derive `EN_TO_FI` from `FI_TO_EN` programmatically, e.g. `Object.fromEntries(Object.entries(FI_TO_EN).map(([fi, en]) => [en, fi]))`, ideally co-located in `lib/onboardingUtils.ts` next to `ORDERED_DAYS`.

### IN-04: LivePreviewToggle segmented control lacks ARIA active-state semantics

**File:** `app/business/onboarding/LivePreviewToggle.tsx:28-49`
**Issue:** The Muokkaa/Esikatselu toggle buttons convey active state only via background color, with no `aria-pressed`, `role="tab"`/`aria-selected`, or equivalent attribute for assistive technology to determine which view is currently active.
**Fix:** Add `aria-pressed={activeView === 'edit'}` and `aria-pressed={activeView === 'preview'}` to the respective buttons (simplest fix given the current non-tablist markup), or restructure as a `role="tablist"`/`role="tab"` pattern with `aria-selected` if preferred.

---

_Reviewed: 2026-06-18T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
