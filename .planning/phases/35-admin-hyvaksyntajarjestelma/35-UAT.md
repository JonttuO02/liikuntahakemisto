---
status: complete
phase: 35-admin-hyvaksyntajarjestelma
source: [35-01-SUMMARY.md, 35-02-SUMMARY.md, 35-03-SUMMARY.md, 35-04-SUMMARY.md, 35-05-SUMMARY.md, 35-06-SUMMARY.md, 35-07-SUMMARY.md, 35-08-SUMMARY.md, 35-09-SUMMARY.md]
started: 2026-06-10T15:00:00Z
updated: 2026-06-10T20:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Admin Page — Access Control
expected: Navigate to /admin as a non-admin user (or while logged out). Non-admin users get a 404 page. Unauthenticated users are redirected to /. Only a user with is_admin=true in the profiles table can access the page.
result: pass
note: Fixed by converting to client component + GET /api/admin/applications with JWT guard

### 2. Admin Page — Pending Applications List
expected: Navigate to /admin as an admin user. The page shows a list of pending business applications with columns for company name, venue name, application type (Claim/New venue), and submission date. If no pending applications exist, the empty state "Ei odottavia hakemuksia." is shown.
result: pass

### 3. Admin Page — Approve Application
expected: On the /admin page, clicking the Approve button on a pending application calls POST /api/admin/approve. On success the application disappears from the list. No page reload required — the list updates inline.
result: pass

### 4. Admin Page — Reject Application
expected: Clicking the Reject button on a pending application reveals an inline text input for the rejection reason. After typing a reason and clicking Confirm, the application calls POST /api/admin/reject and disappears from the list. The reject flow does not require a page reload.
result: pass

### 5. Admin Detail View — Application Details
expected: Clicking "View details" (or a link) on a pending application navigates to /admin/[id]. The detail page shows: applicant info (company name, role, email), venue section (name, address, sport type, description, phone, booking link, pricing), a photo grid (if photos were uploaded), and a back link ← to /admin.
result: issue
reported: "images and preview show now, but logo is missing. Same preview components as onboarding last step visible."
severity: minor

### 6. Business Registration — Role Dropdown
expected: Open /business/rekisteroidy. The registration form includes a "Rooli yrityksessä" dropdown (between company name and email fields) with a placeholder and 4 options: Omistaja, Johtaja, Markkinointi, Muu. The dropdown is required. Submitting the form sends role_in_company in the POST body.
result: pass

### 7. Business Panel — Rejection Reason Display
expected: In the /business panel, a venue whose claim_status is 'rejected' shows the rejection reason text in muted small font below the venue name, along with a "Hae uudelleen →" button. Clicking the button opens the venue search/claim form to reapply.
result: issue
reported: "I checked the test profile that had rejected application and the reapply button didnt work"
severity: major

### 8. Admin Notification Email
expected: When a business user completes the claim, create-venue, or onboarding/submit flow, an email notification is sent to joona.orava@gmail.com with the company name, venue name, and application type. The email is non-critical — it should not block the user action if it fails.
result: issue
reported: "Build Error: Module not found: Can't resolve 'resend' in lib/email.ts. Import trace: app/api/business/claim-paikka/route.ts"
severity: blocker

## Summary

total: 8
passed: 5
issues: 3
pending: 0
skipped: 0
blocked: 0
gaps_fixed: 3

## Gaps

- truth: "Admin user with is_admin=true can access /admin; non-admin gets 404; unauthenticated gets redirect to /"
  status: failed
  reason: "User reported: Im logged in as joona.orava@gmail.com user. All of those scenarios redirected me to /"
  severity: blocker
  test: 1
  root_cause: "profiles row for joona.orava@gmail.com does not have is_admin=true. Code guard is correct — database flag was never seeded. Fix: UPDATE profiles SET is_admin=true WHERE user_id=(SELECT id FROM auth.users WHERE email='joona.orava@gmail.com')"
  artifacts:
    - path: "app/admin/page.tsx"
      issue: "Guard logic correct — is_admin check at line 18 works as designed; database value missing"
  missing:
    - "Set is_admin=true for joona.orava@gmail.com in Supabase profiles table"
  debug_session: ""

- truth: "App compiles and claim/create/onboarding routes work without build errors"
  status: failed
  reason: "User reported: Build Error — Module not found: Can't resolve 'resend' in lib/email.ts. Import trace: app/api/business/claim-paikka/route.ts"
  severity: blocker
  test: 8
  root_cause: "resend package was added to package.json inside a git worktree (plan 35-03) but npm install was never run in the main working directory. Fixed by running npm install in project root."
  artifacts:
    - path: "lib/email.ts"
      issue: "imports resend which was absent from node_modules"
    - path: "package.json"
      issue: "resend ^6.12.4 present in dependencies but not installed"
  missing:
    - "npm install (DONE — resend now installed)"
  debug_session: ""

- truth: "Logo displays in admin detail view and PaikkaSheet preview"
  status: failed
  reason: "User reported: logo is missing in the admin detail view"
  severity: minor
  test: 5
  root_cause: "logo_url column never added to liikuntapaikat table (no migration). onboarding/submit/route.ts does not write logo_url. Pre-existing gap from phase 34."
  artifacts:
    - path: "supabase/migrations/"
      issue: "No migration adds logo_url to liikuntapaikat"
    - path: "app/api/business/onboarding/submit/route.ts"
      issue: "logo_url not included in liikuntapaikat UPDATE"
  missing:
    - "Migration: ALTER TABLE liikuntapaikat ADD COLUMN IF NOT EXISTS logo_url TEXT NULL"
    - "Update onboarding/submit to write logo_url: draft.media_urls?.logo ?? null"
    - "Add logo_url to /api/admin/applications/[id] select"
  debug_session: ""

- truth: "Hae uudelleen button in /business panel opens claim form and allows reapplying for rejected venue"
  status: failed
  reason: "User reported: I checked the test profile that had rejected application and the reapply button didnt work"
  severity: major
  test: 7
  root_cause: "ClaimSearchForm shows rejected venue as 'JO HALLITTU' (is_claimed=true) and blocks re-selection. Inserting a new business_paikka_links row fails with 409 unique constraint. Reapply must UPDATE the existing rejected row to claim_status=pending, not INSERT a new one."
  artifacts:
    - path: "app/components/ClaimSearchForm.tsx"
      issue: "handleClaim calls POST /api/business/claim-paikka (INSERT) — fails with 409 for already-claimed venues"
    - path: "app/api/business/claim-paikka/route.ts"
      issue: "Only handles INSERT, no UPDATE path for reapply"
  missing:
    - "POST /api/business/reapply route: find existing rejected link by paikka_id, UPDATE claim_status=pending, rejection_reason=null, send admin notification"
    - "Hae uudelleen button should call /api/business/reapply directly (not show ClaimSearchForm)"
  debug_session: ""

- truth: "Claim flow: admin approval required before onboarding is accessible"
  status: deferred
  reason: "User expected two-gate approval (approve claim, then approve after onboarding). Current design allows immediate onboarding after claiming. Design decision deferred to a dedicated future phase."
  severity: major
  test: n/a
  root_cause: "ClaimSearchForm.handleClaim() redirects to /business/onboarding immediately on success. Phase 35 plan only specified one approval gate (after onboarding submit). Two-gate flow (approve claim → onboarding → approve final) requires redesign of claim_status state machine."
  missing:
    - "DEFERRED: Plan a dedicated phase for two-gate approval with per-venue business permissions"
  debug_session: ""
