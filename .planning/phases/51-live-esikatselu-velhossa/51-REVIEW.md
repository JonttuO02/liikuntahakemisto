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
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 51: Code Review Report

**Reviewed:** 2026-06-18T00:00:00Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

This review supersedes the prior 51-REVIEW.md pass (CR-01 blob URL staleness, now fixed by gap-closure plan 51-05). The current state of all 5 plans' files was reviewed fresh: the live-preview context/reducer, the debounce hook, the four step components' wiring into it, the wizard shell (`WizardInner.tsx`), and the toggle/pane presentation components.

The architecture is sound — pure reducer derivation with no network calls in the preview path, consistent `buildDraftAsPaikka`/`buildBrandingPreview` reuse, and the previously-identified blob-URL staleness bug (CR-01) appears correctly addressed by the unmount-time fallback effect in `StepMediat.tsx`. However, that same fallback effect has a subtler staleness bug of its own (see WR-01) — it captures `existingLogoUrl`/`existingPhotoUrls` at mount time via an empty-dependency-array cleanup, so if the user saves new media and *then* navigates away in edit mode, the unmount cleanup re-broadcasts the stale pre-save URLs instead of the just-saved ones, momentarily reverting the live preview.

No critical security or data-loss issues were found. The remaining findings are robustness/consistency gaps that should be fixed but do not block shipping.

## Warnings

### WR-01: Unmount fallback in StepMediat re-broadcasts stale media URLs after a save

**File:** `app/business/onboarding/StepMediat.tsx:99-110`
**Issue:** The unmount cleanup effect that's meant to prevent a dead blob: URL from lingering in the shared preview is registered with an empty dependency array:
```tsx
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
Because the effect only runs once (on mount), its cleanup closure captures `existingLogoUrl`/`existingPhotoUrls` as they were **at mount time** — not their latest values. In edit mode, if the user uploads a new logo/photo and clicks "Tallenna" (`handleSave` calls `setExistingLogoUrl(finalLogoUrl)` / `setExistingPhotoUrls(finalPhotoUrls)`), then switches to a different tab (unmounting `StepMediat`), the cleanup fires with the **original, pre-save** URLs, not the freshly-saved ones. This momentarily (or permanently, until another field re-dispatches) reverts the live preview's media to stale data, undermining the very gap-closure fix (CR-01) this effect was added for.
**Fix:** Use a ref to track the latest values so the cleanup closure always sees current data:
```tsx
const latestMediaRef = useRef({ logo: existingLogoUrl, photos: existingPhotoUrls })
useEffect(() => {
  latestMediaRef.current = { logo: existingLogoUrl, photos: existingPhotoUrls }
}, [existingLogoUrl, existingPhotoUrls])

useEffect(() => {
  return () => {
    dispatch({
      type: 'SET_MEDIA',
      payload: {
        logo: latestMediaRef.current.logo ?? null,
        photos: latestMediaRef.current.photos,
      },
    })
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

### WR-02: StepHinnasto inputs and row controls are not disabled during save/loading

**File:** `app/business/onboarding/StepHinnasto.tsx:253-291`
**Issue:** Unlike `StepYhteystiedot` (whose `<input>`/`<textarea>` elements are `disabled={loading}`), none of `StepHinnasto`'s table inputs (`kategoria`, `hinta`, `lisatieto`) or the add-row/remove-row buttons are disabled while `saving` or `loading` is true. A user can add/remove/edit pricing rows while a save request is in flight, which can produce a race between the in-flight request's snapshot of `rows` and the user's subsequent edits, and is inconsistent with the rest of the wizard's pattern of disabling inputs during async operations.
**Fix:** Gate the table inputs and row buttons on `saving || loading` (mirroring `StepYhteystiedot`'s `disabled={loading}` pattern), e.g. `disabled={saving || loading}` on each `<input>` and on `addPriceRow`/`removeRow` buttons.

### WR-03: StepHinnasto's editMode save-success banner uses a different idiom than the other two save-success banners

**File:** `app/business/onboarding/StepHinnasto.tsx:305-319`
**Issue:** The save-success banner condition is written as `(editMode ? saveSuccessVisible : false)`, which is functionally fine, but it's the only one of the four step components written with this ternary-wrapping-a-boolean idiom instead of the simpler `editMode && saveSuccessVisible` used by `StepAukioloajat` (line 300) and `StepYhteystiedot` (line 219). This is a stylistic inconsistency that increases the chance of a future edit introducing a logic error (e.g. someone "simplifying" it to `saveSuccessVisible` without checking `editMode`, since the false branch is already implicit elsewhere).
**Fix:** Align with the other two components: `{editMode && saveSuccessVisible && ( ... )}`.

## Info

### IN-01: RESET action defined and handled but never dispatched

**File:** `lib/livePreview/LivePreviewContext.tsx:55,82-83`
**Issue:** `LivePreviewAction` includes a `RESET` variant and `livePreviewReducer` handles it, but no component in the reviewed file set (or elsewhere in `app/business`) ever dispatches `{ type: 'RESET', ... }`. This is dead code — either unused scaffolding for a future use case or a sign that an intended reset-on-paikka-change behavior was never wired up.
**Fix:** Either remove the `RESET` action/case until it has a caller, or wire it up where it's needed (e.g. when `paikkaId` changes in `OnboardingMode`/`EditMode`) and document why.

### IN-02: `removeLogoFile` ignores its parameter via blanket eslint-disable

**File:** `app/business/onboarding/StepMediat.tsx:125-128`
**Issue:**
```tsx
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function removeLogoFile(_i: number) {
  setLogoFiles([])
}
```
The function signature accepts an index parameter (to match `UploadDropZone`'s `onRemove` contract) but never uses it, papering over the mismatch with a suppression comment rather than a type that reflects the real contract (a no-arg reset). This is fine functionally (there's only ever one logo file) but the suppressed lint hides intent — a future change to support removing a specific logo slot could silently do the wrong thing.
**Fix:** Either type `onRemove` as accepting no arguments where used for single-file zones, or keep the parameter but assert there is at most one file (e.g. only clear if `_i === 0`) to make the no-op explicit instead of unconditional.

### IN-03: EN_TO_FI mapping duplicates FI_TO_EN from onboardingUtils without reuse

**File:** `app/business/onboarding/StepAukioloajat.tsx:12-20`
**Issue:** `StepAukioloajat` defines its own `EN_TO_FI` display map, while `lib/onboardingUtils.ts` already exports a `FI_TO_EN` map for the inverse direction. The two maps must be kept in sync by hand (same 7 day keys, inverted) — there's no shared source of truth enforcing that. This isn't currently broken, but it's a latent consistency risk: if a day key is ever added/renamed in one map, the other won't be type-checked against it.
**Fix:** Derive `EN_TO_FI` from `FI_TO_EN` programmatically (e.g. `Object.fromEntries(Object.entries(FI_TO_EN).map(([fi, en]) => [en, fi]))`) in a shared location, or move both maps into `lib/onboardingUtils.ts` next to `ORDERED_DAYS`.

---

_Reviewed: 2026-06-18T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
