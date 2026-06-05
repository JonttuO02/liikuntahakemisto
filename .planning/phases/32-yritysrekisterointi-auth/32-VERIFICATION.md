---
phase: 32-yritysrekisterointi-auth
verified: 2026-06-05T00:00:00Z
status: human_needed
score: 6/6 must-haves verified
overrides_applied: 0
re_verification: false
human_verification:
  - test: "Register a new business account via /business/rekisteroidy"
    expected: "Submitting yritysnimi + sähköposti + salasana creates an auth user and a business_accounts row (visible in Supabase dashboard) then redirects to /business"
    why_human: "Requires a live Supabase environment and browser interaction; cannot verify auth user creation and DB insert without running the app"
  - test: "Submit registration with an email already registered in Supabase Auth"
    expected: "Inline Finnish error 'Sähköpostiosoite on jo käytössä.' appears; no redirect occurs"
    why_human: "Requires live Supabase to return the 'User already registered' error string that mapBusinessError translates"
  - test: "Sign in via AuthModal with a business account email"
    expected: "After sign-in, modal closes and browser navigates to /business"
    why_human: "Requires a live session and real business_accounts row; the async maybeSingle() query result cannot be verified statically"
  - test: "Sign in via AuthModal with a regular (non-business) user email"
    expected: "Modal closes and user stays on current page; NO redirect to /business occurs"
    why_human: "Verifying the absence of /business redirect for regular users requires live auth state and the business_accounts query returning null"
  - test: "POST /api/business/register without Authorization header"
    expected: "Returns HTTP 401 with body { \"error\": \"Unauthorized\" }"
    why_human: "Requires a running dev server to curl-test the endpoint (the route logic is statically verified correct but the live 401 response needs a running server)"
---

# Phase 32: Yritysrekisteröinti & auth Verification Report

**Phase Goal:** Yritys pystyy luomaan tilin ja kirjautumaan sisään, jonka jälkeen se ohjataan suoraan hallintapaneeliin (Business registration form, JWT-verified Route Handler, and AuthModal business redirect so business users can register and sign in to /business)
**Verified:** 2026-06-05
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Yritys täyttää rekisteröintilomakkeen (yritysnimi, sähköposti, salasana) ja tili luodaan Supabase Auth -järjestelmään linkitettynä `business_accounts`-riviin | ✓ VERIFIED | `app/business/rekisteroidy/page.tsx` has 3-input form (text/email/password), calls `supabase.auth.signUp({email,password})`, then POSTs to `/api/business/register` with Bearer JWT; route.ts inserts into `business_accounts` using verified `user.id` |
| 2 | Yrityksen kirjautuessa olemassa olevalla tilillä se ohjataan automaattisesti `/business`-hallintapaneeliin eikä tavalliseen käyttäjänäkymään | ✓ VERIFIED | `AuthModal.tsx` SIGNED_IN useEffect is `async`, queries `business_accounts.select('user_id').eq('user_id', session.user.id).maybeSingle()`, and calls `router.push('/business')` when `bizRow` is truthy |
| 3 | Tavallinen käyttäjä ei ohjaudu `/business`-sivulle — ohjaus tapahtuu vain kun `business_accounts`-rivi on olemassa | ✓ VERIFIED | AuthModal else-branch calls `onSuccess?.(pendingPaikkaId ?? null); onClose()` when `bizRow` is null/undefined; `maybeSingle()` (not `.single()`) returns null rather than throwing PGRST116 when no row exists |

**Score: 6/6 must-haves verified** (3 ROADMAP + 3 PLAN-level truths all pass)

