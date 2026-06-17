---
phase: 48-logo-v-ri-ja-galleriavalinta
reviewed: 2026-06-17T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - app/business/onboarding/page.tsx
  - app/business/onboarding/StepEsikatselu.tsx
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 48: Code Review Report

**Reviewed:** 2026-06-17T00:00:00Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

This is a follow-up review scoped to the two files touched by gap-closure plan 48-04, which made two single-expression fixes:

1. `app/business/onboarding/page.tsx` — `handleConfirm`'s save-step fetch body now sends `step: 1` instead of `step: 2`.
2. `app/business/onboarding/StepEsikatselu.tsx` — `brandColor` fallback now reads `colors?.find(c => c.role === 'background')?.hex` instead of `colors?.[0]?.hex`.

Both fixes were traced against their dependencies and verified correct:

- **Fix 1** is consistent with `app/api/business/onboarding/save-step/route.ts`, which persists `current_step: step + 1`. Sending `step: 1` results in `current_step: 2` in `onboarding_draft`, which is what `WizardInner`'s auto-resume logic (`savedStep > 1 && step === 1`) needs to land the user on Step 2 (StepMediat) where the gallery/logo prefill renders. The previous `step: 2` value would have produced `current_step: 3`, skipping StepMediat — the bug this fix closes is real and the fix is correct.
- **Fix 2** is consistent with `lib/branding/brandingResult.ts`'s `BrandingResult.colors: Array<{ hex: string; role: string }>` type, and mirrors the equivalent background-role lookup already used in `AnalysoiSivusto.tsx` (`colors.find(c => c.role === 'background')`). Falling back to index `[0]` was not guaranteed to be the background-role color (array order from the AI analyzer is not contractually role-ordered), so this is a genuine correctness improvement, not just style.

No critical issues found in either file as they currently stand. One pre-existing warning-level concern and two info-level observations remain, none introduced by the 48-04 patch itself.

## Warnings

### WR-01: Silent failure path on save-step write swallows all error information

**File:** `app/business/onboarding/page.tsx:106-125`
**Issue:** The `fetch('/api/business/onboarding/save-step', ...)` call is awaited (correctly, per the T-48-15 race-fix comment) but the response is never checked for `res.ok`, and the surrounding `catch` block is empty. If the server returns 401/403/500 (e.g. token expired between `getSession()` and the fetch, or the `business_paikka_links` ownership check fails), the code proceeds to `setPagePhase('wizard')` exactly as if the write had succeeded — there is no `console.error`, no telemetry, and no user-visible signal that the gallery/logo selections were not persisted. The inline comment ("Non-blocking: if the write fails, still allow navigation") only justifies *not blocking navigation*, not *discarding the failure entirely*. A developer debugging "why didn't my prefill show up" in production has no log line to find.
**Fix:**
```tsx
try {
  const supabase = createBusinessBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''
  const res = await fetch('/api/business/onboarding/save-step', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({
      paikka_id: paikkaId,
      step: 1,
      field: 'media_urls',
      value: { logo: selections.logoUrl, photos: selections.gallery },
    }),
  })
  if (!res.ok && process.env.NODE_ENV !== 'production') {
    console.error('[onboarding] save-step failed:', res.status, await res.text())
  }
} catch (err) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[onboarding] save-step threw:', err)
  }
  // Non-blocking: still allow navigation — StepMediat lets the user re-add manually.
}
```

## Info

### IN-01: `colors?.find` fallback silently returns `undefined` instead of `null` when no background-role color exists

**File:** `app/business/onboarding/StepEsikatselu.tsx:47-50`
**Issue:** The fallback chain `brandingData?.selected_background_color ?? brandingData?.colors?.find(c => c.role === 'background')?.hex ?? undefined` is functionally fine (the trailing `?? undefined` is a no-op since the LHS is already `string | undefined` at that point), but the final `undefined` is redundant noise — `brandColor` is typed `string | undefined` per `DiagonaalKortti`'s prop, so the expression already produces the right type without the explicit `?? undefined`. Not a bug, but a stale leftover that adds nothing and slightly obscures intent.
**Fix:**
```tsx
const brandColor =
  brandingData?.selected_background_color ??
  brandingData?.colors?.find(c => c.role === 'background')?.hex
```

### IN-02: Duplicated spinner markup between `page.tsx` and `StepEsikatselu.tsx`

**File:** `app/business/onboarding/StepEsikatselu.tsx:52-56`, `app/business/onboarding/page.tsx:12-18`
**Issue:** Both files independently implement a near-identical "spinner div" markup (`w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin`) — it appears 3 times across these two files alone (`PreVaiheSpinner`, the wizard-phase fallback in `page.tsx`, and the `!draftAsPaikka` branch in `StepEsikatselu.tsx`). This is a pre-existing pattern, not introduced by 48-04, but worth flagging since it's pure duplication with no semantic divergence between instances.
**Fix:** Extract a shared `<Spinner />` component (one already exists locally inside `AnalysoiSivusto.tsx`) into a common location (e.g. `app/components/Spinner.tsx`) and reuse it across `page.tsx` and `StepEsikatselu.tsx`.

---

_Reviewed: 2026-06-17T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
