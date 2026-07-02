---
phase: 64-hallintaoikeuspyynn-t-dashboard-ui
reviewed: 2026-07-02T13:26:40Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - app/api/business/access-request/list/route.ts
  - app/api/business/access-request/remove/route.ts
  - app/api/business/register/route.ts
  - app/business/page.tsx
  - app/business/rekisteroidy/page.tsx
  - app/components/DiagonaalKortti.tsx
  - app/components/TeamManagementPopup.tsx
  - messages/en.json
  - messages/fi.json
  - supabase/migrations/20260702000000_business_accounts_display_name.sql
  - tests/api/access-request-list.test.ts
  - tests/api/access-request-remove.test.ts
  - tests/api/register.test.ts
findings:
  critical: 0
  warning: 5
  info: 3
  total: 8
status: issues_found
---

# Phase 64: Code Review Report

**Reviewed:** 2026-07-02T13:26:40Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Reviewed the hallintaoikeuspyynnöt ("team management") dashboard UI: the two new
Route Handlers (`access-request/list`, `access-request/remove`), the `register`
handler's invite-path additions, the dashboard page's D-02 visibility gate, the
`TeamManagementPopup`/`DiagonaalKortti` UI, translations, migration, and the
three new API test suites.

Server-side authorization in `list` and `remove` is solid: both independently
verify the JWT, re-derive the caller's identity from `supabaseAdmin.auth.getUser`
(never trusting a client-supplied id), and enforce the same two-part
venue-scoped + role='owner' check before touching any row. The hard
self-removal block in `remove` runs before any DB access, matching its own
documented intent. RLS history for the touched tables (`business_accounts`,
`business_paikka_links`) was cross-checked against prior migrations and is
consistent with the "self-scoped only, must use supabaseAdmin" comments in the
new route files.

No Critical/security-breaking defect was found in the reviewed files. There is
one real functional dead-end in the invite-recovery flow (`rekisteroidy`) that
can strand an interrupted invite-link signup, plus a stale-UI bug in
`TeamManagementPopup` (approving a request doesn't add the member to "Current
team" without closing/reopening the popup), an unguarded `Promise.all` in
`list/route.ts` that turns one bad identity lookup into a full 500 for the
whole team view, and a couple of smaller quality/robustness issues detailed
below.

## Warnings

### WR-01: Approving a pending request doesn't refresh the "Current team" list in the open popup

**File:** `app/components/TeamManagementPopup.tsx:117-143`
**Issue:** `handleApprove` only removes the row from `pendingRequests`
(`setPendingRequests(prev => prev.filter(r => r.id !== requestId))`) and calls
`onChanged?.()`. `onChanged` is wired in `app/business/page.tsx:417` to
`() => { checkState() }`, which re-fetches data for the *parent* dashboard
page only (venue links, D-02 gate summaries) — it does not re-run the popup's
own `load()` effect (`app/components/TeamManagementPopup.tsx:85-115`, which
only depends on `[open, paikkaId]`). The result: an owner who approves a
pending request sees it disappear from "Pending requests", but the newly
approved person never appears in "Current team" until the popup is closed and
reopened. This is a real, observable correctness gap in the core
approve-then-manage flow this phase delivers.
**Fix:** After a successful approve, also add the resolved member into local
`teamMembers` state (the `list` response already contains everything needed
via `pendingRequests[i].name/email`, or re-run `load()`), e.g.:
```ts
if (res.ok) {
  setPendingRequests(prev => prev.filter(r => r.id !== requestId))
  onChanged?.()
  // Refresh local team state too, not just the parent dashboard's gate summary:
  load()
}
```

### WR-02: Invite-link recovery redirect loses the invite context, stranding interrupted signups

**File:** `app/business/rekisteroidy/page.tsx:38-63`
**Issue:** `detectRecovery()` checks whether the caller already has a
`business_accounts` row and, if so, unconditionally does
`router.replace('/business')` (line 54) — ignoring `isInvitePath`/`paikkaId`
(computed at lines 19-21 from the same `paikka_id` query param that drives the
"happy path" redirect at line 129: `router.push(isInvitePath ?
'/business/liity?paikka_id=' + paikkaId : '/business')`). D-15's explicit
intent is that an invite-link signup "must round-trip back there so the
access request actually fires, instead of becoming the owner of a bogus
company" (comment at lines 16-18). But this only holds for the *first-time*
success path. If an invite-link user's `signUp` + `/api/business/register`
(invite branch) succeeds — creating their `business_accounts` row — but they
are interrupted before the follow-up `/business/liity?paikka_id=X` submission
completes (closed tab, crash, lost connection), then revisiting
`/business/rekisteroidy?paikka_id=X` (e.g. via the original invite link) hits
the "account already exists" branch and sends them to the generic `/business`
dashboard instead of resuming to `/business/liity?paikka_id=X`. Since their
`business_accounts.company_id` is still NULL and no access request was ever
submitted, they land on the generic "create/claim a venue" screen with no way
to resume joining the inviting venue's team short of contacting support.
**Fix:** Preserve invite context through the recovery redirect:
```ts
if (account) {
  router.replace(isInvitePath ? '/business/liity?paikka_id=' + paikkaId : '/business')
  return
}
```

### WR-03: Unhandled rejection in identity-resolution `Promise.all` fails the whole endpoint

**File:** `app/api/business/access-request/list/route.ts:92-101`
**Issue:**
```ts
await Promise.all(
  uniqueIds.map(async id => {
    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(id)
    authDataById.set(id, { ... })
  })
)
```
There is no try/catch around this block. If `supabaseAdmin.auth.admin.getUserById`
throws for even one id (network blip, transient admin-API error, or a
since-deleted auth user producing an error rather than `data.user === null`),
the whole `Promise.all` rejects and propagates out of the (non-try/catch-wrapped)
`GET` handler as an uncaught exception, producing an opaque framework-level 500
for the entire team-management view — pending requests and the whole "Current
team" list disappear together, even though only one identity lookup failed.
Contrast this with the frontend's own D-02 gate fetch
(`app/business/page.tsx:224-241`), which explicitly fails closed per-venue
rather than blowing up the whole dashboard.
**Fix:** Catch per-id failures and degrade gracefully (e.g. fall back to the
raw id as name/email null) instead of let one failure take down the request:
```ts
uniqueIds.map(async id => {
  try {
    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(id)
    authDataById.set(id, {
      email: authData?.user?.email ?? null,
      full_name: (authData?.user?.user_metadata?.full_name as string | undefined) ?? null,
    })
  } catch {
    authDataById.set(id, { email: null, full_name: null })
  }
})
```

### WR-04: D-02 visibility-gate fetch has no role check and fails silently for non-owner members

**File:** `app/business/page.tsx:217-244`
**Issue:** `approvedNotKeskenVenues` is derived purely from `claim_status ===
'approved'` on the current account's own `business_paikka_links` rows — it does
not check whether the current account's `role` is `'owner'`. The subsequent
per-venue fetch to `/api/business/access-request/list` is then issued for
*every* approved venue regardless of role. For a `role: 'member'` account this
call will always 403 server-side (the endpoint requires `role === 'owner'`,
see `access-request/list/route.ts:66-68`), and the failure is swallowed by the
generic `catch` at line 237-241, which returns `{ pendingCount: 0,
memberBeyondOwnerCount: 0 }` for *any* failure reason — both "I'm not allowed"
and "the network hiccuped" produce the exact same silent zero. This means (a)
member accounts unconditionally issue a doomed authorized fetch per approved
venue on every `checkState()` run, and (b) a genuine *owner* who hits a
transient error on this fetch has the "manage team" icon silently vanish with
no visual difference from "there is truly nothing pending," and no retry.
**Fix:** Gate the fetch itself on the caller's own role (fetched once, not
per-venue) so members skip the call entirely, and distinguish "no data yet /
transient error" from "confirmed zero" in the UI (e.g. a `null` vs `0` state)
so a real owner isn't silently denied the icon on a network blip.

