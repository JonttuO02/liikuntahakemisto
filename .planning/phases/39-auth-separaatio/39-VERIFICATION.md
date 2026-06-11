---
phase: 39-auth-separaatio
verified: 2026-06-12T00:00:00Z
status: human_needed
score: 10/10 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Log in at /business/kirjaudu and inspect browser DevTools > Application > Cookies"
    expected: "Cookie named sb-biz-auth-token is set; no new sb-auth-token cookie is created"
    why_human: "Cookie names written by @supabase/ssr are confirmed by the cookieOptions.name='sb-biz' pattern in code, but the actual cookie name produced at runtime can only be confirmed in a live browser session"
  - test: "Log in to a consumer account (/, /profiili) in the same browser tab first, then open /business/kirjaudu and log in with a business account"
    expected: "Both sessions coexist simultaneously — sb-auth-token (consumer) and sb-biz-auth-token (business) are visible in DevTools at the same time"
    why_human: "Cookie namespace isolation is the core phase goal; runtime coexistence of two sessions cannot be verified by static analysis alone"
  - test: "While only a business session is active (no consumer login), navigate to /, /profiili, and the front-page listing"
    expected: "Consumer routes render normally — no redirect, no auth error, no broken UI"
    why_human: "Consumer route isolation requires runtime verification that the middleware consumer branch does not depend on or interfere with the business session"
  - test: "Access /business/paikka/123 (any real /business/[id] route) without being logged in to the business account"
    expected: "Middleware redirects to /business/kirjaudu (not /)"
    why_human: "The redirect target change from / to /business/kirjaudu in the RSC layouts and middleware is verified in code, but correct routing of the nested /business/[id]/* path through the middleware guard requires a live request"
---

# Phase 39: Auth Separaatio Verification Report

**Phase Goal:** Consumer- ja business-puolen auth-sessiot ovat täysin toisistaan riippumattomia — business-reitit käyttävät sb-biz-*-cookieta, consumer-reitit käyttävät normaalia sb-*-cookieta, ja molemmat voivat olla aktiivisina samanaikaisesti

