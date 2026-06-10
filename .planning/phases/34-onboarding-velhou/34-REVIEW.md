---
phase: 34-onboarding-velhou
reviewed: 2026-06-10T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - app/business/onboarding/OnboardingWizardInner.tsx
  - app/business/onboarding/StepEsikatselu.tsx
  - app/business/onboarding/StepYhteystiedot.tsx
  - app/business/onboarding/StepHinnasto.tsx
  - app/business/onboarding/StepAukioloajat.tsx
  - app/business/onboarding/UploadDropZone.tsx
  - app/business/onboarding/StepMediat.tsx
findings:
  critical: 2
  warning: 5
  info: 4
  total: 11
status: issues_found
---

# Phase 34 (Plan 34-11 Gap-Closure): Code Review Report

**Reviewed:** 2026-06-10
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Review of the 7 onboarding wizard files changed in plan 34-11 (UAT gap-closure). The four targeted UAT fixes are present and mechanically correct: the `paikka_id` draft fallback and 8-second spinner timeout in `StepEsikatselu` resolves the infinite spinner, the ICU interpolation (`t('contactDescCount', { n: descCount })`) fixes the raw translation key display, `initialValues` props in steps 3–5 restore back-navigation data, and `onRemove` with thumbnails outside the clickable zone fixes the thumbnail UX. The API routes (`save-step`, `submit`) reviewed in the previous pass have their ownership and validation fixes already in place.

Two blockers were found in the gap-closure changes: the submit button in `StepEsikatselu` is not gated when preview data failed to load (a user can submit an incomplete draft through the timeout error state), and `setUploadProgress(0)` is missing from the auth-failure early-return path in `StepMediat`, leaving the progress bar stuck at 10% after an auth error. Five warnings cover inconsistent session-null handling, unguarded "Prev" navigation during saves, a React key collision on duplicate filenames, a misleading `maxFiles` contract in `UploadDropZone`, and back-populated pricing rows losing their `isFixed` status. Four info items cover hardcoded Finnish strings that will break the English locale.

---

## Critical Issues

### CR-01: Submit button active when preview data failed to load

**File:** `app/business/onboarding/StepEsikatselu.tsx:153`

**Issue:** The "Lähetä hyväksyttäväksi" button is rendered and enabled even when `loadTimedOut` is `true` and `draftAsPaikka` is `null` (lines 88–91 show the timeout error UI, but lines 142–162 render the footer unconditionally). A user who hits the 8-second timeout — meaning `draft` or `paikkaInfo` could not be assembled into a preview — can still click Submit and fire the API call. The `submit` route will process whatever partial data exists in the draft, potentially committing an incomplete venue profile (missing pricing, hours, or contact data) to `liikuntapaikat`. The preview step exists precisely to block submission until the user can verify the assembled data.

**Fix:**

```tsx
<motion.button
  type="button"
  onClick={handleSubmit}
  // Gate on draftAsPaikka: prevents submitting when preview data could not be assembled
  disabled={loading || !draftAsPaikka}
  whileTap={{ scale: 0.95 }}
  className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 px-6 [transition:background-color_150ms_var(--ease-out)] disabled:opacity-60 disabled:pointer-events-none"
>
  {loading ? t('submitting') : t('submitCta')}
</motion.button>
```

---

### CR-02: `setUploadProgress(0)` missing on auth-failure path in StepMediat

**File:** `app/business/onboarding/StepMediat.tsx:63–66`

**Issue:** When `getSession()` returns no session, the code calls `setError(t('errorUploadFailed'))` and `return`s from within the `try` block (line 65). The `finally` block at line 151 executes correctly and calls `setIsUploading(false)`. However, `setUploadProgress(0)` is present on every other error-return path (lines 88–90, 113–115, 142–144) but is absent on the auth-failure path. When a session-expired user clicks "Next", the progress bar advances to 10% (set on line 52), then stays at 10% after the error is shown, because the auth path never resets it. All other error paths reset the progress bar to 0; this one does not.

**Fix:**