### Plan-Level Must-Have Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| P1 | Both fi.json and en.json contain a 'Business' namespace with all 14 required keys | ✓ VERIFIED | `node` count: fi=14, en=14; position confirmed Auth < Business < Map in both files; all key values match plan spec |
| P2 | GET /business renders a stub page with Finnish or English dashboard heading + coming-soon body copy | ✓ VERIFIED | `app/business/page.tsx` is async Server Component (no 'use client'), calls `getTranslations('Business')`, renders `t('dashboardTitle')` in h1 and `t('dashboardComingSoon')` in p; intentional stub per D-07/D-08 |
| P3 | POST /api/business/register with valid JWT verifies caller, inserts business_accounts, rolls back on failure | ✓ VERIFIED | route.ts: extracts Bearer token, calls `supabaseAdmin.auth.getUser(token)`, uses `user.id` for INSERT (not body), calls `deleteUser(user.id)` on INSERT failure, returns `{ok:true}` on success |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `messages/fi.json` | Finnish Business namespace (14 keys) | ✓ VERIFIED | 14 keys present; Auth < Business < Map ordering confirmed; all values match plan spec |
| `messages/en.json` | English Business namespace (14 keys) | ✓ VERIFIED | 14 keys present; Auth < Business < Map ordering confirmed; all values match plan spec |
| `app/business/page.tsx` | Stub dashboard page (Server Component) | ✓ VERIFIED | Async Server Component; no 'use client'; imports `getTranslations` from `next-intl/server`; renders dashboardTitle and dashboardComingSoon |
| `app/api/business/register/route.ts` | POST Route Handler with JWT verification + business_accounts INSERT + deleteUser rollback | ✓ VERIFIED | Exports `POST`; imports `supabaseAdmin` from `@/lib/supabaseAdmin.server`; all 7 security/logic checks pass |
| `app/business/rekisteroidy/page.tsx` | Client Component registration form | ✓ VERIFIED | 'use client'; 3-input form; signUp + POST with Bearer JWT; error mapping; AuthModal mounted locally; router.push('/business') on success |
| `app/components/AuthModal.tsx` | SIGNED_IN useEffect extended with async business_accounts check | ✓ VERIFIED | Callback is `async`; maybeSingle() used; router.push('/business') appears exactly once; eslint-disable comment preserved; handleSubmit unchanged |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/business/page.tsx` | `messages/fi.json` | `getTranslations('Business')` | ✓ WIRED | `getTranslations('Business')` present in page.tsx; Business namespace confirmed in fi.json |
| `app/api/business/register/route.ts` | `lib/supabaseAdmin.server.ts` | `import { supabaseAdmin }` | ✓ WIRED | Import on line 2; `supabaseAdmin.server.ts` exports `supabaseAdmin` via `createClient` with SERVICE_ROLE_KEY |
| `app/api/business/register/route.ts` | `business_accounts` table | `supabaseAdmin.from('business_accounts').insert` | ✓ WIRED | Line 31-32: `.from('business_accounts').insert({ user_id: user.id, company_name })` |
| `app/business/rekisteroidy/page.tsx` | `/api/business/register` | `fetch('/api/business/register', { method: 'POST', headers: { Authorization } })` | ✓ WIRED | Lines 65-72: fetch with Bearer token and company_name body |
| `app/components/AuthModal.tsx` | `business_accounts` table | `.from('business_accounts').select('user_id').eq(...).maybeSingle()` | ✓ WIRED | Lines 85-89 in SIGNED_IN useEffect; async callback confirmed |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `app/business/page.tsx` | `t('dashboardTitle')`, `t('dashboardComingSoon')` | `getTranslations('Business')` from fi.json/en.json | Yes — static i18n, intentional stub per D-07/D-08 | ✓ FLOWING (intentional stub — Phase 36 replaces) |
| `app/business/rekisteroidy/page.tsx` | `error`, `loading`, form inputs | `supabase.auth.signUp()` response + fetch response from route.ts | Yes — real Supabase auth + server-side DB insert | ✓ FLOWING |
| `app/components/AuthModal.tsx` (SIGNED_IN) | `bizRow` | `supabase.from('business_accounts').select().maybeSingle()` | Yes — real RLS-protected DB query via anon key | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| route.ts JWT verification present | `node` source assertion | All 7 checks PASS | ✓ PASS |
| route.ts uses verified user.id | grep `user_id: user.id` | Found line 32 | ✓ PASS |
| route.ts deleteUser rollback | grep `deleteUser` | Found line 36 | ✓ PASS |
| AuthModal async callback | `node` source assertion | All 6 checks PASS | ✓ PASS |
| rekisteroidy page completeness | `node` source assertion | All 17 checks PASS | ✓ PASS |
| Business namespace key count | `node -e "Object.keys(...).length"` | fi=14, en=14 | ✓ PASS |
| Business namespace ordering | `node` position check | Auth < Business < Map in both files | ✓ PASS |
| No forbidden imports in route.ts | grep for `next/headers`, `@supabase/ssr` | None found | ✓ PASS |
| No supabaseAdmin in client component | grep rekisteroidy page | Not found | ✓ PASS |
| router.push('/business') count in AuthModal | grep -c | 1 (exactly once) | ✓ PASS |
| All 5 commits exist in git | `git log` | e2cf710, 47c57ee, 3ffc88b, 9e39a3b, d54588f all present | ✓ PASS |

### Probe Execution

No probe scripts declared or applicable for this phase. Step 7c: SKIPPED (UI/auth phase — no runnable probe scripts).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BIZ-01 | 32-01, 32-02, 32-03 | Yritys voi rekisteröityä palveluun erillisellä lomakkeella (yritysnimi, sähköposti, salasana) | ✓ SATISFIED | `/business/rekisteroidy` has 3-field form; Route Handler creates auth user + business_accounts row with JWT verification and atomicity rollback |
| BIZ-03 | 32-01, 32-03 | Kirjautunut yritys ohjataan automaattisesti `/business`-hallintapaneeliin | ✓ SATISFIED | AuthModal SIGNED_IN useEffect queries business_accounts and redirects with router.push('/business') only when bizRow is found; regular users unaffected |

No orphaned requirements: REQUIREMENTS.md maps only BIZ-01 and BIZ-03 to Phase 32.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/business/page.tsx` (whole file) | — | Intentional stub content (dashboardComingSoon) | ℹ️ Info | Design-intentional per D-07/D-08; Phase 36 (BIZPANEL-01--03) replaces this with real dashboard. Not a code defect. |

