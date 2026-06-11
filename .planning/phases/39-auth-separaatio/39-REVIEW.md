---
phase: 39
reviewed: 2026-06-12T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - lib/supabase-business.ts
  - middleware.ts
  - app/business/kirjaudu/page.tsx
  - app/business/[id]/layout.tsx
  - app/business/onboarding/layout.tsx
  - app/business/page.tsx
  - app/business/rekisteroidy/page.tsx
  - app/business/onboarding/OnboardingWizardInner.tsx
  - app/business/onboarding/StepMediat.tsx
  - app/business/onboarding/StepYhteystiedot.tsx
  - app/business/onboarding/StepAukioloajat.tsx
  - app/business/onboarding/StepHinnasto.tsx
  - app/business/onboarding/StepEsikatselu.tsx
  - messages/fi.json
  - messages/en.json
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 39: Code Review Report

**Reviewed:** 2026-06-12
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Phase 39 implements auth session separation between consumer (`sb-*`) and business (`sb-biz-*`) cookie namespaces. The core architecture is sound: `lib/supabase-business.ts` correctly applies `cookieOptions.name = 'sb-biz'` to both server and browser clients; the middleware branching is correctly structured; all `/business/*` files have been migrated away from the consumer client; and both i18n files are valid JSON with all 7 new keys present.

One critical security finding: multiple client components call `supabase.auth.getSession()` to obtain the access token before API calls. The `getSession()` method returns data from local storage/cookies without server-side validation — it is spoofable in a compromised browser context. Supabase's security guidance requires `getUser()` (which re-validates the JWT with the auth server) for any token that will be used in an authorized request. This is an existing pre-phase pattern that was carried forward unchanged into the new business client calls, making it in-scope for this review.

Four warnings cover: the singleton pattern creating a risk of stale state in SSR environments, a console.error leak of internal server error details from `/api/business/reapply`, an empty token fallback that silently sends unauthenticated requests, and the `StepAukioloajat.handleSave` also sending an empty token on session null.

---

## Critical Issues

### CR-01: `getSession()` used to obtain tokens for authorized API requests (multiple files)

**Files:**
- `app/business/page.tsx:183`
- `app/business/rekisteroidy/page.tsx:87`
- `app/business/onboarding/StepMediat.tsx:115,218`
- `app/business/onboarding/StepYhteystiedot.tsx:59,106`
- `app/business/onboarding/StepAukioloajat.tsx:122,168`
- `app/business/onboarding/StepHinnasto.tsx:102,162`
- `app/business/onboarding/StepEsikatselu.tsx:50`

**Issue:** `supabase.auth.getSession()` retrieves the session from the local cookie/storage cache without re-validating the JWT with Supabase Auth. Supabase's own documentation states that `getSession()` should not be used for security-sensitive operations; `getUser()` must be called instead because it hits the Supabase Auth server to verify the token has not been revoked or tampered with. All of the above call sites use the `session.access_token` from `getSession()` as a Bearer token to authorize server-side route handlers. If an attacker can inject a crafted token into local storage (e.g., via XSS), `getSession()` returns it without challenge, and it is forwarded to the API. The server-side route handlers presumably use `supabaseAdmin.auth.getUser(token)` which _does_ verify with the auth server — however, the security gap exists from the client's perspective: a stale or revoked token from `getSession()` may still be forwarded, causing silent API failures rather than the expected redirect-to-login behavior. The consistent pattern should be `getUser()` for all cases where identity matters.

**Fix:** Replace all `getSession()` calls that are used solely to extract `access_token` with a `getUser()` call combined with a `getSession()` only for the token itself, or restructure to call `getUser()` first to verify identity and only then call `getSession()` for the token:

```typescript
// BEFORE (unsafe pattern — used in all Step components):
const { data: { session } } = await supabase.auth.getSession()
if (!session) { setError(...); return }
const token = session.access_token

// AFTER (correct pattern):
const { data: { user }, error: userError } = await supabase.auth.getUser()
if (!user || userError) { setError(...); return }
const { data: { session } } = await supabase.auth.getSession()
if (!session) { setError(...); return }
const token = session.access_token
```

Alternatively, since the route handlers validate the token server-side, the minimum fix is to ensure session-null is handled before forwarding the token (see WR-01 for the silent empty-token issue).

---

## Warnings

### WR-01: Empty token fallback `?? ''` silently sends unauthenticated requests

**Files:**
- `app/business/page.tsx:184`
- `app/business/onboarding/StepAukioloajat.tsx:123,169`
- `app/business/onboarding/StepHinnasto.tsx:103,163`

**Issue:** The pattern `const token = session?.access_token ?? ''` silently produces an empty string when `session` is null. The fetch then sends `Authorization: Bearer ` (empty), which the server will reject — but the error is surfaced as a generic error message rather than a login redirect. The user is stuck with an unhelpful error and cannot distinguish "session expired" from "server error." The correct behavior is to detect session null before calling fetch and redirect to `/business/kirjaudu`.