```tsx
if (!session) {
  setError(t('errorUploadFailed'))
  setUploadProgress(0)   // matches all other error paths
  return
}
```

---

## Warnings

### WR-01: StepHinnasto and StepAukioloajat make API calls with empty token when session is null

**File:** `app/business/onboarding/StepHinnasto.tsx:82–89`, `app/business/onboarding/StepAukioloajat.tsx:108–116`

**Issue:** Both steps use `session?.access_token ?? ''` and proceed to call `/api/business/onboarding/save-step` regardless of whether `session` is `null`. This fires a full `fetch()` round-trip with an empty `Bearer ` token that the server rejects with 401, at which point the generic error is shown. The error UX is the same as a proper early return, but unnecessary latency is added. By contrast, `StepYhteystiedot` (line 49–53) and `StepEsikatselu` (lines 48–55) both early-return with an error message when session is null before making any network call.

**Fix:** Add a session null-guard before the fetch in both steps, matching the pattern in `StepYhteystiedot`:

```tsx
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
  setError(t('errorGeneric'))
  return
}
const token = session.access_token
```

---

### WR-02: "Prev" button not disabled during save in StepHinnasto and StepAukioloajat

**File:** `app/business/onboarding/StepHinnasto.tsx:205–211`, `app/business/onboarding/StepAukioloajat.tsx:238–244`

**Issue:** In both steps the "Edellinen" (prev) button lacks `disabled={loading}`. If the user clicks it while the save API call is in flight, the router navigates away mid-request. The `finally` block fires `setLoading(false)` on an unmounted component, producing a React warning in development. More concretely, the save result is indeterminate: if the upsert succeeds after navigation, `current_step` in the draft DB row advances to step 3 or 4 while the user is now back at step 2 or 3, causing progress bar state to diverge from URL state on subsequent loads. `StepYhteystiedot` and `StepEsikatselu` correctly disable their Prev buttons during loading.

**Fix:** Add `disabled={loading}` to the Prev button in both files:

```tsx
<button
  type="button"
  onClick={onPrev}
  disabled={loading}
  className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)] flex items-center gap-1 disabled:opacity-60"
>
```

---

### WR-03: React key collision when two files share the same filename in UploadDropZone

**File:** `app/business/onboarding/UploadDropZone.tsx:120`

**Issue:** Thumbnail items use `key={file.name}`. A user can select two images from different directories with the same filename (e.g., `photo.jpg` from two separate imports). React sees duplicate keys, silently skips rendering one thumbnail, and the remove buttons target indexes that no longer correspond to the visual positions. `StepMediat.removePhotoFile` uses index-based removal (`prev.filter((_, idx) => idx !== i)`), which is correct; the fault is only in the unstable key.

**Fix:** Use the array index as key. This is safe because the list is append-only (new files are added at the end, removed by index without sorting):

```tsx
{selectedFiles.map((file, index) => (
  <div key={index} className="relative">
```

---

### WR-04: UploadDropZone `maxFiles` slices the incoming batch, not the combined total

**File:** `app/business/onboarding/UploadDropZone.tsx:45–48`

**Issue:** `validateAndSelect` slices `valid.slice(0, maxFiles)`, where `maxFiles` is the absolute ceiling, not the remaining capacity (`maxFiles - selectedFiles.length`). If 3 photos are already selected and the user drops 5 new files with `maxFiles=5`, the drop zone passes all 5 to `onFilesSelected`. `StepMediat.handlePhotoFilesSelected` applies the combined cap correctly in this case, but the component's own contract is wrong: any other caller of `UploadDropZone` that relies on `onFilesSelected` receiving at most `maxFiles` items will exceed the limit silently.

**Fix:** Calculate remaining capacity inside `validateAndSelect`:

```tsx
function validateAndSelect(rawFiles: File[]) {
  const maxBytes = maxFileSizeMB * 1024 * 1024
  const valid = rawFiles.filter(
    (f) => f.type.startsWith('image/') && f.size <= maxBytes
  )
  if (maxFiles !== undefined) {
    const remaining = Math.max(0, maxFiles - selectedFiles.length)
    onFilesSelected(valid.slice(0, remaining))
  } else {
    onFilesSelected(valid)
  }
}
```

