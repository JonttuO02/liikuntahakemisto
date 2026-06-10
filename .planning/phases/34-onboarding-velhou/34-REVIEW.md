---
phase: 34-onboarding-velhou
reviewed: 2026-06-10T00:00:00Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - app/api/business/onboarding/save-step/route.ts
  - app/api/business/onboarding/submit/route.ts
  - app/business/onboarding/OnboardingWizardInner.tsx
  - app/business/onboarding/page.tsx
  - app/business/onboarding/ProgressBar.tsx
  - app/business/onboarding/StepAukioloajat.tsx
  - app/business/onboarding/StepEsikatselu.tsx
  - app/business/onboarding/StepHinnasto.tsx
  - app/business/onboarding/StepMediat.tsx
  - app/business/onboarding/StepPaikka.tsx
  - app/business/onboarding/StepYhteystiedot.tsx
  - app/business/onboarding/UploadDropZone.tsx
  - app/business/onboarding/UploadProgressBar.tsx
  - app/business/page.tsx
  - app/components/ClaimSearchForm.tsx
  - lib/onboardingUtils.test.ts
  - lib/onboardingUtils.ts
  - messages/en.json
  - messages/fi.json
  - supabase/migrations/20260606000000_onboarding.sql
  - vitest.config.ts
findings:
  critical: 5
  warning: 6
  info: 4
  total: 15
status: issues_found
---

# Phase 34: Code Review Report

**Reviewed:** 2026-06-10T00:00:00Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

This phase implements the business onboarding wizard: a six-step flow covering venue selection, media upload, pricing, hours, contact details, and a preview/submit step. The API surface is reasonably locked down — JWT is extracted from the `Authorization` header and verified against `supabaseAdmin`, `business_account_id` is never read from the body, and the submit route does an explicit ownership check against `business_paikka_links`. Those structural decisions are correct.

However, five blockers exist: the `save-step` route accepts arbitrary `paikka_id` values from the request body without verifying that the authenticated user actually owns that venue, the file upload path is built from a client-supplied `businessAccountId` prop that the wizard never resolves (the step is dead in the current wizard), `URL.createObjectURL` leaks object URLs on every render, the `submit` route's draft query uses `.single()` which throws a 406 when no draft row exists rather than returning a clean 404, and `StepMediat` is wired as `{step === 2 && null}` so uploads never run while the save-step route and DB schema still accept `media_urls`.

Six warnings cover: unvalidated time-string values stored verbatim in JSONB, unbounded `hinnasto` array size accepted by the API, missing `setLoading(false)` in the early-return path of `StepMediat`, a race between the `loadDraft` effect and the `completedSteps` derivation, the `paikka_id` URL param being accepted from anonymous/unauthenticated visitors without sanitising NaN, and the `business_accounts` ownership check in `submit` querying by `user_id` while the UPSERT in `save-step` ties the draft to `business_account_id` — correct only because they are the same column, but no comment or test confirms this invariant.

---

## Critical Issues

### CR-01: save-step does not verify the authenticated user owns the paikka_id

**File:** `app/api/business/onboarding/save-step/route.ts:61-72`
**Issue:** The route parses `paikka_id` from the request body (line 29) and UPSERTs directly with that value. There is no check against `business_paikka_links` to confirm `user.id` is the owner of that venue. Any authenticated business user can overwrite the draft of any other venue they do not own by supplying an arbitrary `paikka_id`. The `submit` route does perform this ownership check, but by that point the attacker's draft already contains malicious data.

The `submit` route's ownership check on line 32–40 is not sufficient mitigation: the draft `paikka_id` was already set in the UPSERT conflict key, so the attacker first calls `save-step` with a victim's `paikka_id` which creates or merges a draft row keyed to `(attacker_uid, victim_paikka_id)`. That draft is then blocked by the `business_paikka_links` check in `submit` — but the attacker has still polluted a draft row linked to a venue they don't own.

