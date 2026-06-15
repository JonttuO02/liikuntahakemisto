---
phase: 46-pre-vaihe-ui-velhointegraatio
reviewed: 2026-06-15T22:31:15Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - app/business/onboarding/AnalysoiSivusto.tsx
  - app/business/onboarding/page.tsx
  - app/business/onboarding/StepEsikatselu.tsx
  - app/business/onboarding/StepHinnasto.tsx
  - app/business/onboarding/StepAukioloajat.tsx
  - app/business/onboarding/StepYhteystiedot.tsx
  - app/business/WizardInner.tsx
  - app/components/DiagonaalKortti.tsx
  - lib/branding/brandingResult.ts
findings:
  critical: 3
  warning: 4
  info: 3
  total: 10
status: issues_found
---

# Phase 46: Code Review Report

**Reviewed:** 2026-06-15T22:31:15Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

This phase integrates a branding analysis pre-step (AnalysoiSivusto) with the existing onboarding wizard (WizardInner) and a new DiagonaalKortti card format. The plumbing is broadly correct — state machine transitions, polling cleanup, and prop threading are sound. Three blockers were found: a hinta_kuvaus format split that guarantees broken price display in edit-mode saves, silent loss of email data in edit mode, and an unguarded NaN paikka_id that silently corrupts Supabase queries. Four warnings cover a missing effect dependency, an unguarded open-days empty submit, a production console.error leak, and a short-hex misparse in getContrastColor.

## Critical Issues

### CR-01: StepHinnasto edit-mode writes hinta_kuvaus in wrong format — price pills never parse

**File:** `app/business/onboarding/StepHinnasto.tsx:137-144`
**Issue:** `handleSave` (edit mode, called by `/api/business/update-paikka`) constructs `hinta_kuvaus` as:
```
"Kategoria: €12.50 (note); Toinen: €8.00"
```
`€` is placed *before* the price and rows are joined by `"; "`.

`hinnastaToHintaKuvaus` in `lib/onboardingUtils.ts:68-74` — used by the onboarding save-step path and by `buildDraftAsPaikka` — produces:
```
"Kategoria: 12.50€ (note)\nToinen: 8.00€"
```
`€` is placed *after* the price, rows are joined by `"\n"`.

`priceItemList` in `lib/priceUtils.ts:63-80` parses by `'\n'` first, then `', '`. A `"; "`-joined string is never split; all prices appear as a single unsplit pill. Any venue that saves pricing in edit mode will display malformed price pills across the entire listing surface (list card, DiagonaalKortti, profile sheet).

**Fix:**
```tsx
// StepHinnasto.tsx handleSave — replace lines 137-144
const hinta_kuvaus =
  hinnastaToHintaKuvaus(
    rows.filter(r => r.hinta.trim() !== '').map(({ kategoria, hinta, lisatieto }) => ({
      kategoria,
      hinta,
      lisatieto,
    }))
  ) || null
```
Import `hinnastaToHintaKuvaus` from `@/lib/onboardingUtils`. Remove the inline format string and `slice(0,200)` (the canonical function handles filtering; add a `.slice(0, 200)` call on the result if the DB column is length-constrained).

---

### CR-02: urlPaikkaId parsed without NaN guard — NaN leaks into Supabase queries

**File:** `app/business/WizardInner.tsx:71`
**Issue:** `parseInt(urlPaikkaId, 10)` is never checked for `NaN`. A crafted URL `?paikka_id=abc` yields `NaN`. Because `!NaN === true`, the code falls into the `business_paikka_links` fallback (line 74). If no link row exists, `resolvedPaikkaId` remains `NaN`. At line 113:
```ts
resolvedPaikkaId = resolvedPaikkaId ?? existingDraft?.paikka_id ?? null
```
`NaN ?? ...` evaluates to `NaN` (NaN is not null/undefined), so `setPaikkaId(NaN)` is called. Every subsequent `paikkaId !== null` guard is `true` but the value `NaN` is passed to Supabase `.eq('paikka_id', NaN)` — the SDK coerces this to the string `"NaN"`, producing no match, and the wizard shows an empty preview. In edit mode the URL segment is `paikkaId` (numeric route param), but any future refactor or URL sharing could expose this.

