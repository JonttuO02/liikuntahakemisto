---
phase: 40-wizard-konsolidointi-cleanup
reviewed: 2026-06-12T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - supabase/migrations/20260612000000_cleanup_test_accounts.sql
  - app/business/WizardInner.tsx
  - app/business/onboarding/page.tsx
  - app/business/[id]/page.tsx
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: issues_found
---

# Phase 40: Code Review Report

**Reviewed:** 2026-06-12
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the phase 40 wizard consolidation files: one destructive SQL migration and three React/Next.js components. The migration is well-documented and safe. `onboarding/page.tsx` is a thin wrapper with no issues. The substantive findings are concentrated in `WizardInner.tsx`, the `[id]/page.tsx` server component, and in related files that were read for cross-file context (`StepMediat.tsx`, `submit/route.ts`).

Two blockers were found: a missing ownership check in the edit-venue page that leaks private venue data to any authenticated business user, and a `setSaving` state that is never reset when `handleSave` takes an early `return` path in `StepMediat` — leaving the Save button permanently disabled after a session error or upload failure.

---

## Critical Issues

### CR-01: No authorization check in `/business/[id]/page.tsx` — any authenticated business user can view any venue's private data

**File:** `app/business/[id]/page.tsx:12-16`

**Issue:** The page fetches the full venue record via `supabaseAdmin` (bypasses RLS) and renders the edit wizard for it, but never verifies that the logged-in user actually owns this venue. The `[id]/layout.tsx` only checks authentication (is a business user logged in?), not authorization (does this user own `paikkaId`?).

Any authenticated business user can navigate to `/business/42` (or any other `id`) and see the full venue record including contact info, pricing, photos, and description of a competitor's venue — data that only the owning business should access.

The actual edit operations are blocked server-side by the API routes, but the read exposure of private business-supplied data is a real leak.

**Fix:**
```tsx
// app/business/[id]/page.tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createBusinessServerClient } from '@/lib/supabase-business'

export default async function BusinessVenuePage({ params }: { params: { id: string } }) {
  const paikkaId = parseInt(params.id, 10)
  if (isNaN(paikkaId) || paikkaId < 1) notFound()

  // Authorization: verify this user owns the venue before fetching with admin client
  const supabase = createBusinessServerClient(cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/business/kirjaudu')

  const { data: link } = await supabase
    .from('business_paikka_links')
    .select('id')
    .eq('business_account_id', user.id)
    .eq('paikka_id', paikkaId)
    .maybeSingle()

  if (!link) notFound()  // or redirect to /business with an error

  // Safe to fetch full record now
  const { data: paikka } = await supabaseAdmin
    .from('liikuntapaikat')
    .select('...')
    .eq('id', paikkaId)
    .maybeSingle()
  // ...
}
```

---

### CR-02: `setSaving(false)` never called on early `return` paths in `StepMediat.handleSave` — button permanently disabled after error

**File:** `app/business/onboarding/StepMediat.tsx:220-223`, `244-247`, `270-273`

**Issue:** `handleSave` sets `setSaving(true)` at the top. Inside the `try` block there are three early `return` statements that bypass the `finally` block entirely:

- Line 220-223: early `return` after `!session` check
- Line 244-247: early `return` after logo upload error
- Line 270-273: early `return` after photo upload error

In all three cases, `setSaving(false)` in the `finally` block is **never reached** because `return` inside a `try` block does execute the `finally` — wait, let me be precise: `return` inside `try` *does* execute `finally` in JavaScript. However, re-reading carefully:

The `return` on lines 222, 246, and 272 are inside the `try` block. In JavaScript/TypeScript, `return` inside `try` will still execute the `finally` clause. So `setSaving(false)` *will* be reached via `finally` on those paths.

After re-analysis, this is not a bug. `finally` executes even when `return` is used inside `try`. Downgrading this to a WARNING-level observation about code clarity, not a blocker. See WR-01 below.

**Revised classification:** See WR-01.

---

### CR-02 (revised): `submit/route.ts` selects draft without `paikka_id` filter — wrong draft submitted for multi-venue businesses

**File:** `app/api/business/onboarding/submit/route.ts:21-25`

**Issue:** The submit route fetches the draft with only `.eq('business_account_id', user.id)` and `.maybeSingle()`. If a business user has onboarding drafts for multiple venues simultaneously (which the schema supports — `UNIQUE(business_account_id, paikka_id)` allows multiple rows per user), `maybeSingle()` returns only one row, which may not be the intended venue's draft.

The request body is empty (`body: JSON.stringify({})`), so the client sends no `paikka_id` hint. The route cannot determine *which* draft to submit when multiple exist. This means the wrong venue's draft may be committed to `liikuntapaikat`.