**Fix:**
```typescript
// After parsing paikkaId, verify ownership before accepting data
const { data: link } = await supabaseAdmin
  .from('business_paikka_links')
  .select('id')
  .eq('business_account_id', user.id)
  .eq('paikka_id', paikkaId)
  .maybeSingle()

if (!link) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

---

### CR-02: StepMediat uses client-supplied businessAccountId as Storage path prefix

**File:** `app/business/onboarding/StepMediat.tsx:62,88`
**Issue:** The storage path is constructed as:
```ts
const path = `${businessAccountId}/${paikkaId}/logo/${filename}`
```
`businessAccountId` is a prop passed from the parent. In `OnboardingWizardInner.tsx` step 2 is rendered as `{step === 2 && null}` — `StepMediat` is never mounted. But the component's interface accepts `businessAccountId: string` from the caller without ever validating that it matches the session user. If this prop were ever passed from a future caller with an incorrect or attacker-controlled value, files would be uploaded under another account's path.

More critically: the session token used for the storage upload is fetched on line 52-54 as `supabase.auth.getSession()` but the upload is done with `supabase.storage` (anon key client), not with `supabaseAdmin`. The storage bucket `business-media` must allow the anon/authenticated client to write — if its RLS is path-scoped to `auth.uid()`, the path prefix must match `user.id`, not an arbitrary prop. Using `businessAccountId` from a prop instead of `session.user.id` breaks this constraint.

**Fix:** Derive the path prefix from the session inside the component, not from a prop:
```typescript
const { data: { session } } = await supabase.auth.getSession()
if (!session) { setError(t('errorUploadFailed')); return }
const path = `${session.user.id}/${paikkaId}/logo/${filename}`
```
Remove `businessAccountId` from the `StepMediatProps` interface entirely.

---

### CR-03: submit route uses .single() on draft fetch — throws 406 when no draft exists

**File:** `app/api/business/onboarding/submit/route.ts:20-28`
**Issue:** The query on line 20–24 uses `.single()`. Supabase/PostgREST returns a 406 error object (not null data) when `.single()` finds zero rows. The existing guard `if (draftError || !draft)` on line 26 does catch this, but the error response returns a generic 404 rather than the actual PostgREST error code. More importantly, a user who navigates directly to the submit endpoint without any draft will receive a misleading 404 response and the server logs `PGRST116` noise. The correct pattern for "fetch or null" is `.maybeSingle()`.

**Fix:**
```typescript
const { data: draft, error: draftError } = await supabaseAdmin
  .from('onboarding_draft')
  .select('*, liikuntapaikat(nimi, osoite, kaupunki, laji, latitude, longitude, aukioloajat)')
  .eq('business_account_id', user.id)
  .maybeSingle()  // returns null when no row, not an error
```

---

### CR-04: URL.createObjectURL called in render without cleanup — object URL leak

**File:** `app/business/onboarding/UploadDropZone.tsx:106`
**Issue:** `URL.createObjectURL(file)` is called directly inside the JSX render function on every render cycle. Each call allocates a new Blob URL. There is no corresponding `URL.revokeObjectURL` anywhere in the codebase. With up to 5 photo files, each re-render of the component (e.g., from parent state changes) creates 5 new uncollected Blob URLs. These persist for the lifetime of the document.

**Fix:** Use a `useMemo` or `useEffect` with cleanup to create/revoke object URLs:
```typescript
// At top of component, replace the inline createObjectURL call:
const previewUrls = useMemo(() => {
  return selectedFiles.map(f => URL.createObjectURL(f))
}, [selectedFiles])

useEffect(() => {
  return () => { previewUrls.forEach(url => URL.revokeObjectURL(url)) }
}, [previewUrls])

