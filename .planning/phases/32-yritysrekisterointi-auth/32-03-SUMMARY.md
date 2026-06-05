---
phase: 32-yritysrekisterointi-auth
plan: "03"
subsystem: ui, auth
tags: [registration-form, business-redirect, client-component, supabase-auth, next-intl]
dependency_graph:
  requires:
    - 32-01 (Business i18n namespace — useTranslations('Business') keys)
    - 32-02 (/api/business/register Route Handler — JWT-verified POST endpoint)
  provides:
    - /business/rekisteroidy registration page (BIZ-01)
    - AuthModal business redirect check (BIZ-03)
  affects:
    - app/components/AuthModal.tsx (SIGNED_IN useEffect modified)
    - app/business/rekisteroidy/page.tsx (new)
tech_stack:
  added: []
  patterns:
    - "supabase.auth.signUp client-side + POST Route Handler with JWT — two-step registration pattern"
    - "async onAuthStateChange callback for SIGNED_IN event with business_accounts redirect check"
    - ".maybeSingle() for nullable single-row lookup (not .single() which throws PGRST116)"
key_files:
  created:
    - app/business/rekisteroidy/page.tsx
  modified:
    - app/components/AuthModal.tsx
decisions:
  - "mapBusinessError adapts AuthModal's mapError pattern — drops errorInvalidCredentials (not applicable on registration), keeps errorEmailInUse, errorWeakPassword, errorGeneric; errorAccountCreationFailed set explicitly on Route Handler failure"
  - "AuthModal SIGNED_IN callback declared async to allow await on business_accounts query (Pitfall 5 from RESEARCH.md)"
  - "Used .maybeSingle() not .single() to prevent PGRST116 error when regular user has no business_accounts row (Pitfall 4 from RESEARCH.md)"
  - "AuthModal locally mounted in registration page for sign-in link — no NavBar dependency (Open Question 2 from RESEARCH.md resolved)"
  - "No new imports added to AuthModal.tsx — router and createBrowserSupabase already in scope"
metrics:
  duration: "~3 min"
  completed: "2026-06-05"
  tasks_completed: 2
  files_changed: 2
---

# Phase 32 Plan 03: Registration Page & AuthModal Business Redirect Summary

## One-liner

Yritysrekisteroitymissivu /business/rekisteroidy (Client Component: signUp + JWT POST) ja AuthModal SIGNED_IN useEffect laajennus business_accounts-tarkistuksella ja ehdollisella router.push('/business')-ohjauksella.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create /business/rekisteroidy registration page | 9e39a3b | app/business/rekisteroidy/page.tsx |
| 2 | Extend AuthModal SIGNED_IN useEffect with business redirect check | d54588f | app/components/AuthModal.tsx |

## What Was Built

**Task 1 — /business/rekisteroidy registration page:**
Luotiin `app/business/rekisteroidy/page.tsx` 'use client' Client Componenttina. Sivu on itsenaisinen koko ruudun rekisteroitymislomake (ei NavBaria, ei modal-kuorta). Visuaalinen tyyli seuraa AuthModal-komponenttia: `.glass rounded-2xl p-6 w-full max-w-sm` paneeli, samat kenttaklassit ja painikeklassit. Lomakkeessa on kolme kenttaa: yritysnimi (type=text), sahkoposti (type=email, autoComplete=email) ja salasana (type=password, autoComplete=new-password). Lahetyskasikelija: (1) supabase.auth.signUp(), (2) jos onnistuu ja sessio saatavilla, POST /api/business/register Bearer-tokenilla, (3) onnistuessa router.push('/business'). Virheekasikelija mapBusinessError-funktiolla (kolme kategorioita: errorEmailInUse, errorWeakPassword, errorGeneric) plus errorAccountCreationFailed Route Handler -virheelle. AuthModal mountattu paikallisesti kirjaudu-sisaan-linkkia varten.

**Task 2 — AuthModal SIGNED_IN useEffect extension:**
Muokattiin AINOASTAAN `app/components/AuthModal.tsx`:n SIGNED_IN useEffect -lohkoa (rivit 77-88). onAuthStateChange-callback muutettiin asynciksi (kriittinen: ilman asyncia await sivuutetaan hiljaisesti). Kun SIGNED_IN-tapahtuma laukeaa: tehdaan kysely `business_accounts`-tauluun `.maybeSingle()`-metodilla (ei `.single()`, joka heittaisi PGRST116-virheen kun rivi puuttuu). Jos rivi loytyy: onClose() + router.push('/business'). Jos ei loydy: onSuccess?.(pendingPaikkaId ?? null) + onClose() — normaali kayttajavirta sailyy muuttumattomana. Ei uusia importteja. eslint-disable-kommentti sailyy. handleSubmit-signup-haara muuttumaton.

## Deviations from Plan

### Minor: Plan verification script string mismatch (non-blocking)

**Found during:** Task 1 automated verification
**Issue:** The plan's automated verification script checks for the string `'api/business/register'` (without leading slash). The file correctly uses `fetch('/api/business/register', ...)` which contains `/api/business/register` — the substring `'api/business/register'` is not present because the `'` before the URL is followed by `/`, not `a`. The URL with the leading slash is correct; the verification check string was missing the leading slash.
**Resolution:** Code is correct. The plan-level verification assertions 1 and 2 (from `<verification>` block) both pass (`true`). TypeScript reports no errors. Not fixed — plan spec discrepancy only, not a code defect.
**Impact:** None on functionality.

## Known Stubs

None. Both files contain real functional implementation logic. No placeholder data, empty returns, or TODO markers.

## Threat Flags

No new threat surface beyond what was planned and documented in the plan's threat model. All STRIDE threats (T-32-03-01 through T-32-03-05) handled per plan:
- T-32-03-01 mitigated: JWT sent in Authorization header; Route Handler (Plan 02) verifies before INSERT
- T-32-03-02 accepted: business_accounts query uses anon key + RLS (SELECT WHERE auth.uid() = user_id)
- T-32-03-03 mitigated: company_name trimmed client-side (required + trim); server trims + slices to 200 chars

## Self-Check: PASSED

- [x] `app/business/rekisteroidy/page.tsx` exists
- [x] File contains `'use client'`
- [x] File contains `supabase.auth.signUp`
- [x] File contains `api/business/register` (as substring of `/api/business/register`)
- [x] File contains `mapBusinessError`
- [x] File contains `errorAccountCreationFailed`
- [x] File contains `companyName`
- [x] File contains `authModalOpen`
- [x] File does NOT contain `supabaseAdmin`
- [x] `app/components/AuthModal.tsx` contains `async (event: AuthChangeEvent`
- [x] `app/components/AuthModal.tsx` contains `maybeSingle`
- [x] `app/components/AuthModal.tsx` contains `router.push('/business')`
- [x] `router.push('/business')` appears exactly once in AuthModal.tsx
- [x] Commit `9e39a3b` exists (Task 1)
- [x] Commit `d54588f` exists (Task 2)
- [x] TypeScript: `npx tsc --noEmit` reports no errors
- [x] Plan verification assertions 1 and 2 both return `true`
