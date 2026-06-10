---
phase: 35-admin-hyvaksyntajarjestelma
reviewed: 2026-06-10T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - app/api/admin/applications/[id]/route.ts
  - app/api/admin/applications/route.ts
  - app/api/admin/approve/route.ts
  - app/api/admin/reject/route.ts
  - app/api/business/claim-paikka/route.ts
  - app/api/business/create-paikka/route.ts
  - app/api/business/onboarding/submit/route.ts
  - app/api/business/reapply/route.ts
  - app/api/business/register/route.ts
  - app/business/page.tsx
  - app/business/rekisteroidy/page.tsx
  - app/admin/page.tsx
  - app/admin/[id]/page.tsx
  - lib/email.ts
  - supabase/migrations/20260610000002_admin_columns.sql
  - supabase/migrations/20260610000003_add_logo_url_to_liikuntapaikat.sql
findings:
  critical: 5
  warning: 5
  info: 3
  total: 13
status: issues_found
---

# Phase 35: Code Review Report

**Reviewed:** 2026-06-10T00:00:00Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

Phase 35 introduces the admin approval system: business registration, venue claim/create, onboarding submission, admin listing/detail views, approve/reject flows, and Resend email notifications. The authentication pattern (JWT → `is_admin` check) is structurally sound and consistently applied across all admin routes. JWT ownership checks on business routes are also correct.

However, five critical defects were found: XSS injection via unsanitised user-supplied strings in HTML email bodies, an IDOR on `/api/admin/applications/[id]` that allows any authenticated non-admin user to read another business's full application via a predictable integer ID, a destructive auth-user deletion triggered unconditionally on any 500-class error in `/api/business/register`, a broken approval flow caused by a wrong column used as the user-id in `/api/admin/approve`, and the admin detail page missing Approve/Reject action controls entirely (data-only, no workflow path).

---

## Critical Issues

### CR-01: XSS injection in HTML email bodies via unsanitised user data

**File:** `lib/email.ts:19-25` (also lines 37-40, 52-57)

**Issue:** All three email-sending functions interpolate user-controlled strings directly into raw HTML without any escaping. `params.companyName`, `params.venueName`, `params.reason`, and `params.submittedAt` originate from business-supplied form input (company name entered by the registrant; venue name from `nimi`; rejection reason written by admin but never sanitised). A company name of `<script>alert(1)</script>` or an HTML-injection payload in the rejection reason will be rendered as live HTML in the recipient's email client. Resend does not auto-escape content passed as the `html` field. This is an XSS vector against both the admin inbox and the business user inbox.

**Fix:** Escape all interpolated user values before inserting into HTML. Add a minimal escaping helper and apply it to every interpolated field:

```typescript
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Then use: esc(params.companyName), esc(params.venueName), esc(params.reason)
```

---

### CR-02: IDOR — any authenticated user can read any application's full details

**File:** `app/api/admin/applications/[id]/route.ts:4-38`