**Fix:**
```ts
// WizardInner.tsx line 71
const parsed = urlPaikkaId ? parseInt(urlPaikkaId, 10) : null
let resolvedPaikkaId: number | null = parsed !== null && !isNaN(parsed) ? parsed : null
```

---

### CR-03: StepYhteystiedot handleSave (edit mode) silently drops email from API payload

**File:** `app/business/onboarding/StepYhteystiedot.tsx:64-79`
**Issue:** `handleSave` (edit mode path, calls `/api/business/update-paikka`) sends:
```ts
data: {
  puhelin: puhelin.trim(),
  varauslinkki: website.trim(),
  kuvaus: kuvaus.trim(),
}
```
`email` is absent. `handleNext` (onboarding path, calls `/api/business/onboarding/save-step`, line 115–131) does include `email: email.trim()` in the draft value. The user fills in the email field, taps Save in edit mode, gets a success toast, but the email is never written to the server. `onSaveComplete` does propagate email to local state (line 86), so the UI is inconsistent with the database after the first save.

**Fix:**
```ts
// StepYhteystiedot.tsx handleSave — add email to the data payload
data: {
  puhelin: puhelin.trim(),
  email: email.trim(),      // add this line
  varauslinkki: website.trim(),
  kuvaus: kuvaus.trim(),
},
```
(Requires the `/api/business/update-paikka` handler for section `'yhteystiedot'` to also accept and write the `email` field — verify at the API layer.)

---

## Warnings

### WR-01: refreshDraftForPreview effect missing paikkaId dependency

**File:** `app/business/WizardInner.tsx:177-194`
**Issue:** The step-6 draft refresh effect captures `paikkaId` from the outer scope closure but does not list it in the dependency array (`[step]` only). If `paikkaId` is null when the user first navigates to step 6 (e.g., draft is loading asynchronously) and later becomes non-null, the effect will not re-run. The Supabase query will fall back to unfiltered `business_account_id` only, and may load the wrong draft for a multi-venue account.

**Fix:**
```ts
// WizardInner.tsx line 194 — update dependency array
}, [step, paikkaId])
```

---

### WR-02: StepAukioloajat allows advancing with zero open days — no validation gate

**File:** `app/business/onboarding/StepAukioloajat.tsx:158-196`
**Issue:** `handleNext` calls `buildOpenDaysObject()` which can return `{}` (all toggles off), then POSTs that empty object to `save-step`. There is no guard preventing the user from clicking Next when all days are closed. This allows the draft to be saved with an empty `aukioloajat`, so the preview and live listing show no hours at all. This is inconsistent with `StepHinnasto` which gates the Next button on `hasAnyPrice`.

Unlike StepHinnasto's `disabled` button for hours, the current footer button has `disabled={loading}` only (line 337).

**Fix:** Add a `hasAnyOpenDay` derived value and gate the Next button:
```tsx
const hasAnyOpenDay = ORDERED_DAYS.some(d => hours[d]?.isOpen)
// ...
<motion.button disabled={loading || !hasAnyOpenDay} ...>
```
Edit mode (`handleSave`) is exempt — saving zero open days is a valid "venue is closed" edit.

---

### WR-03: getContrastColor misparses 3-character hex codes

**File:** `lib/branding/brandingResult.ts:52-65`
**Issue:** `getContrastColor` assumes 6-character hex after stripping `#`. For a 3-char hex like `#fff`, `clean.substring(0, 2)` = `'ff'` (255), `clean.substring(2, 4)` = `'f'` (15), `clean.substring(4, 6)` = `''` → `parseInt('', 16)` = `NaN` → coerces to 0. Result: `yiq = (255*299 + 15*587 + 0*114) / 1000 = 84.9` → returns `'#ffffff'` (white-on-white). The branding analyzer may return short-form hex from some websites; when it does, `DiagonaalKortti` will use white text on a white or light panel.

