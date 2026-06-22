---
phase: 52-cleanup-i18n-merkkijonot-authmodal-bugi
reviewed: 2026-06-22T15:30:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - app/components/__tests__/AuthModal.mapError.test.ts
  - app/business/rekisteroidy/mapBusinessError.ts
  - app/components/AuthModal.tsx
  - app/business/rekisteroidy/page.tsx
  - vitest.config.ts
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 52: Code Review Report

**Reviewed:** 2026-06-22T15:30:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

This phase verified two already-fixed defects (i18n string coverage and the `mapError` operator-precedence bug from an earlier phase) and introduced the project's first Vitest regression test, plus a post-merge extraction of `mapBusinessError` into its own module to satisfy Next.js's restriction on extra named exports from `page.tsx` route files.

I independently verified the following, all of which check out:
- `npm run build` succeeds — the extraction correctly resolved the Next.js route-export violation; `page.tsx` no longer exports anything beyond the default component.
- `npx vitest run` passes 184/184 tests, including the new 8-case `AuthModal.mapError.test.ts` file.
- The `mapError` precedence logic (`(A || B) && C`) is correct for the real-world Supabase error string `"Password should be at least 6 characters"`, and the regression test exercises the intended precedence-guard scenario (`password` + `6` without the literal phrase, and `password` without `6`).
- `mapBusinessError` in the new module is a faithful, unmodified copy of the same logic in `AuthModal.tsx` (verified line-by-line) — the extraction did not change behavior.
- All i18n keys referenced (`errorEmailInUse`, `errorWeakPassword`, `errorGeneric`, `errorCheckEmail`, `errorAccountCreationFailed`) exist in both `messages/fi.json` and `messages/en.json` under the `Business` namespace, and the `Auth`-namespace subset used by `AuthModal.tsx` also exists.
- `vitest.config.ts`'s `oxc.jsx` object form and the `@` path alias are both required and correctly wired — removing either breaks the test run (confirmed by the commit history note and by re-running the suite).

No correctness, security, or data-loss issues found. The findings below are quality/maintainability observations.

## Warnings

### WR-01: `mapError` and `mapBusinessError` are duplicated, divergence-prone logic

**File:** `app/components/AuthModal.tsx:20-35` and `app/business/rekisteroidy/mapBusinessError.ts:1-18`
**Issue:** `mapBusinessError` is a copy-paste subset of `mapError` (missing only the `errorInvalidCredentials` branch, since business registration has no sign-in flow). Both functions implement the same `(A || B) && C` precedence-sensitive password-weakness check independently. The original precedence bug (`A || (B && C)`) was introduced once and had to be fixed once already (commit `85eea7a`); now there are two copies of this fragile boolean expression that must be kept in sync by hand. A future fix to one (e.g., adding a new Supabase error variant) is likely to be applied to only one file, silently reintroducing inconsistent behavior between consumer auth and business auth.
**Fix:** Extract a single shared classifier (e.g., `lib/authErrors.ts`) with the full `errorInvalidCredentials | errorEmailInUse | errorWeakPassword | errorGeneric` union, and have `mapBusinessError` either reuse it directly or wrap it:
```ts
// lib/authErrors.ts
export function mapAuthError(message: string): 'errorInvalidCredentials' | 'errorEmailInUse' | 'errorWeakPassword' | 'errorGeneric' {
  if (message.includes('Invalid login credentials') || message.includes('invalid_credentials')) {
    return 'errorInvalidCredentials'
  }
  if (message.includes('User already registered') || message.includes('already been registered') || message.includes('already exists')) {
    return 'errorEmailInUse'
  }
  if ((message.includes('Password should be at least') || message.includes('password')) && message.includes('6')) {
    return 'errorWeakPassword'
  }
  return 'errorGeneric'
}

// app/business/rekisteroidy/mapBusinessError.ts
import { mapAuthError } from '@/lib/authErrors'
export function mapBusinessError(message: string): 'errorEmailInUse' | 'errorWeakPassword' | 'errorGeneric' {
  const result = mapAuthError(message)
  return result === 'errorInvalidCredentials' ? 'errorGeneric' : result
}
```
This was out of scope for this verification phase, but should be tracked as follow-up tech debt now that the duplication has been made permanent by the extraction.

### WR-02: `mapError`'s real-world correctness relies on an unstated assumption about Supabase's password-length error text

**File:** `app/components/AuthModal.tsx:27-31`, `app/business/rekisteroidy/mapBusinessError.ts:11-14`
**Issue:** The `errorWeakPassword` branch requires the literal substring `'6'` to appear in the Supabase error message. This is correct today because GoTrue's default minimum password length is 6 and its error text is `"Password should be at least 6 characters"`. However, this coupling is implicit and untested against that exact real-world string — the new regression test (`AuthModal.mapError.test.ts`) only covers a synthetic message (`'your password must be 6 characters'`) and never asserts against the actual Supabase wording. If the project's Supabase Auth minimum password length setting is ever changed (e.g., to 8), `mapError`/`mapBusinessError` will silently fall through to `errorGeneric` for the most common signup error, and no test would catch the regression.
**Fix:** Add a test case using the literal Supabase string, and consider matching on `/at least \d+ characters/i` or `message.includes('Password should be at least')` alone (already one of the two OR conditions) rather than requiring the `'6'` substring as an AND condition:
```ts
it('resolves the real Supabase weak-password message', () => {
  expect(mapError('Password should be at least 6 characters')).toBe('errorWeakPassword')
})
```

## Info

### IN-01: Test file name/location doesn't match its scope

**File:** `app/components/__tests__/AuthModal.mapError.test.ts`
**Issue:** The file is named and located under `app/components/__tests__/` (implying it tests `AuthModal.tsx` only), but it also imports and tests `mapBusinessError` from a completely different module (`app/business/rekisteroidy/mapBusinessError.ts`). This is a minor discoverability issue — a developer working on `app/business/rekisteroidy/` would not think to look in `app/components/__tests__/` for relevant test coverage.
**Fix:** Either split into two files (`AuthModal.mapError.test.ts` and a colocated `app/business/rekisteroidy/__tests__/mapBusinessError.test.ts`), or rename this file to something neutral like `authErrorMapping.test.ts` if keeping both in one file is intentional given the shared logic.

### IN-02: `mapError` exported as a named export from a `'use client'` component file

**File:** `app/components/AuthModal.tsx:20`
**Issue:** `mapError` is exported alongside the default `AuthModal` component from a client component file. This works and is not the Next.js route-export restriction (that only applies to `page.tsx`/`layout.tsx` route files), but it does mean every import of `mapError` for testing purposes pulls in `react`, `framer-motion`, `lucide-react`, `next/navigation`, and `next-intl` as module-level side effects during test collection, even though the test only needs the pure function. This was tolerated here (confirmed: test suite runs in 527ms, no failures) but is the same shape of coupling that caused the `page.tsx` build failure this phase had to fix — `mapError` is one missed Next.js constraint away from a similar problem if `AuthModal.tsx` is ever converted to a route-adjacent special file.
**Fix:** For consistency with the `mapBusinessError` extraction pattern established in this phase, consider extracting `mapError` into its own pure module (e.g., `app/components/mapError.ts`) so the test doesn't need to import the full component tree, and so the pattern is uniform across both call sites.

---

_Reviewed: 2026-06-22T15:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