**Verified:** 2026-06-12T00:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | lib/supabase-business.ts exports createBusinessServerClient and createBusinessBrowserClient, both using cookieOptions.name = 'sb-biz' | VERIFIED | File exists at lib/supabase-business.ts; grep confirms `cookieOptions.*sb-biz` returns 2, `export function` returns 2, `_bizBrowserClient` returns 4 |
| 2 | createBusinessBrowserClient() is a module-level singleton (_bizBrowserClient) | VERIFIED | `let _bizBrowserClient: ReturnType<typeof createBrowserClient> \| undefined` declared at module scope; if-guard pattern present at lines 11–20 |
| 3 | middleware.ts branches on /business/*: business branch uses cookieOptions.name='sb-biz', consumer branch has no cookieOptions | VERIFIED | middleware.ts lines 7–62 confirm isBusiness branching; business branch passes `cookieOptions: { name: 'sb-biz' }` (line 17); consumer branch has no cookieOptions |
| 4 | Unauthenticated /business/* requests redirect to /business/kirjaudu; /business/rekisteroidy and /business/kirjaudu excluded from guard | VERIFIED | middleware.ts lines 35–40 confirm both exclusions; redirect target is `/business/kirjaudu` |
| 5 | No DB queries in middleware | VERIFIED | grep for `.from(`, `supabaseAdmin`, `select` in middleware.ts returns only import lines — no query calls present |
| 6 | app/business/kirjaudu/page.tsx exists, uses createBusinessBrowserClient().auth.signInWithPassword(), redirects to /business on success, links to /business/rekisteroidy, no AuthModal import | VERIFIED | File verified line by line: `createBusinessBrowserClient` at line 6, `signInWithPassword` at line 27, `router.push('/business')` at line 35, `href="/business/rekisteroidy"` at line 111; no AuthModal in file |
| 7 | All /business/* RSC layouts call createBusinessServerClient(cookies()) and redirect to /business/kirjaudu | VERIFIED | app/business/[id]/layout.tsx and app/business/onboarding/layout.tsx both verified: createBusinessServerClient present, redirect('/business/kirjaudu') present, createServerSupabase absent |
| 8 | All /business/* client components use createBusinessBrowserClient(); no file imports createBrowserSupabase or createServerSupabase | VERIFIED | grep -r "createBrowserSupabase\|createServerSupabase" app/business/ returns 0 matches; createBusinessBrowserClient/createBusinessServerClient total: 31 matches across 11 files |
| 9 | Consumer pages (/, /profiili) are untouched — no business client imported | VERIFIED | grep for createBusinessBrowserClient/createBusinessServerClient in app/page.tsx and app/profiili/* returns 0 matches; lib/supabaseSSR.ts createBrowserSupabase export confirmed present |
| 10 | API routes in /api/business/* and /api/admin/* use supabaseAdmin.auth.getUser(token) — no session cookie client | VERIFIED | grep confirms supabaseAdmin.auth.getUser(token) pattern in all /api/business/* routes; 0 matches for createBrowserSupabase/createServerSupabase/createBusinessServerClient in api directories |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/supabase-business.ts` | Business Supabase client factory (createBusinessBrowserClient, createBusinessServerClient) | VERIFIED | 36 lines; both exports present; cookieOptions.name='sb-biz' in both clients; singleton pattern confirmed |
| `middleware.ts` | Path-conditional session refresh with business guard | VERIFIED | 70 lines; isBusiness branching at line 7; business branch with sb-biz cookieOptions; consumer branch without; redirect to /business/kirjaudu at line 40 |
| `app/business/kirjaudu/page.tsx` | Business login page using sb-biz-* namespace | VERIFIED | 120 lines; 'use client' at line 1; signInWithPassword; router.push('/business'); link to /business/rekisteroidy |
| `app/business/[id]/layout.tsx` | RSC auth guard for /business/[id]/* routes | VERIFIED | createBusinessServerClient(cookies()); redirect('/business/kirjaudu') |
| `app/business/onboarding/layout.tsx` | RSC auth guard for /business/onboarding/* routes | VERIFIED | createBusinessServerClient(cookies()); redirect('/business/kirjaudu') |
| `app/business/rekisteroidy/page.tsx` | Business registration page with business client, no AuthModal | VERIFIED | AuthModal: 0; authModalOpen: 0; createBusinessBrowserClient: 3; Link to /business/kirjaudu: 1 |
| `messages/fi.json` | Finnish i18n strings for business login page | VERIFIED | All 7 keys present under Business section: loginTitle="Kirjaudu yritystilille", loginCta, loggingIn, loginEmailPlaceholder, loginPasswordPlaceholder, noAccountLink, errorInvalidCredentials |
| `messages/en.json` | English i18n strings for business login page | VERIFIED | All 7 keys present under Business section: loginTitle="Sign in to business account" and 6 others |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| lib/supabase-business.ts | @supabase/ssr createServerClient | cookieOptions: { name: 'sb-biz' } | WIRED | Lines 28–28: `cookieOptions: { name: 'sb-biz' }` passed to createServerClient |
| lib/supabase-business.ts | @supabase/ssr createBrowserClient | cookieOptions: { name: 'sb-biz' } | WIRED | Lines 12–19: `cookieOptions: { name: 'sb-biz' }` passed to createBrowserClient |
| middleware.ts /business branch | createServerClient with sb-biz cookieOptions | inline construction | WIRED | middleware.ts line 17: `cookieOptions: { name: 'sb-biz' }` |
| middleware.ts guard | /business/kirjaudu redirect | NextResponse.redirect | WIRED | Line 40: `return NextResponse.redirect(new URL('/business/kirjaudu', request.url))` |
| app/business/kirjaudu/page.tsx | createBusinessBrowserClient | import from @/lib/supabase-business | WIRED | Line 6: import confirmed; called at line 26 in handleSubmit |
| app/business/kirjaudu/page.tsx | router.push('/business') | on null signInError | WIRED | Lines 28–35: `if (signInError) { ... return }` then `router.push('/business')` |
| app/business/[id]/layout.tsx | lib/supabase-business.ts | import createBusinessServerClient | WIRED | Line 3: import confirmed; called at line 6 |
| app/business/rekisteroidy/page.tsx | /business/kirjaudu | Next.js Link (replaces AuthModal button) | WIRED | Line 253: `<Link href="/business/kirjaudu">` |
| /api/business/* route handlers | supabaseAdmin.auth.getUser(token) | JWT Bearer Authorization header | WIRED | Confirmed in claim-paikka/route.ts line 11 and create-paikka/route.ts line 11; no session cookie client imports |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| fi.json Business.loginTitle value | `node -e "...console.log(f.Business.loginTitle)"` | "Kirjaudu yritystilille" | PASS |
| en.json Business.loginTitle value | `node -e "...console.log(f.Business.loginTitle)"` | "Sign in to business account" | PASS |
| TypeScript compilation | `npx tsc --noEmit` | exit 0, no output | PASS |
| No consumer client in app/business/* | `grep -r "createBrowserSupabase\|createServerSupabase" app/business/` | 0 matches | PASS |
| Business client count in app/business/* | `grep -r "createBusinessBrowserClient\|createBusinessServerClient" app/business/ \| wc -l` | 31 matches | PASS |
| cookieOptions.name='sb-biz' count in supabase-business.ts | `grep -c "cookieOptions.*sb-biz"` | 2 | PASS |
| sb-biz occurrences in middleware.ts | `grep -c "sb-biz" middleware.ts` | 3 | PASS |
| No DB queries in middleware | `grep -n "\.from\(\|supabaseAdmin" middleware.ts` | 0 matches | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AUTHSEP-01 | 39-01 | Business Supabase client factory with sb-biz-* cookie namespace | SATISFIED | lib/supabase-business.ts verified with both exports and cookieOptions.name='sb-biz' in both clients |
| AUTHSEP-02 | 39-04 | All /business/* RSC uses business server client | SATISFIED | Both RSC layouts (app/business/[id]/layout.tsx, app/business/onboarding/layout.tsx) confirmed migrated |
| AUTHSEP-03 | 39-04 | All /business/* client components use business browser client | SATISFIED | 0 matches for createBrowserSupabase in app/business/; 31 matches for business client |
| AUTHSEP-04 | 39-04 | rekisteroidy uses business client, no AuthModal | SATISFIED | AuthModal=0, createBusinessBrowserClient=3, Link to /business/kirjaudu=1 |
| AUTHSEP-05 | 39-02 | Middleware path-conditional session refresh | SATISFIED | middleware.ts verified with isBusiness branching, correct cookieOptions per branch, guard to /business/kirjaudu |
| AUTHSEP-06 | 39-03 | app/business/kirjaudu/page.tsx business login page | SATISFIED | Page verified: signInWithPassword via business client, router.push('/business'), link to /business/rekisteroidy |
| AUTHSEP-07 | 39-01 | TypeScript compiles cleanly across all modified files | SATISFIED | `npx tsc --noEmit` exits 0 with no output |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No TBD, FIXME, XXX, TODO, placeholder, stub, or hardcoded-empty anti-patterns found in any phase-39 modified file.

### Human Verification Required

#### 1. sb-biz-auth-token Cookie Name at Runtime

**Test:** Log in at /business/kirjaudu. Open browser DevTools > Application > Cookies.

**Expected:** A cookie named `sb-biz-auth-token` is set (not `sb-auth-token`). No consumer `sb-auth-token` cookie is created or modified by this login.

**Why human:** The `cookieOptions.name = 'sb-biz'` pattern is verified in code and the @supabase/ssr library documentation states it becomes the storageKey prefix. However, the actual cookie name produced at runtime requires a live browser session to confirm.

#### 2. Simultaneous Consumer and Business Sessions

**Test:** In the same browser: (1) log in to a consumer account at `/`, confirming `sb-auth-token` is set in DevTools. (2) Open `/business/kirjaudu` in the same tab and log in with a business account.

**Expected:** Both `sb-auth-token` (consumer) and `sb-biz-auth-token` (business) cookies are present simultaneously. Neither login invalidates or overwrites the other.

**Why human:** This is the core phase goal — cookie namespace isolation enabling coexistence. While the code architecture makes this mechanically correct, runtime cookie behavior requires browser-level confirmation.

#### 3. Consumer Routes Unaffected by Business-Only Session

**Test:** Log in only to the business account (no consumer login). Navigate to `/`, `/profiili`, and the venue listing pages.

**Expected:** Consumer routes render normally — no redirect to `/business/kirjaudu`, no authentication errors, listing page loads correctly.

**Why human:** The middleware consumer branch does not guard consumer routes (by design), but the absence of a consumer session must not break consumer UI. This requires a live request where only the sb-biz-* cookie is present.

#### 4. Middleware Guard Routes /business/[id] Correctly

**Test:** Clear all cookies. Navigate directly to a URL of the form `/business/123` (any existing business venue ID).

**Expected:** Browser is redirected to `/business/kirjaudu` (not to `/`).

**Why human:** The redirect target change from `/` to `/business/kirjaudu` is verified in the RSC layout code, but the middleware guard (which fires before RSC rendering) must also redirect to `/business/kirjaudu` for the nested `/business/[id]/*` paths. The combined middleware + RSC guard behavior under unauthenticated access needs runtime confirmation.

### Gaps Summary

No gaps found. All 10 must-have truths are VERIFIED against the codebase. The 4 human verification items above are behavioral runtime checks that cannot be automated via static analysis — they confirm the core phase goal (cookie namespace isolation) works as intended in a live browser session.

---

_Verified: 2026-06-12T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