**Fix:**
```ts
export function getContrastColor(hex: string): '#000000' | '#ffffff' {
  let clean = hex.replace(/^#/, '')
  // Expand 3-char shorthand to 6-char
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('')
  }
  const r = parseInt(clean.substring(0, 2), 16) || 0
  const g = parseInt(clean.substring(2, 4), 16) || 0
  const b = parseInt(clean.substring(4, 6), 16) || 0
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 128 ? '#000000' : '#ffffff'
}
```

---

### WR-04: console.error in StepEsikatselu leaks server error details in production

**File:** `app/business/onboarding/StepEsikatselu.tsx:79`
**Issue:**
```ts
try { console.error('[submit] server error:', await res.clone().json()) } catch {}
```
This prints the raw server error JSON to the browser console in production. Depending on what the API returns, this may expose internal identifiers, table names, or constraint violation messages. Debug logging should not ship to production.

**Fix:** Remove the line entirely, or gate it:
```ts
if (process.env.NODE_ENV !== 'production') {
  try { console.error('[submit] server error:', await res.clone().json()) } catch {}
}
```

---

## Info

### IN-01: Email field has no persistence in either mode at the liikuntapaikka level

**File:** `app/business/onboarding/StepYhteystiedot.tsx:39-40`, `app/business/WizardInner.tsx:311`
**Issue:** The `email` field is collected in the UI and saved into `onboarding_draft` (via `save-step` step 5), but `Liikuntapaikka` has no `email` column (see `lib/types.ts`). `EditMode` initializes `localYhteystiedot.email` as hardcoded `''` (WizardInner.tsx:311) because there is no source field. After CR-03 is fixed, `email` will be sent to `update-paikka` but the handler would need a destination column. Clarify whether email is intentionally draft-only or whether a DB migration is needed.

---

### IN-02: AnalysoiSivusto renders logo_url from arbitrary origin without domain restriction

**File:** `app/business/onboarding/AnalysoiSivusto.tsx:349-354`
**Issue:** The `<img src={brandingResult.logo_url}>` tag renders the URL returned by the analysis API without any origin allowlist. The `// eslint-disable-next-line @next/next/no-img-element` comment suppresses the Next.js Image lint rule that would enforce domain whitelisting. This is not an XSS vector (src does not execute script), but it does allow the branding analysis API to cause the onboarding UI to display images from any domain. If the server-side analyzer is ever compromised, arbitrary images can be displayed in the onboarding flow.

**Fix:** Either validate the logo URL domain server-side before returning it, or add a `next.config.js` image domain allowlist and switch to `<Image>` (if dimensions are known).

---

### IN-03: Polling effect and mount effect use redundant dual-tracking (mountedRef + cancelled)

**File:** `app/business/onboarding/AnalysoiSivusto.tsx:96-207`
**Issue:** Two parallel guards track component mount state: a closure-local `cancelled` variable in the initial check effect and `mountedRef.current` shared with the polling effect. The polling effect only uses `mountedRef`. `mountedRef` is set to `false` in the first effect's cleanup, which is correct. However, if a future developer adds a reset to the polling effect cleanup they may inadvertently leave `mountedRef` in an inconsistent state. The `cancelled` variable inside the first effect is redundant with `mountedRef` for that effect's own async flow. Consolidating to a single `AbortController` or a single ref would reduce the maintenance surface.

**Fix (suggestion):** Replace `mountedRef` + `cancelled` with a single `AbortController` in the mount effect and check `signal.aborted` in `poll`. This is a refactor, not a bug, and can be deferred.

---

_Reviewed: 2026-06-15T22:31:15Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