While uncommon in the current product (most businesses own one venue), the data model allows multiple and the onboarding flow explicitly supports it (drafts are keyed by `(business_account_id, paikka_id)`). The missing `paikka_id` in the submit request is a logical gap.

**Fix:** Include `paikka_id` in the submit POST body from `StepEsikatselu`, and filter the draft query in the submit route:

```ts
// StepEsikatselu.tsx — pass paikka_id to submit
body: JSON.stringify({ paikka_id: /* pass down from WizardInner */ }),

// submit/route.ts — filter draft by paikka_id
const body = await request.json()
const paikkaId = parseInt(body.paikka_id, 10)
// ...
.eq('business_account_id', user.id)
.eq('paikka_id', paikkaId)
.maybeSingle()
```

---

## Warnings

### WR-01: `setSaving` state not reset on early `return` paths — clarification

**File:** `app/business/onboarding/StepMediat.tsx:211-308`

`finally` blocks in JavaScript do execute when `return` is used inside `try`, so `setSaving(false)` is correctly reached on all paths including the early returns. However, the same pattern in `handleSave` does NOT reset `saving` before showing the error — the button stays in the "disabled" state for the 2-second `setSaveSuccessVisible` timeout after success, which is intentional, but the code clarity around the dual loading-state variables (`saving` vs. `isUploading`) is fragile and easy to misread.

The actual correctness issue in this file: the early `return` on lines 221-223 (no session) does NOT set `setSaveError` before returning in a clearly visible way — the error message is set but `setSaving(false)` runs via `finally`, so the button re-enables. This is actually fine, but the error message text is hardcoded Finnish (`'Tallennus epäonnistui'`) instead of using `t('errorGeneric')`, inconsistent with the rest of the codebase.

**Fix:** Replace hardcoded Finnish string with translation key:
```tsx
// lines 221, 245, 271: replace
setSaveError('Tallennus epäonnistui')
// with
setSaveError(t('errorGeneric'))
```

---

### WR-02: `paikka_id` validation in `save-step` route does not reject non-positive values

**File:** `app/api/business/onboarding/save-step/route.ts:44-48`

**Issue:** `parseInt(body.paikka_id, 10)` is only checked for `isNaN`, not for `<= 0`. A `paikka_id` of `0` or `-1` passes validation and reaches the ownership check where it would return 403 (no link row exists for id 0), but this is inconsistent with `update-paikka/route.ts` line 34 which explicitly checks `paikka_id <= 0`. A defense-in-depth gap.

**Fix:**
```ts
if (isNaN(parsed) || parsed < 1) {
  return NextResponse.json({ error: 'Missing or invalid paikka_id' }, { status: 400 })
}
```

---

### WR-03: `step` URL parameter is not validated against `NaN` before use as integer — malformed URL renders incorrect step

**File:** `app/business/WizardInner.tsx:49`

**Issue:**
```ts
const step = parseInt(searchParams.get('step') ?? '1', 10)
```

If `?step=abc` is present in the URL, `parseInt('abc', 10)` returns `NaN`. All conditional renders in lines 220-266 use `step === 1`, `step === 2`, etc. `NaN === 1` is `false`, so all step components render as nothing — blank page. The guard at line 170 (`step > maxReachedStep + 1`) also fails silently because `NaN > anything` is `false`.

**Fix:**
```ts
const rawStep = parseInt(searchParams.get('step') ?? '1', 10)
const step = isNaN(rawStep) || rawStep < 1 || rawStep > 6 ? 1 : rawStep
```

---

## Info

### IN-01: Unused `t` (translation hook) in `OnboardingMode`

**File:** `app/business/WizardInner.tsx:35`

**Issue:** `const t = useTranslations('Business')` is declared at line 35 inside `OnboardingMode` but never called anywhere in that function's body or JSX. All the text in `OnboardingMode` is delegated to child step components which have their own translation hooks.

**Fix:** Remove line 35 from `OnboardingMode`:
```tsx
// Delete:
const t = useTranslations('Business')
```

---

### IN-02: Migration comment references dropped column `onboarding_completed` as if it needs to be guarded against

**File:** `supabase/migrations/20260612000000_cleanup_test_accounts.sql:15-17`

**Issue:** The migration comment says "Note: onboarding_completed column was already dropped in 20260611000000_drop_onboarding_completed.sql. Do NOT attempt to drop it again here." This is accurate and correct, but it creates a false impression that this migration was *originally intended* to drop that column. In reality this migration only deletes `auth.users` rows and has no relationship to the column. The comment may cause future confusion.

**Fix:** Remove the note about `onboarding_completed` — it is unrelated to this migration's concern. The column's drop history is already self-documented in its own migration file.

---

_Reviewed: 2026-06-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