No `TBD`, `FIXME`, `XXX`, or unresolved debt markers found in any phase-modified file. The `placeholder:text-` CSS class occurrence in rekisteroidy page is a Tailwind CSS class for input placeholder styling — not a stub indicator.

### Human Verification Required

All automated checks pass. The following behaviors require a live Supabase environment and browser session to verify end-to-end:

#### 1. Business Registration Flow (Happy Path)

**Test:** Navigate to `/business/rekisteroidy`, fill in yritysnimi, sähköposti, and salasana with a new account, submit.
**Expected:** Auth user is created in Supabase Auth, `business_accounts` row is inserted (visible in Supabase dashboard), browser redirects to `/business` showing "Tervetuloa hallintapaneeliin".
**Why human:** Requires live Supabase environment; auth user creation and DB insert cannot be verified statically.

#### 2. Duplicate Email Error

**Test:** Submit the registration form with an email already registered in Supabase Auth.
**Expected:** Inline Finnish error "Sähköpostiosoite on jo käytössä." appears; no redirect occurs; loading spinner stops.
**Why human:** Requires Supabase to return the 'User already registered' string that `mapBusinessError` maps to `errorEmailInUse`.

#### 3. AuthModal Business Redirect (Business User)

**Test:** Open AuthModal and sign in with credentials of a user who has a `business_accounts` row.
**Expected:** After sign-in, modal closes and browser navigates to `/business`.
**Why human:** Requires a live session and real business_accounts row; the async maybeSingle() query result cannot be verified statically.

#### 4. AuthModal No Redirect (Regular User)

**Test:** Open AuthModal and sign in with credentials of a regular (non-business) user.
**Expected:** Modal closes; user stays on current page; NO redirect to `/business` occurs.
**Why human:** Verifying absence of /business redirect requires live auth state and confirming the business_accounts query returns null.

#### 5. Unauthenticated Route Handler (401 Gate)

**Test:** `curl -X POST http://localhost:3000/api/business/register -H "Content-Type: application/json" -d '{"company_name":"Test"}' -w "\n%{http_code}"`
**Expected:** HTTP 401 with body `{"error":"Unauthorized"}`.
**Why human:** Requires a running dev server; the route logic is verified correct in static analysis but live 401 behavior needs a running server to confirm.

### Gaps Summary

No gaps found. All must-have truths are verified in the codebase. The 5 human verification items above are behavioral/integration checks requiring a live Supabase environment — they are not evidence of missing implementation. All source-level assertions pass.

---

_Verified: 2026-06-05_
_Verifier: Claude (gsd-verifier)_
