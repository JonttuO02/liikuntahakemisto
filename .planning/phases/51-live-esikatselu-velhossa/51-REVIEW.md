---
phase: 51-live-esikatselu-velhossa
reviewed: 2026-06-18T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - lib/livePreview/LivePreviewContext.tsx
  - lib/livePreview/useDebouncedPreviewField.ts
  - app/business/onboarding/LivePreviewPane.tsx
  - app/business/onboarding/LivePreviewToggle.tsx
  - messages/fi.json
  - messages/en.json
  - app/business/onboarding/StepHinnasto.tsx
  - app/business/onboarding/StepMediat.tsx
  - app/business/onboarding/StepAukioloajat.tsx
  - app/business/onboarding/StepYhteystiedot.tsx
  - app/business/WizardInner.tsx
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 51: Code Review Report

**Reviewed:** 2026-06-18T00:00:00Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Phase 51 wires a shared `LivePreviewContext` (reducer + derived `Liikuntapaikka`) into four wizard step components and renders it via `LivePreviewPane`/`LivePreviewToggle`. The architecture is sound and the field-mapping mirrors `StepEsikatselu`'s existing derivation closely, which limits divergence risk. However, the media step's instant (non-debounced) live-preview wiring has a real lifecycle bug: it dispatches local `URL.createObjectURL` blob URLs into the shared context and then revokes those same URLs on unmount/change without ever clearing them from context state, leaving the preview pane holding broken image references once the user leaves the Media step. There are also several smaller robustness and dead-code issues: an unused `RESET` action, an unguarded regex-based storage path parse, and reducer state that is never reset across venue/paikka switches in `EditMode`.

## Critical Issues

### CR-01: Blob URLs dispatched to shared LivePreviewContext are revoked while still referenced, leaving the preview pane with broken images

**File:** `app/business/onboarding/StepMediat.tsx:60-90`
**Issue:** `stagedPreviewUrls` and `logoPreviewUrl` are `URL.createObjectURL(...)` blob URLs created via `useMemo`. They are dispatched into the shared `LivePreviewContext` via `SET_MEDIA` (lines 82-90) with no debounce, and the context reducer copies the URL strings into `state.media_urls` (`LivePreviewContext.tsx:68-81`), where they persist as long-lived preview state consumed by `LivePreviewPane`/`CalloutCard`/`DiagonaalKortti`.

Separately, two cleanup effects revoke these exact blob URLs whenever the memoized array/value changes or the component unmounts (`StepMediat.tsx:65-67`, `74-76`). This includes the case where the user navigates away from the Mediat step (component unmount) while a staged photo/logo is still selected — the blob URL is revoked immediately, but `LivePreviewContext`'s `state.media_urls` is never updated to drop or replace the now-invalid URL. The live preview pane (visible in the desktop split-view sidebar at all times, and in the mobile preview toggle) will then render `<img src="blob:...">` for a revoked blob, producing a broken image until the user re-enters the Mediat step.

This also affects normal usage: selecting a new photo replaces the array reference, triggering the cleanup of the *previous* `stagedPreviewUrls` value — if the dispatch effect (line 82) for the new value hasn't committed yet relative to render timing in React 18 strict/concurrent paths, there is a window where context can reference a just-revoked URL. The unmount case is the deterministic, always-reproducible failure: step 1 (Mediat) → step 2 (Hinnasto) navigation guarantees a broken logo/photo thumbnail in the sidebar preview for the rest of the onboarding flow (existing uploaded URLs are unaffected since those come from Supabase Storage, but any *staged, not-yet-uploaded* file's blob preview is permanently broken in the context after leaving the step).

**Fix:** Either (a) dispatch a clearing/replacement action on unmount that drops blob URLs from context state, or (b) avoid revoking on unmount and instead revoke only when superseded by a newer URL for the same slot, or (c) simplest — don't persist blob URLs into the cross-step context at all; only dispatch them while the Mediat step is mounted and have the reducer/consumer fall back to last-known persisted (non-blob) URLs once the step unmounts:

