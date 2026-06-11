---
phase: 37-tech-debt-foundation
reviewed: 2026-06-11T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - middleware.ts
  - app/business/layout.tsx
  - app/api/business/claim-paikka/route.ts
  - app/api/business/onboarding/submit/route.ts
  - app/business/onboarding/OnboardingWizardInner.tsx
  - app/business/[id]/EditWizardInner.tsx
  - supabase/migrations/20260611000000_drop_onboarding_completed.sql
findings:
  critical: 2
  warning: 3
  info: 1
  total: 6
status: fixed
---

# Phase 37: Code Review Report

**Reviewed:** 2026-06-11T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Phase 37 makes targeted, well-scoped changes: adding an Edge-layer middleware redirect for
unauthenticated `/business/*` and `/admin/*` paths, adding an RSC layout guard for `/business/*`,
merging `business_managed: true` into the claim route, scoping the draft DELETE with `paikka_id`,
removing the dead `onboarding_completed` writes/state from client code, and dropping the column.
The intent and overall architecture are sound.

Two blocking issues were found: the `/business/rekisteroidy` registration page is now locked behind
the auth guard that was intended only for authenticated business owners, permanently breaking new
user registration. A separate issue exists where the `loadDraft` `useEffect` returns early (line 59)
without calling `setLoading(false)`, leaving the spinner stuck indefinitely for any user whose
session cookie exists in the middleware but whose `getUser()` call in the client component resolves
to null (possible in the localStorage-based auth setup used by this app).

Three warnings cover: an authorization gap in `app/business/[id]/page.tsx` that the phase comment
acknowledges but does not fix; the `onboarding/submit` draft-fetch joining unnecessary data from
`liikuntapaikat` to a table column that was just removed (stale comment); and a missing `SIGNED_IN`
event handler in the auth subscription that means the `_currentUser` singleton will remain `null`
until a token refresh fires, causing a brief incorrect "no user" read from `subscribeToAuthUser`
callers immediately after page load.

---

## Critical Issues

### CR-01: `/business/rekisteroidy` registration page broken by new layout guard

**File:** `app/business/layout.tsx:5-11` (combined with `app/business/rekisteroidy/page.tsx`)

**Issue:** `BusinessLayout` applies to every route under `/business/**`, including
`/business/rekisteroidy` — the page where new users create a business account for the first
time. Because a new registrant is unauthenticated, both the middleware (line 30 of
`middleware.ts`) and the RSC layout guard (`layout.tsx` line 8) will redirect them to
`/kirjaudu` (which does not even exist as a page — see CR-02 below). The path
`/business/rekisteroidy` is a public registration entry point that must be exempted from
the auth guard, but it was not.

The middleware `isProtectedPath` check covers all of `/business`:
```ts
// middleware.ts line 27-29
const isProtectedPath =
  request.nextUrl.pathname.startsWith('/business') ||
  request.nextUrl.pathname.startsWith('/admin')
```

And `layout.tsx` covers the same tree with no exclusion:
```ts
// app/business/layout.tsx — no path exclusion
if (!user) {
  redirect('/kirjaudu')
}
```

A new user visiting `/business/rekisteroidy` is redirected away before they can register.

**Fix:** Exempt `/business/rekisteroidy` from both guards.

In `middleware.ts`:
```ts
const isProtectedPath =
  (request.nextUrl.pathname.startsWith('/business') &&
   !request.nextUrl.pathname.startsWith('/business/rekisteroidy')) ||
  request.nextUrl.pathname.startsWith('/admin')
```

In `app/business/layout.tsx`, add a path check before the redirect:
```tsx
import { headers } from 'next/headers'
// ...
const headersList = headers()
const pathname = headersList.get('x-invoke-path') ?? ''
// Or use a separate layout file for rekisteroidy — the cleanest fix is to move
// app/business/rekisteroidy/ outside the /business tree or use a route group.
```

The cleanest architectural fix is to move the registration page out of the guarded
subtree by placing it in a Next.js route group, e.g. `app/(public)/business/rekisteroidy/`,
or by restructuring so `app/business/layout.tsx` only applies to authenticated pages and
`rekisteroidy` sits outside it.

---

### CR-02: Redirect target `/kirjaudu` does not exist as a page

**File:** `middleware.ts:31`, `app/business/layout.tsx:9`

**Issue:** Both the middleware and the RSC layout guard redirect unauthenticated users to
`/kirjaudu`. No such route exists in the `app/` directory. Searching the entire codebase
yields only these two redirect call sites referencing it. There is no `app/kirjaudu/` directory,
no `app/kirjaudu/page.tsx`, and no `/kirjaudu` catch-all. The redirect results in a 404 for
every unauthenticated user attempting to access a protected path, providing no login
mechanism and a broken user experience.

The authentication UI in this project lives in `AuthModal` (a client-side modal), not a
dedicated page. There is currently no standalone `/kirjaudu` login page that can receive
these redirects.

```ts
// middleware.ts:31 — redirects to a non-existent page
return NextResponse.redirect(new URL('/kirjaudu', request.url))
```

**Fix — Option A (minimal):** Redirect to the homepage (`/`) where the AuthModal can be
triggered, or pass a query parameter so the page can open the auth modal on load:
```ts
return NextResponse.redirect(new URL('/?kirjaudu=1', request.url))
```

**Fix — Option B (proper):** Create `app/kirjaudu/page.tsx` as a thin wrapper that renders
`AuthModal` in an always-open state, with a redirect-back-to query param, and ensure
the `/business/rekisteroidy` exemption from CR-01 is applied first.