### WR-05: Raw database error text returned to the client

**File:** `app/api/business/register/route.ts:82-86`, `:111-114`; `app/api/business/access-request/remove/route.ts:72-74`
**Issue:** Failure responses embed the raw Postgres/PostgREST error message
directly in the JSON body, e.g.:
```ts
return NextResponse.json(
  { error: 'companies insert failed', detail: companyError?.message },
  { status: 500 }
)
```
and
```ts
return NextResponse.json({ error: 'Delete failed', detail: error.message }, { status: 500 })
```
These can leak internal schema details (constraint names, column names, table
structure) to any authenticated caller who manages to trigger a 500. This
mirrors a pre-existing pattern elsewhere in the codebase, but it is worth
tightening for these newly added endpoints since they are exactly the kind of
write/delete path an attacker would probe.
**Fix:** Log `error.message` server-side (`console.error`) and return only the
generic `error` field to the client; drop `detail` from the response body.

## Info

### IN-01: `created_at` is fetched but unused, and pending requests have no defined order

**File:** `app/api/business/access-request/list/route.ts:71-76`
**Issue:**
```ts
const { data: pendingRequestsRaw } = await supabaseAdmin
  .from('business_access_requests')
  .select('id, requester_id, created_at')
  .eq('paikka_id', paikkaId)
  .eq('status', 'pending')
```
`created_at` is selected and typed on `PendingRequestRow` but never read
anywhere in the response mapping (`pendingRequestsResponse` only uses `id`,
`requester_id`→`requesterId`, and resolved `name`/`email`). Meanwhile there is
no `.order(...)` clause, so the order pending requests are returned/rendered
in is whatever Postgres happens to pick — typically insertion order in
practice, but not guaranteed. Either drop the unused column or use it to sort
(oldest-first is the natural UX for a request queue).
**Fix:** `.order('created_at', { ascending: true })` and keep `created_at` in
the response, or drop the column from the `select` if genuinely unneeded.

### IN-02: Unsafe type assertion on `claim_status`

**File:** `app/business/page.tsx:133`
**Issue:** `status: isKesken ? 'kesken' : (link.claim_status as 'approved' |
'rejected' | 'pending')` casts the DB-sourced string with `as` rather than
validating it. If `claim_status` is ever something else at runtime (schema
drift, a future status value), TypeScript won't catch the mismatch and
`DiagonaalKortti` will silently render the "pending" (amber) status pill as
its default fallback (`app/components/DiagonaalKortti.tsx:347-367`) — not a
crash, but a misleading status display with no signal that something is off.
**Fix:** Narrow with a runtime guard/lookup table instead of a bare `as`
assertion, or clamp unknown values to a distinct "unknown" style.

### IN-03: Same generic error copy used for both list-load failures and action failures

**File:** `app/components/TeamManagementPopup.tsx:105-106`, `:135-136`, `:164-165`, `:194-195`
**Issue:** `fetchError` (initial GET failure) and `actionError` (approve /
reject / remove failure) both render `t('teamActionError')` ("Something went
wrong. Please try again in a moment."). This is serviceable but doesn't tell
the owner whether the whole panel failed to load or a specific action they
just took failed — a small UX ambiguity, not a functional bug.
**Fix:** Consider a distinct `teamLoadError` key for the fetch-failure path if
this becomes user-facing feedback that matters (low priority).

---

_Reviewed: 2026-07-02T13:26:40Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
