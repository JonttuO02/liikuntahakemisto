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
  critical: 0
  warning: 5
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

This pass re-verifies the two previously-reported critical/blocker findings (WR-01 unmount-cleanup staleness in `StepMediat.tsx`, CR-01 branding-path live preview never threading hinnasto/aukioloajat/yhteystiedot through `buildBrandingPreview`) and performs a fresh full review of all 11 files in their current state.

**WR-01 re-verification (StepMediat.tsx unmount-cleanup, plan 51-06):** Confirmed correct. `latestMediaRef` (lines 100-103) is refreshed via a `useEffect` keyed on `[existingLogoUrl, existingPhotoUrls]`, and the unmount-only cleanup effect (lines 112-123) reads `latestMediaRef.current` rather than closing over mount-time state. React commits effects in declaration order on every render, including the final render before unmount, so the ref is guaranteed to hold the latest persisted media at the time the cleanup actually runs. No staleness or regression found.

**CR-01 re-verification (LivePreviewContext.tsx branding-path overlay, plan 51-07):** Confirmed correct and complete. `lib/livePreview/LivePreviewContext.tsx:143-159` now builds the branding base via `buildBrandingPreview` and overlays `state.hinnasto`/`state.aukioloajat`/`state.yhteystiedot` on top, falling back to the base value when the corresponding state field is absent. All three live-state slices (pricing, hours, contact) are threaded through for the branding path exactly as they already were for the non-branding (`buildDraftAsPaikka`) path. No new staleness introduced — the `useMemo` dependency array `[state, paikkaInfo, brandingData]` is complete and the reducer state is plain data (no closures), so there is no stale-closure risk analogous to the original StepMediat bug.

One residual nuance worth flagging (not a regression, but a behavioral edge case introduced by the fix — see WR-01 below): when a user clears all pricing rows back to empty on the branding path, the preview reverts to showing the AI-scraped prices instead of "no price" because the overlay only applies when `state.hinnasto?.length` is truthy.

The remaining findings are robustness/consistency/accessibility gaps, carried over from the prior pass (still present in current code) plus this pass's review.

## Warnings

### WR-01: Branding-path pricing overlay can't represent "user cleared all prices" — silently reverts to scraped prices

**File:** `lib/livePreview/LivePreviewContext.tsx:148`
**Issue:**
```ts
hinta_kuvaus: state.hinnasto?.length ? hinnastaToHintaKuvaus(state.hinnasto) : base.hinta_kuvaus,
```
This correctly overlays live pricing edits while the user has at least one priced row, but it cannot distinguish "no SET_HINNASTO dispatched yet" from "user explicitly deleted every row" — both produce `state.hinnasto` as an empty array (`StepHinnasto.tsx` dispatches `payload: []` once all rows are price-less, see `StepHinnasto.tsx:124-131`). In the latter case the live preview falls back to `base.hinta_kuvaus`, i.e. the original AI-scraped prices, even though the user just emptied the pricing table. The preview then shows data the user is actively trying to remove, which is the same class of "preview shows wrong data with no indication" defect CR-01 was filed for, just narrower in scope (empty-state only, not "never updates").
**Fix:** Distinguish "not yet edited" from "edited to empty" by tracking whether `SET_HINNASTO` has ever been dispatched (e.g. add a `hinnastoTouched: boolean` flag to `PreviewDraft`, set `true` on first `SET_HINNASTO`), or simpler: always trust `state.hinnasto` once it is non-`null`/non-`undefined` and only fall back to `base.hinta_kuvaus` when `state.hinnasto` is `null`/`undefined` (its `buildInitialState` default), e.g.:
```ts
hinta_kuvaus: state.hinnasto != null ? hinnastaToHintaKuvaus(state.hinnasto) : base.hinta_kuvaus,
```
This treats `[]` (explicitly cleared) as "show nothing" while still falling back to branding data before any dispatch has occurred.

### WR-02: useDebouncedValue resets its timer on every render in StepYhteystiedot, not just on field edits

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

### WR-03: StepHinnasto inputs and row controls are not disabled during save/loading

**File:** `app/business/onboarding/StepHinnasto.tsx:253-291`
**Issue:** Unlike `StepYhteystiedot` (whose `<input>`/`<textarea>` elements are `disabled={loading}`), none of `StepHinnasto`'s table inputs (`kategoria`, `hinta`, `lisatieto`) or the add-row/remove-row buttons are disabled while `saving` or `loading` is true. A user can add/remove/edit pricing rows while a save request is in flight, racing the in-flight request's snapshot of `rows` against the user's subsequent edits — inconsistent with the rest of the wizard's pattern of disabling inputs during async operations.
**Fix:** Gate the table inputs and row buttons on `saving || loading`, mirroring `StepYhteystiedot`'s pattern, e.g. `disabled={saving || loading}` on each `<input>` and on `addPriceRow`/`removeRow`.

### WR-04: Day-toggle aria-label is identical for all seven days in StepAukioloajat

**File:** `app/business/onboarding/StepAukioloajat.tsx:248-263`
**Issue:** Every day's open/closed toggle switch uses the same static `aria-label={t('hoursToggleLabel')}` (resolves to "Open"/"Auki" in both locales — verified in `messages/en.json` and `messages/fi.json`) with no day name interpolated. A screen-reader user tabbing through the seven switches hears the identical label seven times with no way to distinguish which day's switch has focus — the preceding `<span>{EN_TO_FI[dayKey]}</span>` is a visual sibling, not referenced via `aria-labelledby`, so it isn't part of the button's accessible name.
**Fix:**
```ts
aria-label={`${t('hoursToggleLabel')} – ${EN_TO_FI[dayKey]}`}
```
or use `aria-labelledby` pointing at an id on the day-abbreviation span.

### WR-05: StepHinnasto's editMode save-success banner uses an inconsistent conditional idiom

**File:** `app/business/onboarding/StepHinnasto.tsx:305-319`
**Issue:** The condition is written as `(editMode ? saveSuccessVisible : false)` — functionally equivalent to `editMode && saveSuccessVisible`, but it's the only one of the four step components written this way; `StepAukioloajat` (line 300) and `StepYhteystiedot` (line 219) both use the simpler `editMode && saveSuccessVisible` form. The inconsistency raises the risk that a future edit "simplifies" this one differently (e.g. to bare `saveSuccessVisible`) without noticing the `editMode` guard is meant to be preserved.
**Fix:** Align with the other two components: `{editMode && saveSuccessVisible && ( ... )}`.

## Info

### IN-01: RESET action defined and handled but never dispatched

**File:** `lib/livePreview/LivePreviewContext.tsx:60,87-88`
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