**Fix:**
```typescript
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
  router.push('/business/kirjaudu')
  return
}
const token = session.access_token
```

### WR-02: `console.error` in `page.tsx` leaks server error response to browser console

**File:** `app/business/page.tsx:196`

**Issue:** `console.error('[reapply] failed', await res.json())` serializes and logs the full server error response body to the browser console on reapply failure. Server error payloads may contain stack traces, internal identifiers, or diagnostic information that should not be exposed to end users or observable via browser DevTools. This is a production code path, not a debug artifact.

**Fix:** Remove the `console.error` line entirely. The `if (!res.ok)` branch should set user-visible state (e.g., `setError(t('errorGeneric'))`) without logging server internals:
```typescript
if (res.ok) {
  setVenueLinks(prev => prev.map(l => ...))
} else {
  setError(t('errorGeneric'))
}
```

### WR-03: `console.error` in `StepEsikatselu.tsx` leaks server response body

**File:** `app/business/onboarding/StepEsikatselu.tsx:67`

**Issue:** `try { console.error('[submit] server error:', await res.clone().json()) } catch {}` logs the server error response body to the browser console in a production path. Same concern as WR-02 — server error payloads may expose internal details. The silent `catch {}` around the console.error suggests this was a debug artifact that was not removed before shipping.

**Fix:** Remove the inner try/console.error block entirely:
```typescript
if (!res.ok) {
  setError(t('errorSubmitFailed'))
  return
}
```

### WR-04: `createBusinessBrowserClient` singleton not reset between test environments / SSR cold starts

**File:** `lib/supabase-business.ts:8`

**Issue:** The module-level `let _bizBrowserClient: ReturnType<typeof createBrowserClient> | undefined` is a singleton that persists for the lifetime of the module in the runtime. In a hot-reload dev environment or Next.js edge runtime, the module may be re-evaluated between requests, but in long-running Node.js processes (production), the singleton persists across all browser-originated SSR renders sharing the same worker process. This file is imported only in client components (`'use client'`), so the singleton is effectively scoped to the browser tab — this is the intended behavior. However, if this file is ever imported server-side (e.g., in a future Route Handler), the singleton would be shared across all server requests, creating a session leakage vector. The current code is safe for the current usage, but the lack of a guard is a latent risk.

The more concrete risk: `createBrowserClient` from `@supabase/ssr` has its own internal singleton keyed by URL+key. Wrapping it in a second module-level singleton means if the environment variables change between renders (unlikely but possible in test environments), the old instance is served. This is low-risk in production but could cause confusing test failures.

**Fix:** Add a comment explicitly documenting the browser-only constraint to prevent future server-side imports:
```typescript
// BROWSER-ONLY SINGLETON — do NOT import this file from server components or Route Handlers.
// Module-level singleton is safe here because this module is only ever imported from
// 'use client' components, each of which runs in a single browser context.
let _bizBrowserClient: ReturnType<typeof createBrowserClient> | undefined
```

---

## Info

### IN-01: `StepMediat.handleSave` error messages are hardcoded Finnish strings, not i18n keys

**File:** `app/business/onboarding/StepMediat.tsx:222,245,273`

**Issue:** Three error paths in `handleSave` use the hardcoded Finnish string `'Tallennus epäonnistui'` instead of `t('errorUploadFailed')` or `t('errorGeneric')`. This inconsistency means English locale users see Finnish error text in edit mode.

**Fix:** Replace all three occurrences with `setSaveError(t('errorUploadFailed'))`.

### IN-02: `app/business/page.tsx` uses `<a href>` instead of `<Link>` for internal navigation

**File:** `app/business/page.tsx:107,167,232`

**Issue:** Three internal navigation elements use raw `<a href="...">` tags: `href="/business/rekisteroidy"` (line 107), `href={'/business/' + link.paikka_id}` (line 167), and `href="/"` (line 232). Using `<a>` for internal routes triggers a full page reload, losing client-side navigation, React state, and the prefetching benefits of Next.js Link. The rest of the business UI consistently uses Next.js `<Link>`.

**Fix:** Replace `<a href="...">` with `<Link href="...">` from `next/link` for all three occurrences.

### IN-03: `StepAukioloajat` `handleNext` does not call `setLoading(false)` before returning on session-null path

**File:** `app/business/onboarding/StepAukioloajat.tsx:168-170`

**Issue:** In `handleNext`, when `session` is null, the function returns early without calling `setLoading(false)`. The `finally` block at line 193 does set `setLoading(false)`, but only when the function reaches the `finally` clause — early returns within a `try` block do execute `finally`, so this is actually not a bug in terms of the loading state being reset. On re-reading: `setLoading(false)` IS called by `finally`. This is correct.

However, the issue is that `token = session?.access_token ?? ''` at line 169 sends the request with an empty token rather than returning early, so this is covered under WR-01.

No separate fix needed here beyond WR-01.

---

_Reviewed: 2026-06-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