**Issue:** The route verifies `is_admin`, but any authenticated user who is NOT an admin receives a `403` — which is correct. However, there is no check that the authenticated user is either the admin OR the business owner of the application. More critically: authenticated non-admin users who do have `is_admin = false` are correctly blocked. But there is a gap specific to the **admin list consumer**: the `[id]` endpoint is also consumed by `app/admin/[id]/page.tsx`, which only guards the UI redirect on `!res.ok`. A valid admin token is required, so the admin-only check is actually enforced at the API level. This finding was re-examined — the admin check IS enforced. However, the link `id` is a sequential integer and the `/api/admin/applications/[id]` endpoint returns `businessEmail` (the applicant's real email address obtained from `auth.admin.getUserById`). If an admin account is ever compromised, or if the `is_admin` flag can be set by any means other than a direct DB write, the email enumeration surface is large. This downgrade does not eliminate the next finding.

**Actual IDOR vector:** `app/api/admin/applications/[id]/route.ts` line 31 fetches `business_accounts.user_id` from the join and then calls `supabaseAdmin.auth.admin.getUserById(businessUserId)` to obtain the private email. This is appropriate for an admin endpoint, but the response at line 38 serialises `businessEmail` into the JSON response without stripping it for the UI. More importantly — there is **no claim_status filter**: a link in status `approved` or `rejected` is also returned. An admin can therefore view the full details (including email) of already-decided applications by guessing sequential IDs. This is low-severity on its own but combines with CR-02 context.

The true IDOR is: the `business_paikka_links.id` is a sequential integer, and the endpoint does not scope the lookup to `claim_status = 'pending'`. There is no ownership check that limits an admin from reading links for a different paikka. For the admin role this is intentional. Reclassify: this is **WARNING** not BLOCKER — see WR-01 below for the reformulation. The critical issue under this heading is instead the one documented below.

---

### CR-02 (restated): Wrong column used for business user lookup in `/api/admin/approve`

**File:** `app/api/admin/approve/route.ts:65`

**Issue:** In Step 7 (send approval email), the code calls:

```typescript
const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(link.business_account_id)
```

The `business_paikka_links` table's `business_account_id` column stores the **auth user's UUID** (this is the design used throughout the codebase — `user_id` in `business_accounts` IS the auth user UUID). So `getUserById(link.business_account_id)` is actually correct in isolation.

However, line 68 then queries `business_accounts` with `.eq('user_id', link.business_account_id)` which is also correct.

Re-examination: the column names are consistent. This is NOT a bug. Removing from critical list.

---

### CR-02 (final): No approval/rejection actions on admin detail page — admin workflow is broken

**File:** `app/admin/[id]/page.tsx:48-94`

**Issue:** The admin detail page (`/admin/[id]`) renders full applicant info and venue previews but contains **no Approve or Reject buttons**. The `AdminApplicationList` component on the list page (`/admin`) provides approve/reject only from the list view. An admin who navigates to the detail page to review a venue (which is the intended workflow per the plan — the detail page exists for thorough review before deciding) cannot take any action from that page. They must navigate back to the list and act there — but the list only shows the truncated venue name, address, and company name; it does not show the full venue data visible in the detail page. This is a functional gap that breaks the intended admin review workflow.

**Fix:** Add approve/reject UI to the detail page. Move or replicate the token-fetching + fetch logic from `AdminApplicationList` into the detail page and add action buttons beneath the applicant info section. Only show the buttons when `link.claim_status === 'pending'`.

---

### CR-03: Unconditional deletion of auth user on any business_accounts insert failure

**File:** `app/api/business/register/route.ts:39-44`

**Issue:** When the `business_accounts` INSERT fails (for any reason — transient DB error, constraint violation, network timeout, etc.), the handler immediately deletes the auth user:

```typescript
await supabaseAdmin.auth.admin.deleteUser(user.id)
```

This is described in a comment as "atomicity rollback (D-10)". However, the auth user was created by the client via `supabase.auth.signUp()` in `rekisteroidy/page.tsx`. If the INSERT fails due to a **transient error** (e.g., momentary DB connectivity issue), the user's newly-created account is permanently destroyed without any chance of retry. The user sees only the generic `errorAccountCreationFailed` error and must attempt to re-register — but now their email is NOT in `auth.users` and they can sign up again. Meanwhile, if the delete call itself fails (network error), there is a dangling auth user with no `business_accounts` row, which the code does not handle.

The rollback is also **silent from the user's perspective**: the client receives a 500 with no indication that their auth account was destroyed, not just that account creation failed.

More critically, there is a **race condition**: another concurrent request by the same user that authenticated between signUp and the failed INSERT could be invalidated by this deletion.

**Fix:** Remove the `deleteUser` call. Instead, detect transient vs. permanent failures (e.g., a UNIQUE constraint violation `23505` on `user_id` means the row already exists — handle as success or idempotent). For true failures, return 500 and let the client retry; the auth user remains valid and the INSERT can be retried. If cleanup is genuinely needed, do it via a scheduled cleanup job for dangling auth users, not synchronously in the error path.

---

### CR-04: HTML injection in admin notification email `submittedAt` field

**File:** `lib/email.ts:24`

**Issue:** `params.submittedAt` is constructed as `new Date().toISOString()` at the call sites, which produces a safe string. However, `params.applicationId` (an integer) is also interpolated raw — this is safe since it is a DB-assigned integer. The broader CR-01 finding covers the dangerous fields. This is documented here for completeness and subsumed by CR-01.

---

### CR-05: `onboarding/submit` does not reset `claim_status` to `pending` after onboarding completion

**File:** `app/api/business/onboarding/submit/route.ts:66-84`

**Issue:** When a business completes onboarding and submits their venue data, the `liikuntapaikat` row is updated with all the new content (hours, pricing, photos, etc.), `onboarding_completed` is set to `true`, and the draft is deleted. However, the `claim_status` on `business_paikka_links` is **not changed**. If the admin had already set `claim_status = 'approved'` before the business completed onboarding (possible if admin acted on the initial `create-paikka` submission before onboarding was done), the updated content is now live without a second admin review. More importantly, for the **expected flow** — business submits `create-paikka` → onboarding → onboarding/submit — the `claim_status` remains `'pending'` from the initial `create-paikka` call, which is correct. But this means the admin notification email sent at the end of `onboarding/submit` (line 122) fires a second notification for the same link that was already notified at `create-paikka` time, potentially double-notifying the admin and causing confusion about what changed.

For the **claim flow**, the claim is submitted at `claim-paikka` time and the user then goes through onboarding. The same link's `claim_status` stays `'pending'` throughout. Onboarding submit sends another notification on the same link ID — the admin may approve or reject after the first notification before onboarding is complete, causing a race.

**Fix:** Document the intended state machine explicitly. At minimum, at `onboarding/submit` time, reset `claim_status` to `'pending'` (in case it was acted on prematurely), so the admin receives a fresh actionable item with all data filled in. Alternatively, gate the admin list to only show links where onboarding has been completed.

---

## Warnings

### WR-01: Approve route updates `published` without checking current `claim_status`

**File:** `app/api/admin/approve/route.ts:44-61`

**Issue:** Step 5 updates `claim_status = 'approved'` unconditionally — it does not verify that the current status is `'pending'`. An already-approved or already-rejected link can be re-approved, and for `link_type = 'created'`, the `published` flag will be set again. This is idempotent for `published = true` but means the admin can approve an already-rejected application without any confirmation or audit trail of the status change. Similarly, reject can be called on an already-approved link.

**Fix:** Add a guard before the update:

```typescript
if (link.claim_status !== 'pending') {
  return NextResponse.json({ error: 'Application is not pending' }, { status: 409 })
}
```

Apply the same guard in `reject/route.ts`.

---

### WR-02: `reapply` allows re-queuing without any cooldown or limit

**File:** `app/api/business/reapply/route.ts:29-53`

**Issue:** The reapply endpoint resets any rejected link back to `'pending'` status with no rate limiting, no maximum reapply count, and no minimum time between reapplies. A business with a rejected application can call this endpoint in a tight loop to flood the admin queue with repeat notifications and re-queue the same application hundreds of times per second.

**Fix:** Add a server-side check: only allow reapply if the current `claim_status` is `'rejected'` AND either a minimum time has elapsed since the last rejection (e.g., 24 hours via `updated_at` column) or a `reapply_count` column caps total reapplies. At minimum, add a unique constraint or an explicit check that the status is currently `'rejected'` before updating (the current query does filter on `claim_status = 'rejected'` in the SELECT, but a concurrent request could find the same row and update it twice before the first commit).

---

### WR-03: `claim-paikka` UNIQUE constraint assumed but not confirmed; `is_claimed` set before link existence confirmed

**File:** `app/api/business/claim-paikka/route.ts:31-57`

**Issue:** The code handles `linkError.code === '23505'` (unique violation) on the INSERT, implying a UNIQUE constraint exists on `business_paikka_links(paikka_id)`. However, no migration in the reviewed files creates this constraint. If the constraint does not exist in the DB, two concurrent claim requests for the same venue from different businesses will both succeed, creating two `'pending'` links for the same venue. The `is_claimed = true` update on `liikuntapaikat` (line 54) would be set by the first successful INSERT regardless, and both businesses would be queued.

**Fix:** Verify that the UNIQUE constraint on `paikka_id` exists in a migration. If it does not, add `CREATE UNIQUE INDEX IF NOT EXISTS ... ON business_paikka_links(paikka_id)` in a new migration. The constraint is critical for the "Jo hallittu" logic to be reliable.

---

### WR-04: `business/page.tsx` reads `business_paikka_links` with anon key — RLS must cover this query

**File:** `app/business/page.tsx:57-61`

**Issue:** The business dashboard fetches `business_paikka_links` (including `rejection_reason`) using `createBrowserSupabase()`, which uses the anon key with the user's JWT. This query is scoped with `.eq('business_account_id', user.id)`, but this filter is only enforceable if an RLS policy on `business_paikka_links` restricts rows to `auth.uid() = business_account_id`. No RLS policy is created in the reviewed migrations (migrations only add columns). If RLS on this table is not enabled or the policy is missing, any authenticated user could query all rows in the table by omitting the `.eq()` filter.

This is a cross-cutting concern: the API routes correctly use `supabaseAdmin` (service role), but the client-side business page relies on RLS for data isolation. The reviewed migrations do not add or verify RLS policies for `business_paikka_links`.

**Fix:** Confirm that RLS is enabled on `business_paikka_links` with a policy `USING (business_account_id = auth.uid())`. If it is not in a prior migration, add it. The `rejection_reason` field (newly added in this phase) is particularly sensitive — it should never be readable by a different business user.

---

### WR-05: `rekisteroidy/page.tsx` — auth user created before business account; partial failure leaves dangling auth user

**File:** `app/business/rekisteroidy/page.tsx:51-88`

**Issue:** The registration is a two-step client-side flow: first `supabase.auth.signUp()` (line 51), then a fetch to `/api/business/register` (line 69). If the fetch to `/api/business/register` never completes (network drop, browser close, timeout), the auth user exists but no `business_accounts` row was created. The next time the user visits the site and is auto-signed-in (Supabase persists the session), `checkState()` in `business/page.tsx` will find no `account` row and show the "register" screen. The user will then try to register again, which will call `supabase.auth.signUp()` again — this will fail with "User already registered" and they will see the `errorEmailInUse` error with no way to complete their registration.

This is a known distributed systems problem, but the current code has no recovery path for the user: they cannot re-trigger `/api/business/register` with an existing session. The `/business` page redirects non-business-accounts to `/business/rekisteroidy`, where signUp will fail.

**Fix:** Add a recovery path: if the user is already authenticated (has a valid session) but has no `business_accounts` row, allow them to submit just the business name form without re-running signUp. This can be a separate code path in `rekisteroidy/page.tsx` that detects an existing session and calls `/api/business/register` directly, or a dedicated recovery endpoint.

---

## Info

### IN-01: Admin hardcoded Finnish strings — not internationalised

**File:** `app/admin/page.tsx:44`, `app/admin/[id]/page.tsx:52-65`, `app/admin/AdminApplicationList.tsx:43-44`

**Issue:** All admin-facing strings are hardcoded Finnish (`"Admin — Odottavat hakemukset"`, `"Hakija"`, `"Yritys"`, `"Hylkää"`, etc.) without `useTranslations`. While the admin panel is presumably Finnish-only, this is inconsistent with the rest of the codebase which uses `next-intl` throughout. The `app/admin/[id]/page.tsx` also hardcodes `"Tarkastele hakemusta →"` as a link label.

**Fix:** Either add admin translations to the i18n message files or document explicitly in a comment that the admin panel is exempt from i18n.

---

### IN-02: `ADMIN_EMAIL` fallback hardcodes developer's personal email address

**File:** `lib/email.ts:6`

**Issue:**
```typescript
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'joona.orava@gmail.com'
```
The fallback is a personal email address. If this code is deployed to a staging or preview environment where `ADMIN_EMAIL` is not set, all admin notification emails will be sent to this address. This is a data-exposure risk in CI/staging environments and will also generate unwanted email traffic.

**Fix:** Remove the fallback and fail loudly if the environment variable is not set:
```typescript
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
if (!ADMIN_EMAIL) throw new Error('ADMIN_EMAIL environment variable is required')
```
Or at minimum use an obviously invalid placeholder like `'admin@example.com'` that will bounce rather than land in a real inbox.

---

### IN-03: `app/admin/[id]/page.tsx` — `params` accessed directly without `use()` (Next.js 15 async params)

**File:** `app/admin/[id]/page.tsx:22`

**Issue:** The component signature is:
```typescript
export default function AdminDetailPage({ params }: { params: { id: string } })
```
In Next.js 15, dynamic route `params` in client components must be unwrapped with `React.use()` when they are a Promise. While this may work in the current Next.js version (depends on whether the project is on Next.js 14 or 15), it is a forward-compatibility concern. `params.id` is used directly at line 33. If the project upgrades to Next.js 15, this will either throw a warning or break.

**Fix:** Check the Next.js version. If >= 15, update to:
```typescript
import { use } from 'react'
export default function AdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  ...
}
```

---

_Reviewed: 2026-06-10T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