---

### WR-05: Back-populated pricing rows lose `isFixed` — all rows become deletable after back-navigation

**File:** `app/business/onboarding/StepHinnasto.tsx:38–45`

**Issue:** When `initialHinnasto` is provided (back-navigation from step 4), every restored row is created with `isFixed: false` (line 44). The four standard category rows (Kertakäynti, Kuukausijäsenyys, 10-kerran kortti, Vuosijäsenyys) are normally non-deletable (`isFixed: true`, lines 48–52) to anchor the pricing structure. After a round-trip through step 4 and back to step 3, all four default rows show delete buttons and the user can remove them — breaking the expected non-deletable-defaults UX that the pricing step is designed around.

**Fix:** Re-identify standard categories when restoring from draft:

```tsx
const FIXED_CATEGORY_KEYS = [
  'pricingCategoryDrop',
  'pricingCategoryMonthly',
  'pricingCategory10x',
  'pricingCategoryAnnual',
] as const

const fixedLabels = new Set(FIXED_CATEGORY_KEYS.map(k => t(k)))

if (initialHinnasto && initialHinnasto.length > 0) {
  return initialHinnasto.map((row, i) => ({
    id: `saved-${i}`,
    kategoria: row.kategoria,
    hinta: row.hinta,
    lisatieto: row.lisatieto ?? '',
    isFixed: fixedLabels.has(row.kategoria),
  }))
}
```

---

## Info

### IN-01: Hardcoded Finnish timeout error in StepEsikatselu not covered by i18n

**File:** `app/business/onboarding/StepEsikatselu.tsx:90`

**Issue:** `"Esikatselu ei latautunut. Palaa takaisin ja yritä uudelleen."` is hardcoded Finnish with no translation key. The project has an active English locale (`messages/en.json`). This is the string introduced by the plan 34-11 spinner timeout fix.

**Fix:** Add `previewLoadFailed` to both `messages/fi.json` and `messages/en.json`, then use `{t('previewLoadFailed')}`.

---

### IN-02: Two hardcoded Finnish strings in UploadDropZone not routed through i18n

**File:** `app/business/onboarding/UploadDropZone.tsx:107`, `app/business/onboarding/UploadDropZone.tsx:133`

**Issue:** The drag-active hint `"Pudota tiedosto tähän"` (line 107) and remove-button aria-label `"Poista kuva"` (line 133) are hardcoded Finnish. `messages/en.json` already contains `dropActiveHint: "Drop file here"` but it is not used. English users will see untranslated strings.

**Fix:**

```tsx
// Line 107 — use the existing i18n key:
{isDragging ? t('dropActiveHint') : label}

// Line 133 — add removeFileLabel to both message files:
aria-label={t('removeFileLabel')}
```

---

### IN-03: Hardcoded Finnish "Kategoria" table header in StepHinnasto

**File:** `app/business/onboarding/StepHinnasto.tsx:122`

**Issue:** `<th className="text-left pb-2">Kategoria</th>` is hardcoded while the two adjacent headers use `t('pricingHeaderPrice')` and `t('pricingHeaderNotes')`. Inconsistent localisation within the same `<tr>`.

**Fix:** Add `pricingHeaderCategory: "Kategoria"` / `"Category"` to both message files, then use `{t('pricingHeaderCategory')}`.

---

### IN-04: Screen-reader time input labels hardcoded Finnish in StepAukioloajat

**File:** `app/business/onboarding/StepAukioloajat.tsx:189`, `app/business/onboarding/StepAukioloajat.tsx:200`

**Issue:** `sr-only` labels `"Aloitusaika"` (start time) and `"Lopetusaika"` (end time) are hardcoded Finnish. Screen reader users on the English locale will hear Finnish labels.

**Fix:** Add `hoursOpenLabel` / `hoursCloseLabel` keys to both message files and use `t('hoursOpenLabel')` / `t('hoursCloseLabel')`.

---

_Reviewed: 2026-06-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
