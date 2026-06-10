---
phase: 35-admin-hyvaksyntajarjestelma
verified: 2026-06-10T16:30:00Z
status: passed
score: 7/7 must-haves verified
overrides_applied: 1
human_verification:
  - test: "Non-admin users receive HTTP 404 when navigating to /admin"
    expected: "A user without profiles.is_admin=true should see the Next.js 404 page when visiting /admin"
    why_human: "The implementation uses a Client Component that redirects to / instead of calling notFound(). The success criterion says 'muut saavat 404'. Whether a redirect is an acceptable substitute requires a developer decision."
    decision: "Redirect to / is acceptable — approved 2026-06-10"
---

# Phase 35: Admin-hyväksyntäjärjestelmä Verification Report

**Phase Goal:** Admin voi tarkistaa, hyväksyä tai hylätä yritystiliöinnit ja claim-pyynnöt /admin-sivulta. Sekä admin että yritys saavat asianmukaiset sähköposti-ilmoitukset Resend-palvelun kautta.
**Verified:** 2026-06-10T16:30:00Z
**Status:** passed
**Re-verification:** No — initial verification (UAT preceded this, gap-closure plans 35-10 and 35-11 were added after UAT)

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Uusi rekisteröityminen tai claim-pyyntö lähettää välittömästi ilmoituksen joona.orava@gmail.com-osoitteeseen | VERIFIED | `sendAdminNotificationEmail` imported and called in `claim-paikka/route.ts:83`, `create-paikka/route.ts:103`, `onboarding/submit/route.ts:122`, `reapply/route.ts:75`. `lib/email.ts` sends to `ADMIN_EMAIL ?? 'joona.orava@gmail.com'`. Resend package installed in node_modules. |
| 2 | /admin-sivulla näkyy lista odottavista hakemuksista — admin näkee yrityksen tiedot, haetun paikan ja ladatut kuvat | VERIFIED | `GET /api/admin/applications` queries `business_paikka_links` with `claim_status=pending`, joins `business_accounts(company_name, role_in_company, user_id)` and `liikuntapaikat(nimi, osoite, kaupunki)`. `AdminApplicationList.tsx` renders all these fields. `/admin/[id]` detail view includes `photo_urls, logo_url` via `GET /api/admin/applications/[id]`. |
| 3 | Admin voi hyväksyä hakemuksen yhdellä klikkauksella tai hylätä sen syy-tekstillä — molemmat päivittävät tilan välittömästi | VERIFIED | Approve button calls `POST /api/admin/approve` (sets `claim_status='approved'`, publishes `link_type='created'`). Reject reveals inline text input, calls `POST /api/admin/reject` (sets `claim_status='rejected'`, writes `rejection_reason`). Both filter the application from state immediately on `res.ok`. |
| 4 | Hyväksytty/hylätty yritys saa sähköpostivahvistuksen — hylätty saa myös syyn | VERIFIED | `approve/route.ts:77` calls `sendApprovalEmail` with company name and venue name. `reject/route.ts:70` calls `sendRejectionEmail` with company name, venue name, and `reason`. Both wrapped in non-critical try/catch. |
| 5 | /admin-sivu näkyy vain käyttäjälle jonka profiles.is_admin = true — muut saavat 404 | WARNING | Auth guard is present and functional: unauthenticated users get redirected to `/`, non-admin JWT calls return HTTP 403 from the API, causing the page to redirect to `/`. However, the success criterion says "muut saavat 404" — the implementation gives a **redirect to /** rather than an HTTP 404 page. See Human Verification Required section. |
| 6 | (Gap A) logo_url column added to liikuntapaikat; written on onboarding submit; selected in admin detail | VERIFIED | Migration `20260610000003_add_logo_url_to_liikuntapaikat.sql` exists with `ADD COLUMN IF NOT EXISTS logo_url TEXT NULL`. `onboarding/submit/route.ts:76` writes `logo_url: draft.media_urls?.logo ?? null`. `applications/[id]/route.ts:24` selects `logo_url` in the liikuntapaikat subselect. |
| 7 | (Gap B) POST /api/business/reapply exists; Hae uudelleen button calls it instead of opening ClaimSearchForm | VERIFIED | `app/api/business/reapply/route.ts` exists: JWT auth, finds rejected row by `(business_account_id, paikka_id, claim_status='rejected')`, UPDATEs to `claim_status='pending', rejection_reason=null`, sends admin notification. `app/business/page.tsx:133` calls `fetch('/api/business/reapply', ...)` inline in the button's async onClick. On success, `setVenueLinks(prev => prev.map(...))` updates that venue's status to pending without reload. |

**Score:** 6/7 truths verified (Truth 5 is WARNING — deviation from success criterion)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/email.ts` | Resend email helper with 3 exported functions | VERIFIED | All three functions present: `sendAdminNotificationEmail`, `sendApprovalEmail`, `sendRejectionEmail`. Uses `process.env.RESEND_API_KEY`, defaults to `joona.orava@gmail.com`. |
| `app/admin/page.tsx` | Admin list page with is_admin guard | VERIFIED (deviation) | Exists as Client Component (plan specified Server Component). Auth guard is functional via API returning 403. Non-admin gets redirect to `/` instead of 404. |
| `app/admin/AdminApplicationList.tsx` | Client component: approve/reject actions | VERIFIED | Full implementation. Both approve and reject handlers present with inline state update. |
| `app/admin/[id]/page.tsx` | Admin detail view | VERIFIED | Client Component fetching from `/api/admin/applications/[id]`. Shows applicant info, venue preview via `PaikkaKortti`, `DiagonaalKortti`, `PaikkaSheet`. |
| `app/api/admin/applications/route.ts` | GET list of pending applications | VERIFIED | JWT auth + is_admin check + pending query. |
| `app/api/admin/applications/[id]/route.ts` | GET single application detail | VERIFIED | JWT auth + is_admin check + full venue select including `logo_url`. Returns `businessEmail` from auth.users. |
| `app/api/admin/approve/route.ts` | POST approve action | VERIFIED | Double guard, updates `claim_status='approved'`, publishes venue for `link_type='created'`, sends approval email. |
| `app/api/admin/reject/route.ts` | POST reject action | VERIFIED | Double guard, updates `claim_status='rejected'` + `rejection_reason`, sends rejection email. |
| `app/api/business/reapply/route.ts` | POST reapply action | VERIFIED | JWT auth, find rejected row, UPDATE to pending, send admin notification. Returns 404 when no rejected row found. |
| `supabase/migrations/20260610000002_admin_columns.sql` | Add rejection_reason + role_in_company columns | VERIFIED | Both ALTER TABLE statements present. |
| `supabase/migrations/20260610000003_add_logo_url_to_liikuntapaikat.sql` | Add logo_url column | VERIFIED | Single `ADD COLUMN IF NOT EXISTS logo_url TEXT NULL` statement. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/admin/page.tsx` | `GET /api/admin/applications` | `fetch('/api/admin/applications', { headers: { Authorization: 'Bearer ' + token } })` | WIRED | Line 29; response written to `setApplications`. |
| `app/admin/[id]/page.tsx` | `GET /api/admin/applications/[id]` | `fetch('/api/admin/applications/${params.id}', ...)` | WIRED | Line 33; response written to `setLink`. |
| `AdminApplicationList.tsx` | `POST /api/admin/approve` | `fetch('/api/admin/approve', { method: 'POST', body: JSON.stringify({ link_id }) })` | WIRED | Line 34; filters application from state on success. |
| `AdminApplicationList.tsx` | `POST /api/admin/reject` | `fetch('/api/admin/reject', { method: 'POST', body: JSON.stringify({ link_id, reason }) })` | WIRED | Line 37; filters application from state on success. |
| `app/business/page.tsx` | `POST /api/business/reapply` | `fetch('/api/business/reapply', { method: 'POST', body: JSON.stringify({ paikka_id }) })` | WIRED | Line 133; `setVenueLinks(prev => prev.map(...))` on success. |
| `approve/route.ts` | `lib/email.ts:sendApprovalEmail` | `import { sendApprovalEmail } from '@/lib/email'` | WIRED | Line 3 import, line 77 call. |
| `reject/route.ts` | `lib/email.ts:sendRejectionEmail` | `import { sendRejectionEmail } from '@/lib/email'` | WIRED | Line 3 import, line 70 call. |
| `onboarding/submit/route.ts` | `lib/email.ts:sendAdminNotificationEmail` | `import { sendAdminNotificationEmail } from '@/lib/email'` | WIRED | Line 4 import, line 122 call. |
| `claim-paikka/route.ts` | `lib/email.ts:sendAdminNotificationEmail` | `import { sendAdminNotificationEmail } from '@/lib/email'` | WIRED | Line 3 import, line 83 call. |
| `create-paikka/route.ts` | `lib/email.ts:sendAdminNotificationEmail` | `import { sendAdminNotificationEmail } from '@/lib/email'` | WIRED | Line 3 import, line 103 call. |
| `reapply/route.ts` | `lib/email.ts:sendAdminNotificationEmail` | `import { sendAdminNotificationEmail } from '@/lib/email'` | WIRED | Line 3 import, line 75 call. |
| `onboarding/submit/route.ts` | `liikuntapaikat.logo_url` | `supabaseAdmin.from('liikuntapaikat').update({ logo_url: draft.media_urls?.logo ?? null })` | WIRED | Line 76. |
| `applications/[id]/route.ts` | `liikuntapaikat.logo_url` | select string contains `logo_url` | WIRED | Line 24. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `AdminApplicationList.tsx` | `applications` | `GET /api/admin/applications` → `business_paikka_links` WHERE `claim_status='pending'` | Yes — Supabase query with join | FLOWING |
| `app/admin/[id]/page.tsx` | `link` | `GET /api/admin/applications/[id]` → full `business_paikka_links` select + auth.users lookup | Yes — Supabase query + admin.getUserById | FLOWING |
| `app/business/page.tsx` (reapply button) | `venueLinks` state | `POST /api/business/reapply` → UPDATE `business_paikka_links` → optimistic `setVenueLinks` | Yes — real DB UPDATE + local state map | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED (requires running server and authenticated session — cannot verify admin JWT flow without live Supabase).

---

### Probe Execution

Step 7c: No probes defined or discoverable in this phase.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ADMIN-01 | 35-05-PLAN | Email notification on new claim/create/onboarding submission | SATISFIED | `sendAdminNotificationEmail` called in all three submission routes; `lib/email.ts` sends to admin email via Resend. |
| ADMIN-02 | 35-08-PLAN, 35-09-PLAN, 35-10-PLAN | /admin list + detail view with company info, venue, photos | SATISFIED | List in `AdminApplicationList.tsx`, detail in `app/admin/[id]/page.tsx` with `PaikkaKortti`/`DiagonaalKortti`/`PaikkaSheet` preview. `logo_url` included in select. |
| ADMIN-03 | 35-06-PLAN, 35-11-PLAN | Admin can approve or reject; rejected business can reapply | SATISFIED | `approve/route.ts` and `reject/route.ts` implement the actions. `reapply/route.ts` closes the reapply gap. "Hae uudelleen" button in `business/page.tsx` calls the new route. |
| ADMIN-04 | 35-06-PLAN | Business receives confirmation/rejection email | SATISFIED | `sendApprovalEmail` called in approve route; `sendRejectionEmail` with reason called in reject route. |
| ADMIN-05 | 35-08-PLAN | /admin protected by is_admin=true; others get 404 | PARTIAL | Guard exists and is functional. Non-admin users are redirected to `/` (via API 403 response), not shown a 404. Success criterion says "muut saavat 404". See Human Verification Required. |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/admin/page.tsx` | 1 | `'use client'` on admin page — plan specified Server Component | Info | Functional deviation: redirect-on-403 instead of `notFound()`. Auth data still server-guarded via API. |
| `app/admin/[id]/page.tsx` | 1 | `'use client'` on detail page — plan specified Server Component | Info | Same architectural deviation. Auth guard remains effective. |

No `TBD`, `FIXME`, or `XXX` debt markers found in phase-modified files.

---

### Human Verification Required

#### 1. /admin access control — redirect vs 404

**Test:** Log out (or use a non-admin account). Navigate to `/admin` directly.
**Expected per success criterion:** User should see the Next.js 404 page ("This page could not be found").
**Actual implementation:** The page is a Client Component. It calls `GET /api/admin/applications` which returns HTTP 403. The page then calls `router.replace('/')` — the user is redirected to the homepage, not shown a 404.
**Why human:** Whether a redirect-to-homepage is acceptable in place of a 404 is a product decision. Both prevent access to the admin data. The 404 communicates "this page doesn't exist for you"; the redirect communicates "you're not authorized". The success criterion wording ("muut saavat 404") is explicit.

**Decision options:**
- Accept deviation: redirect-to-/ is sufficient protection — add an override to VERIFICATION.md frontmatter.
- Require fix: convert `app/admin/page.tsx` back to a Server Component that calls `notFound()` for non-admin users (as originally planned in 35-08-PLAN.md), or add middleware-level redirect.

---

### Gaps Summary

No hard blockers found. All five core success criteria are implemented with one deviation:

Truth 5 ("muut saavat 404") is not precisely met — non-admin users receive a redirect to `/` rather than an HTTP 404 response. All admin data is still protected server-side (the API returns 403). The deviation is architectural (Client Component vs Server Component) and was a deliberate choice noted in the 35-08-SUMMARY.md ("Fixed by converting to client component + GET /api/admin/applications with JWT guard"). Whether this satisfies the letter of the success criterion requires developer confirmation.

All four UAT gaps from 35-UAT.md have been addressed:
- **Resend build error:** Package installed, `lib/email.ts` wired into all submission routes.
- **logo_url missing:** Migration created, write path added, admin API select updated.
- **Hae uudelleen broken:** New `POST /api/business/reapply` route created, button wired to it with optimistic state update.
- **is_admin database seed:** Documented as a manual Supabase dashboard step (not automatable).

---

_Verified: 2026-06-10T16:30:00Z_
_Verifier: Claude (gsd-verifier)_