// In JSX:
src={previewUrls[index]}
```

---

### CR-05: StepMediat is permanently dead code — step 2 renders null, media never saved

**File:** `app/business/onboarding/OnboardingWizardInner.tsx:148`
**Issue:** Line 148 reads:
```tsx
{/* Step 2 implemented in Plan 07 */}
{step === 2 && null}
```
`StepMediat` is imported at line 13 but never rendered. The wizard advances from step 1 to step 3 with no media collection. When the user reaches `StepEsikatselu`, `draft.media_urls` is always null, so `image_url` in the preview is always null, and the submitted `liikuntapaikat.image_url` is always null. The `ALLOWED_FIELDS` list in `save-step` includes `media_urls` but it can never be set through the wizard.

This is not a "TODO" — `StepMediat` exists with full implementation and the migration includes the `media_urls` column. The wizard component simply never mounts the step. This is a functional regression: the advertised media upload feature does not work.

**Fix:** Replace `{step === 2 && null}` with the actual `StepMediat` invocation, passing the resolved user ID and paikka ID:
```tsx
{step === 2 && paikkaId !== null && userId !== null && (
  <StepMediat
    paikkaId={paikkaId}
    businessAccountId={userId}  // from supabase.auth.getSession()
    onNext={() => saveAndAdvance(2)}
    onPrev={() => goToStep(1)}
  />
)}
```
Note: after fixing CR-02, `businessAccountId` prop should be removed and `StepMediat` should derive the ID from its own session call.

---

## Warnings

### WR-01: Time string values from StepAukioloajat are stored verbatim with no server-side validation

**File:** `app/api/business/onboarding/save-step/route.ts:52-53`
**Issue:** The `value` field for `aukioloajat` is accepted as-is (`value = body.value`, line 53) without any server-side schema check. An attacker can POST `{"aukioloajat": {"monday": {"open": "<script>", "close": "../../etc"}}}`. The comment on line 51-52 says "Supabase enforces 8KB row limit (T-34-05-04 accepted)" but this only limits size, not content. The JSONB is later read and displayed in `StepEsikatselu` via `draftAsPaikka.aukioloajat` and eventually written to `liikuntapaikat.aukioloajat`. Values are rendered via React (which auto-escapes) so XSS is not the primary concern, but the shape contract is entirely unenforced on the server.

**Fix:** Add a server-side validator for the `aukioloajat` shape:
```typescript
function isValidAukioloajat(v: unknown): boolean {
  const VALID_DAYS = new Set(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'])
  const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
  for (const [k, slot] of Object.entries(v as Record<string, unknown>)) {
    if (!VALID_DAYS.has(k)) return false
    if (typeof slot !== 'object' || slot === null) return false
    const { open, close } = slot as Record<string, unknown>
    if (!TIME_RE.test(String(open)) || !TIME_RE.test(String(close))) return false
  }
  return true
}
```

---

### WR-02: Unbounded hinnasto array — no limit on the number of price rows

**File:** `app/api/business/onboarding/save-step/route.ts:52-53`
**Issue:** The `hinnasto` JSONB value is accepted with no count or per-field length constraints. A client can POST an array with thousands of pricing rows. The comment on line 51 defers to "Supabase 8KB row limit" but that limit applies to the entire row including all columns. A large `hinnasto` array can fill the 8KB budget and prevent other columns from being updated, effectively DoS-ing the draft for that user. Beyond DoS, `hinnastaToHintaKuvaus` in the submit route joins all rows with `\n`, so a 100-row `hinnasto` would produce a very long `hinta_kuvaus` string that may exceed the `liikuntapaikat.hinta_kuvaus` column capacity.

**Fix:** Enforce a max row count and per-field max length in the route before upserting:
```typescript
if (field === 'hinnasto') {
  const rows = value as unknown[]
  if (!Array.isArray(rows) || rows.length > 20) {
    return NextResponse.json({ error: 'hinnasto: max 20 rows' }, { status: 400 })
  }
}
```

---

### WR-03: StepMediat handleNext does not call setLoading(false) on early-return error paths

**File:** `app/business/onboarding/StepMediat.tsx:71-77, 97-103`
**Issue:** When `uploadErr` is truthy inside the logo (line 71-76) or photo loop (line 97-101), the function sets the error and returns early with a plain `return` statement. `setIsUploading(true)` was called at line 45 but `setIsUploading(false)` is only in the `finally` block on line 136. Early `return` inside a `try` block does reach the `finally` block — so `setIsUploading(false)` is called correctly. However, `setUploadProgress(0)` is called inside the early-return block (line 73, 99) and `setIsUploading(false)` runs in `finally`, leaving a window where progress is 0 but `isUploading` is still `true` between those two state updates. The button remains disabled with "Uploading..." text until the second state update. This is not a crash but produces a momentarily broken UI state.

More materially: `setLoading` is never declared in `StepMediat` — the component uses `isUploading`, not `loading`. But the `onPrev` button has no `disabled={isUploading}` guard (line 198-204), so the user can navigate away during an active upload, abandoning partially uploaded files in storage with no matching draft entry.

**Fix:** Disable the prev button during upload:
```tsx
<motion.button
  type="button"
  whileTap={{ scale: 0.95 }}
  onClick={onPrev}
  disabled={isUploading}  // add this
  className="..."
>
```

---

### WR-04: loadDraft effect in OnboardingWizardInner navigates to step if user is already past step 1, but completedSteps derivation reads stale draft state

**File:** `app/business/onboarding/OnboardingWizardInner.tsx:44-46, 86-88`
**Issue:** On line 86-88, when an existing draft is found with `current_step > 1` and the URL is at `step=1`, `goToStep(existingDraft.current_step)` is called. This push happens before `setDraft(existingDraft)` has caused a re-render. The `completedSteps` derivation on line 44 reads from `draft` state, which is still `null` during the initial render. So when the router navigates to the saved step, the ProgressBar renders with `completedSteps = []` on the first frame (zero visual steps completed). This resolves on the next render cycle once React processes the `setDraft` call, but it produces a flash of incorrect progress bar state.

The `goToStep` call on line 88 is also inside the `loadDraft` async effect, which is not in the effect dependency array (line 107: `// eslint-disable-next-line react-hooks/exhaustive-deps`). If `searchParams` changes between mount and when `loadDraft` resolves (which it can if the router push from line 88 itself triggers a re-render), the closure captures stale `step`.

**Fix:** Call `setDraft` before `goToStep` and derive `completedSteps` from `existingDraft` directly on the navigation branch, or accept the flash as a cosmetic artifact. The suppressed eslint warning should be documented:
```typescript
if (existingDraft) {
  setDraft(existingDraft as OnboardingDraft)
  if (existingDraft.current_step && existingDraft.current_step > 1 && step === 1) {
    goToStep(existingDraft.current_step)
  }
}
```
(This is the existing order — it is correct. The real fix is to not suppress the exhaustive-deps warning without justification.)

---

### WR-05: business/page.tsx — redirect to onboarding triggered for accounts without a business_account row

**File:** `app/business/page.tsx:22-30`
**Issue:** The `checkLinks` function on line 22 queries `business_accounts` for `onboarding_completed`. If the user is authenticated but has no row in `business_accounts` (e.g., a regular consumer account visiting `/business`), `account` is `null`. The condition on line 28 is `if (account && !account.onboarding_completed)` — when `account` is `null`, this block is skipped. Execution falls through to the `business_paikka_links` query. If `links` is also empty (expected for a non-business user), `hasLinks` stays `false` and the page renders the `ClaimSearchForm`. A consumer user arriving at `/business` directly sees the venue claim UI with no authentication gate. This may be intentional, but there is no guard that ensures the user is a registered business account before allowing them to claim or create a venue. The downstream `claim-paikka` API enforces auth, but the UI silently presents the form.

**Fix:** Add an explicit check: if `account` is null, redirect to a business registration page or show an appropriate "not a business account" message rather than the claim form.

---

### WR-06: StepYhteystiedot — website field accepts any string, stored as varauslinkki with no URL validation

**File:** `app/business/onboarding/StepYhteystiedot.tsx:108-115`
**Issue:** The `website` input uses `type="url"` which provides browser-level validation, but this constraint is entirely client-side. The route handler (`save-step`) stores the value verbatim. In `submit/route.ts` line 59, this is written directly to `liikuntapaikat.varauslinkki`:
```typescript
varauslinkki: draft.yhteystiedot?.website?.trim() ?? null,
```
A user who bypasses the form can submit `javascript:alert(1)` or a relative path as `varauslinkki`. If downstream code renders this as an `<a href={varauslinkki}>`, it creates an XSS vector (open redirect / JS injection). Check for existing usage of `varauslinkki` in the codebase to confirm exposure.

**Fix:** Validate URL scheme server-side before writing to liikuntapaikat:
```typescript
const rawWebsite = draft.yhteystiedot?.website?.trim() ?? null
let varauslinkki: string | null = null
if (rawWebsite) {
  try {
    const u = new URL(rawWebsite)
    if (u.protocol === 'https:' || u.protocol === 'http:') {
      varauslinkki = rawWebsite
    }
  } catch { /* invalid URL — leave null */ }
}
```

---

## Info

### IN-01: Hardcoded Finnish strings in UploadDropZone and StepHinnasto bypass i18n

**File:** `app/business/onboarding/UploadDropZone.tsx:95`, `app/business/onboarding/StepHinnasto.tsx:110`, `app/business/onboarding/StepAukioloajat.tsx:186,197`
**Issue:** Three UI strings are hardcoded in Finnish and not routed through `next-intl`:
- `UploadDropZone.tsx:95` — `'Pudota tiedosto tähän'` (drag hint; the i18n key `dropActiveHint` exists in both `fi.json` and `en.json` but is not used)
- `StepHinnasto.tsx:110` — `'Kategoria'` (table header; not using `t()`)
- `StepAukioloajat.tsx:186,197` — `'Aloitusaika'` / `'Lopetusaika'` (sr-only labels)
- `app/components/ClaimSearchForm.tsx` line 270 — `'JO HALLITTU'` hardcoded (Finnish only; `resultAlreadyClaimed` key exists)

**Fix:** Replace each with the matching i18n key via `t('...')`.

---

### IN-02: StepMediat imported but never rendered — dead import

**File:** `app/business/onboarding/OnboardingWizardInner.tsx:13`
**Issue:** `import StepMediat from './StepMediat'` is present on line 13 but the component is never used (line 148 renders `null`). This is linked to CR-05 but warrants a separate note: the dead import means bundlers may not tree-shake the component, and it will appear in the module graph even though it contributes nothing.

**Fix:** Either mount the component (fixing CR-05) or remove the import until it is ready.

---

### IN-03: file.name used as React key in UploadDropZone — not unique if user selects same filename twice

**File:** `app/business/onboarding/UploadDropZone.tsx:102`
**Issue:** `key={file.name}` is used in the image preview list. If a user drops two files with the same name, React's reconciler will warn about duplicate keys and the DOM may not update correctly for the second file.

**Fix:** Use the index or a combination of name and size:
```tsx
key={`${file.name}-${file.size}`}
```

---

### IN-04: onboarding_draft RLS policies permit INSERT without business_paikka_links ownership check

**File:** `supabase/migrations/20260606000000_onboarding.sql:69-71`
**Issue:** The INSERT RLS policy (`Business inserts own draft`) only checks `auth.uid() = business_account_id`. An authenticated business user can insert a draft row for any `paikka_id`, including venues they have not claimed. This aligns with CR-01 at the DB level: the schema itself does not enforce the `business_paikka_links` ownership relationship. The defence-in-depth fix belongs both in the route handler (CR-01) and ideally in the RLS policy.

**Fix (advisory):** Add a `WITH CHECK` subquery to the INSERT policy:
```sql
CREATE POLICY "Business inserts own draft"
  ON onboarding_draft FOR INSERT
  WITH CHECK (
    auth.uid() = business_account_id
    AND EXISTS (
      SELECT 1 FROM business_paikka_links
      WHERE business_paikka_links.business_account_id = auth.uid()
        AND business_paikka_links.paikka_id = onboarding_draft.paikka_id
    )
  );
```

---

_Reviewed: 2026-06-10T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