```tsx
// StepMediat.tsx — clear blob URLs from shared context on unmount instead of
// letting them dangle as revoked references.
useEffect(() => {
  return () => {
    dispatch({
      type: 'SET_MEDIA',
      payload: { logo: existingLogoUrl ?? null, photos: existingPhotoUrls },
    })
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

## Warnings

### WR-01: `RESET` action defined and exported but never dispatched — dead reducer branch with no reset path on venue switch

**File:** `lib/livePreview/LivePreviewContext.tsx:55, 82-83`
**Issue:** `LivePreviewAction` includes a `RESET` case that fully replaces state, but no caller in the reviewed files ever dispatches it. In `WizardInner.tsx`'s `EditMode`, `LivePreviewProvider`'s `initialDraft` prop is recomputed from `localHinnasto`/`localAukioloajat`/`localYhteystiedot`/`localLogoUrl`/`localPhotoUrls` on every render, but `useReducer`'s initializer (`buildInitialState`) only runs once on mount — so if `paikkaId` ever changes after mount (e.g. a future multi-venue switch without remounting `LivePreviewProvider`), the reducer state would not pick up the new `initialDraft`/`paikkaId` since there's no `RESET` dispatch wired to such a transition. Currently this is masked because `WizardInner` always remounts the whole tree per route, but the action's existence without a call site signals either an incomplete wiring or speculative/dead code.
**Fix:** Either wire a `useEffect` that dispatches `RESET` when `paikkaId` changes, or remove the unused action and its branch if no caller is planned:
```tsx
useEffect(() => {
  dispatch({ type: 'RESET', payload: buildInitialState(paikkaId, initialDraft) })
}, [paikkaId])
```

### WR-02: `useDebouncedValue` is called with a fresh object literal every render, restarting the debounce timer on unrelated re-renders

**File:** `app/business/onboarding/StepYhteystiedot.tsx:50`
**Issue:** `useDebouncedValue({ puhelin, email, website, kuvaus }, 280)` constructs a brand-new object on every render. Since `useDebouncedValue`'s effect dependency is `value` (by reference, `lib/livePreview/useDebouncedPreviewField.ts:29-35`), any re-render of `StepYhteystiedot` — not just ones caused by these four fields changing — resets the 280ms debounce timer. If a parent re-render (e.g. triggered by `LivePreviewProvider`'s `value` memo updating from a sibling step's dispatch, or React 18 batching artifacts) happens to coincide with continuous typing, the debounced value may never settle long enough to fire, delaying the live-preview update indefinitely during fast typing.
**Fix:** Memoize the object before passing it to the hook so identity is stable across renders that don't change the underlying fields:
```tsx
const yhteystiedotValue = useMemo(() => ({ puhelin, email, website, kuvaus }), [puhelin, email, website, kuvaus])
const debouncedYhteystiedot = useDebouncedValue(yhteystiedotValue, 280)
```

### WR-03: `handleDeleteExistingPhoto`'s storage-path regex silently no-ops on unexpected URL shapes, leaving orphaned storage objects

**File:** `app/business/onboarding/StepMediat.tsx:114-128`
**Issue:** `pathMatch` extracts the storage path via a hardcoded regex assuming the public Supabase Storage URL format. If `url` doesn't match (e.g. a CDN-rewritten URL, a different bucket, or any future URL shape change), `storagePath` is `undefined` and the function silently skips the storage delete (`if (storagePath) { ... }`) while still removing the entry from `existingPhotoUrls` state (line 127) and, on next save, from `finalPhotoUrls`. The net effect is the photo disappears from the UI but the underlying Storage object is never deleted — an orphaned, unbounded file accumulating in the bucket with no error surfaced to the user or any log.
**Fix:** Log or surface a warning when the regex fails to match, so silent storage-orphan accumulation is at least observable:
```ts
const storagePath = pathMatch?.[1]
if (storagePath) {
  const supabase = createBusinessBrowserClient()
  await supabase.storage.from('business-media').remove([storagePath])
} else {
  console.warn('handleDeleteExistingPhoto: could not derive storage path from URL', url)
}
```

### WR-04: `EditMode`'s `LivePreviewProvider initialDraft` is reconstructed as a new object every render with no memoization

**File:** `app/business/WizardInner.tsx:400-406`
**Issue:** The `initialDraft` prop passed to `LivePreviewProvider` in `EditMode` is a new literal object on every render of `EditMode`. While `LivePreviewProvider`'s `useReducer` initializer only consumes this on first mount (so there's no functional bug today), this is a fragile pattern: any future refactor that makes `LivePreviewProvider` re-derive state from `initialDraft` via a `useEffect` (a natural next step, see WR-01) would immediately start firing on every parent re-render because the object reference is never stable, causing render loops or redundant resets.
**Fix:** Wrap in `useMemo` keyed on the underlying primitive/array values, or accept that `initialDraft` is mount-only and document it explicitly with a comment at the `LivePreviewProvider` prop type to prevent future misuse.

## Info

### IN-01: Inconsistent `'use client'` placement style note left only as a comment, not enforced

**File:** `lib/livePreview/useDebouncedPreviewField.ts:11-13`
**Issue:** The module relies on a comment-only contract ("must only be imported by client components") rather than any lint rule or runtime guard. This is fine for a small surface today, but nothing prevents a future server component from importing `useDebouncedValue` and crashing at build/runtime with a unhelpful error, since `useState`/`useEffect` would simply be unavailable in a server context. Not a current bug — purely a maintainability note.
**Fix:** Consider an ESLint rule (e.g. `eslint-plugin-react-hooks` server-component awareness, or a project-specific lint rule restricting imports of this module to files with `'use client'`) if this pattern recurs elsewhere.

### IN-02: Duplicate inline `aria-live`/error-message JSX block repeated near-verbatim across all four step components

**File:** `app/business/onboarding/StepHinnasto.tsx:305-334`, `app/business/onboarding/StepAukioloajat.tsx:299-328`, `app/business/onboarding/StepYhteystiedot.tsx:218-247`, `app/business/onboarding/StepMediat.tsx:504-551`
**Issue:** Each step component repeats nearly identical `AnimatePresence` + success/error `<motion.p>` markup (same classNames, same `role`/`aria-live` attributes, same conditional `editMode ? saveError : error` pattern). This isn't new to Phase 51 (pre-existing pattern from prior phases), but the new step-level live-preview wiring (`useDebouncedValue` + `useEffect` dispatch) was added to all four files with the same boilerplate shape too, compounding the duplication. A shared `<StepFeedback editMode error saveError saveSuccessVisible />` component would reduce the maintenance surface for both concerns.
**Fix:** Extract a shared feedback component; out of scope for this phase's correctness review but worth flagging for the next refactor pass.

### IN-03: `StepYhteystiedot`'s dispatched preview field is named `website` while the persisted/save payload field is `varauslinkki`

**File:** `app/business/onboarding/StepYhteystiedot.tsx:50-52, 79-89`
**Issue:** The live-preview dispatch payload uses `{ puhelin, email, website, kuvaus }` (matching `OnboardingDraft.yhteystiedot.website`, which `buildDraftAsPaikka` reads as `draft.yhteystiedot?.website` for the `varauslinkki` field), while `handleSave`'s actual persistence payload renames it to `varauslinkki` for the `update-paikka` API. This is consistent and correct (verified against `lib/onboardingUtils.ts:105`), but the two different field names for the same logical value, used a few lines apart in the same file, is a readability trap for future edits — a future engineer renaming one without checking the other could silently desync the live preview from the persisted value.
**Fix:** No functional change needed; consider a code comment at the dispatch site noting the field is persisted server-side as `varauslinkki`.

---

_Reviewed: 2026-06-18T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