---

## Warnings

### WR-01: `loadDraft` returns early without calling `setLoading(false)` — spinner stuck forever

**File:** `app/business/onboarding/OnboardingWizardInner.tsx:59`

**Issue:** The early return added to satisfy TypeScript narrowing does not call
`setLoading(false)`. The comment says "layout.tsx RSC guard prevents this," which is true
for cookie-based sessions. However, this component uses `createBrowserSupabase()` which
uses the standard `createClient` (localStorage), not `@supabase/ssr`. A timing window
exists: the middleware and layout guard validate the server-side cookie session, but if the
client's localStorage token is absent, expired, or not yet hydrated, `supabase.auth.getUser()`
on line 58 will return `user: null` in the browser. When that happens, the early return
on line 59 exits `loadDraft` without setting `loading` to `false`, and the spinner on
lines 188-194 is shown forever — the page is permanently stuck.

```tsx
// line 58-59 — missing setLoading(false)
const { data: { user } } = await supabase.auth.getUser()
if (!user) return  // loading stays true indefinitely
```

**Fix:**
```tsx
if (!user) {
  setLoading(false)
  return
}
```

---

### WR-02: Authorization gap in `app/business/[id]/page.tsx` — any authenticated user can edit any venue

**File:** `app/business/[id]/page.tsx:9-11`

**Issue:** The page fetches venue data via `supabaseAdmin` (bypasses RLS) and renders
`EditWizardInner` for any `paikkaId`, with no check that the authenticated user owns that
venue. The comment on lines 9-11 reads:

> "Auth guard is client-side in EditWizardInner — the browser client stores session in
> localStorage (not cookies), so server-side getUser() always returns null for this app's
> auth setup."

Phase 37 added `app/business/layout.tsx` as an RSC auth guard — but that guard only checks
"is a user authenticated", not "does this user own this `paikkaId`". An authenticated but
non-owner business user can navigate directly to `/business/999` and reach the edit wizard
for any venue. The per-step save API routes (`/api/business/onboarding/save-step`) are the
final server-side enforcement gate, but the page itself renders without authorization and
exposes venue data (hinta_kuvaus, puhelin, varauslinkki, kuvaus, aukioloajat, logo_url,
photo_urls) to any logged-in user.

This was a pre-existing issue not introduced by Phase 37, but the phase added layout-level
auth checks for `/business/**` while leaving the ownership check unaddressed — the phase
comment in `[id]/page.tsx` remains unchanged even though the premise (no server-side auth
possible) is now incorrect given the layout guard pattern already used in `layout.tsx`.

**Fix:** Add an ownership check in `app/business/[id]/page.tsx` before rendering:
```ts
// After fetching paikka, verify ownership via business_paikka_links
const cookieStore = cookies()
const supabaseUser = createServerSupabase(cookieStore)
const { data: { user } } = await supabaseUser.auth.getUser()
if (!user) notFound()

const { data: link } = await supabaseAdmin
  .from('business_paikka_links')
  .select('id')
  .eq('business_account_id', user.id)
  .eq('paikka_id', paikkaId)
  .maybeSingle()

if (!link) notFound()
```

---

### WR-03: `onboarding/submit` route joins `liikuntapaikat` data into draft fetch but comment is stale and data is unused

**File:** `app/api/business/onboarding/submit/route.ts:22-24`

**Issue:** The draft fetch on line 22 uses a join:
```ts
.select('*, liikuntapaikat(nimi, osoite, kaupunki, laji, latitude, longitude, aukioloajat)')
```
The comment on lines 18-20 says this joined data is "included for consistency with the
draft shape used by StepEsikatselu." However, none of the joined `liikuntapaikat` fields
from this fetch are read anywhere in the route handler — all mutations in Steps 3-5 use
`draft.*` fields only. The joined data adds a second database query execution path inside
the Postgres planner for no benefit, and the comment referencing `StepEsikatselu` is
misleading (StepEsikatselu is a UI component in the client, not this server-side route).

Additionally, the comment on line 7 in the old code referenced `onboarding_completed` as
context. That column is now dropped by the migration, but the comment about "draft → liikuntapaikat
atomic commit" still refers to an implicit workflow that once set `onboarding_completed`.

**Fix:** Replace the join with a plain select:
```ts
const { data: draft, error: draftError } = await supabaseAdmin
  .from('onboarding_draft')
  .select('*')
  .eq('business_account_id', user.id)
  .maybeSingle()
```
Update the comment to remove the stale StepEsikatselu reference.

---

## Info

### IN-01: `ReactNode` type used without React import in `layout.tsx`

**File:** `app/business/layout.tsx:5`

**Issue:** The `children` parameter is typed as `React.ReactNode` but there is no `import React` or `import type { ReactNode }` in the file. In Next.js 14 with the React 18 JSX transform, `React` does not need to be in scope for JSX, but the explicit `React.ReactNode` type reference still requires React to be imported as a type.

This will fail TypeScript strict-mode compilation if the project uses `isolatedModules` or does not have global React type augmentation.

```tsx
// app/business/layout.tsx:5 — React is referenced but not imported
export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
```

**Fix:** Add a type import:
```tsx
import type { ReactNode } from 'react'
// ...
export default async function BusinessLayout({ children }: { children: ReactNode }) {
```
Or keep `React.ReactNode` and add:
```tsx
import type React from 'react'
```

---

_Reviewed: 2026-06-11T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
