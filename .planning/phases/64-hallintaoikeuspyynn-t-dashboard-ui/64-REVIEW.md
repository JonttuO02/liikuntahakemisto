---
phase: 64-hallintaoikeuspyynn-t-dashboard-ui
reviewed: 2026-07-02T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - app/api/business/access-request/list/route.ts
  - app/api/business/access-request/remove/route.ts
  - app/api/business/register/route.ts
  - app/business/page.tsx
  - app/business/rekisteroidy/page.tsx
  - app/components/DiagonaalKortti.tsx
  - app/components/TeamManagementPopup.tsx
  - lib/teamManagement.test.ts
  - lib/teamManagement.ts
  - messages/en.json
  - messages/fi.json
  - supabase/migrations/20260702000000_business_accounts_display_name.sql
  - tests/api/access-request-list.test.ts
  - tests/api/access-request-remove.test.ts
  - tests/api/register.test.ts
findings:
  critical: 1
  warning: 9
  info: 4
  total: 14
status: issues_found
---

# Phase 64: Code Review Report

**Reviewed:** 2026-07-02T00:00:00Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

This is a full refreshed review of Phase 64's cumulative file set (plans 64-01
through the 64-05 gap-closure plan), including the newest additions
(`lib/teamManagement.ts`, `lib/teamManagement.test.ts`, and the updated
`TeamManagementPopup.tsx`). The 64-05 gap-closure plan did fix the previously
reported "approve doesn't refresh Current team without reopening the popup"
defect — `handleApprove` now does a correct, tested optimistic local update via
`pendingRowToTeamMember`, verified against the real approve endpoint's hardcoded
`role: 'member'`.

Server-side authorization in `list`/`remove`/`approve` is fundamentally sound:
each independently re-verifies the JWT, never trusts a client-supplied id, and
enforces the same venue-scoped + `role='owner'` check before touching data. The
hard self-removal block runs before any DB access as documented.

One concrete Critical defect was found: the `display_name` migration's stated
purpose — letting an owner identify a *pending requester* by name — is not
actually wired up; only approved team members get the resolved name. Several
previously-reported issues (invite-recovery redirect losing context, the D-02
visibility gate firing regardless of role and failing silently, raw DB error
text leaking to clients, an unguarded identity-resolution `Promise.all`) remain
unresolved in the current code and are restated below along with new findings
from the 64-05 additions.

## Critical Issues

### CR-01: Pending access requests never resolve `display_name` — defeats the stated purpose of the migration

**File:** `app/api/business/access-request/list/route.ts:71-76,103-108`

**Issue:** `business_accounts.display_name` was added specifically so an owner
can "identify who is requesting access / who is on the team, instead of a bare
user_id or email" (`supabase/migrations/20260702000000_business_accounts_display_name.sql:1-5`,
and `TeamManagementPopup.tsx:23-27` repeats the same claim). The
`business_access_requests` query that produces `pendingRequestsRaw` selects only
`id, requester_id, created_at` — no join to `business_accounts` — and the
mapping explicitly passes `undefined` for `displayNameFromDb`:

```ts
const { data: pendingRequestsRaw } = await supabaseAdmin
  .from('business_access_requests')
  .select('id, requester_id, created_at')   // no business_accounts join
  .eq('paikka_id', paikkaId)
  .eq('status', 'pending')
...
const pendingRequestsResponse = await Promise.all(
  pendingRequests.map(async r => {
    const { name, email } = await resolveIdentity(r.requester_id, undefined, authDataById)
    ...
```

`resolveIdentity`'s fallback chain (`displayNameFromDb ?? authData?.full_name ?? authData?.email ?? id`)
therefore falls straight to the auth user's OAuth `full_name` or email.
Invite-link employees never set `user_metadata.full_name` — they only submit
`display_name` via `app/business/rekisteroidy/page.tsx`'s invite form, which is
written to `business_accounts.display_name` by `app/api/business/register/route.ts:55-64`.
So a pending requester is always shown by email (or raw id), never by the name
they entered at signup. `app/api/business/access-request/submit/route.ts:33-52`
requires a `business_accounts` row (hence a `display_name`, if set) to exist
*before* a request can even be submitted, so the data is available — it's simply
never fetched here. `tests/api/access-request-list.test.ts`'s "returns pending
requests" test encodes this gap as expected behavior (`name: 'req1@example.com'`),
so the suite doesn't catch it.

**Fix:** Join `business_accounts(display_name)` on the pending-requests query
(mirroring the `teamMembersRaw` query directly below it) and feed it into
`resolveIdentity`:

```ts
const { data: pendingRequestsRaw } = await supabaseAdmin
  .from('business_access_requests')
  .select('id, requester_id, created_at, business_accounts:requester_id(display_name)')
  .eq('paikka_id', paikkaId)
  .eq('status', 'pending')
...
const { name, email } = await resolveIdentity(
  r.requester_id,
  r.business_accounts?.display_name,
  authDataById
)
```
(Confirm the exact FK-based join syntax Supabase infers for `business_access_requests.requester_id → business_accounts.user_id` in this schema.)

## Warnings

### WR-01: No top-level error handling in any of the three Route Handlers; the identity-resolution `Promise.all` is a concrete failure mode

**File:** `app/api/business/access-request/list/route.ts` (whole `GET`, esp. lines 92-101), `app/api/business/access-request/remove/route.ts` (whole `POST`), `app/api/business/register/route.ts` (whole `POST`)

**Issue:** Every Supabase call in these handlers is awaited at the top level
with no surrounding `try/catch` — the only `try/catch` blocks wrap
`request.json()` parsing. The clearest concrete instance:

```ts
await Promise.all(
  uniqueIds.map(async id => {
    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(id)
    authDataById.set(id, { ... })
  })
)
```

If `getUserById` throws for even one id (network blip, transient admin-API
error), the whole `Promise.all` rejects and propagates out of the
non-try/catch-wrapped `GET` handler as an uncaught exception — Next.js returns
its own generic error response instead of the JSON `{ error }` contract every
other failure path in these files uses. That breaks `res.json()` parsing on the
client (`TeamManagementPopup.tsx`, `app/business/rekisteroidy/page.tsx`) and,
in the `list` endpoint's case, takes down the *entire* team view (both pending
requests and current team) because of a single failed identity lookup.

**Fix:** Wrap each handler body in a top-level `try/catch` returning a generic
`500` JSON error; additionally, catch per-id failures inside the `Promise.all`
map and degrade gracefully (fall back to id/null) instead of letting one lookup
fail the whole request.

### WR-02: Venue-scoped owner-authorization logic is duplicated verbatim across three routes

**File:** `app/api/business/access-request/list/route.ts:47-68`, `app/api/business/access-request/remove/route.ts:34-60`, `app/api/business/access-request/approve/route.ts:36-61`

**Issue:** The exact same two-query check (approved `business_paikka_links` row
for `(paikka_id, business_account_id=user.id)`, then `business_accounts.role ===
'owner'`) is copy-pasted in three files, each restating the same rationale in
its own comment. Any future correction to this rule has to be applied in three
places, and the copies can already be seen drifting slightly in wording/variable
naming even though behavior is currently identical.

**Fix:** Extract a shared helper, e.g. `async function assertApprovedOwner(userId: string, paikkaId: number)`, in a `lib/` module and call it from all three routes.

### WR-03: Several Supabase queries silently discard `error`, turning DB failures into misleading 403/empty responses

**File:** `app/api/business/access-request/list/route.ts:48-54,60-64,71-76,80-85`; `app/api/business/access-request/remove/route.ts:39-45,52-56`

**Issue:** Calls such as:

```ts
const { data: ownerLink } = await supabaseAdmin
  .from('business_paikka_links')
  .select('business_account_id')
  ...
  .maybeSingle()

if (!ownerLink) {
  return NextResponse.json({ error: 'Forbidden: not an approved owner of this venue' }, { status: 403 })
}
```

discard `error` entirely. If the query fails for an infrastructure reason
(connection drop, RLS misconfiguration, timeout) rather than "no matching row,"
even a legitimate owner receives a `403` that has nothing to do with their
authorization, making the real failure far harder to diagnose than a `500` with
`error.message` would be. `submit/route.ts` in the same directory already does
this correctly (`if (accountError) return ... 500 ...`) — these routes should
follow the same pattern.

**Fix:** Check and surface `error` on every destructured Supabase call, returning a `500` with `error.message` before falling through to the "not found"/"forbidden" branch.

### WR-04: Removing a team member doesn't clean up their `business_accounts.role`/`company_id`

**File:** `app/api/business/access-request/remove/route.ts:67-77`

**Issue:** `POST /remove` deletes only the `business_paikka_links` row scoping
the member to this specific venue. It never checks whether the removed user has
any remaining approved venue links, nor resets `business_accounts.role` (set to
`'member'`) or `company_id` (set to the owner's company) that were written by
`approve/route.ts:90-93` when access was originally granted. Since one invite
currently maps to exactly one venue in this flow, the common case after removal
is a `business_accounts` row still claiming `role: 'member'` and
`company_id: <company>` for a user with zero venue links — an orphaned
membership state. `submit/route.ts`'s D-09 guard (line 54: "account already has
a company — cannot request access to another venue's company") will then
permanently block that removed user from requesting access to any other
venue/company without a manual DB fix.

**Fix:** After a successful delete, check whether the removed user has any
other approved `business_paikka_links` rows; if none remain, reset
`business_accounts.company_id` to `null` (and reconsider `role`) so they can
register or accept a new invite elsewhere.

### WR-05: `TeamManagementPopup` action handlers don't guard against a stale response after a fast venue switch

**File:** `app/components/TeamManagementPopup.tsx:103-196`

**Issue:** The `load()` effect (lines 71-101) correctly guards against stale
writes with a `cancelled` flag keyed to `[open, paikkaId]`. `handleApprove`,
`handleReject`, and `handleConfirmRemove` (lines 103-196) have no equivalent
guard — they unconditionally call `setPendingRequests`/`setTeamMembers`/
`setActionError` once their `fetch` resolves, regardless of whether `paikkaId`
has since changed. Because `teamPopupPaikkaId` in `app/business/page.tsx` can be
set directly to a new venue while the popup is already open (`onManageTeam={setTeamPopupPaikkaId}`),
a slow approve/reject/remove response for venue A can land after venue B's list
has already loaded and mutate venue B's state with venue-A-specific rows/ids.

**Fix:** Capture `paikkaId` at the start of each handler and skip the
`setState` calls if it no longer matches the current `paikkaId` prop when the
fetch resolves — the same pattern already used by `load()`.

### WR-06: `DiagonaalKortti`'s bookmark button isn't guarded against `dashboardActions`, unlike the map button

**File:** `app/components/DiagonaalKortti.tsx:369-378` (guarded) vs `379-387` (unguarded) vs `347-367` (status pill)

**Issue:** The "show on map" button is explicitly guarded with `hasCoords &&
!dashboardActions` (line 369) so it never renders in the dashboard variant. The
bookmark toggle right below it has no such guard:

```tsx
{onToggleTodo && (
  <button
    onClick={...}
    className="absolute bottom-3 right-3 z-20 w-7 h-7 glass-btn rounded-full ..."
  >
```

This is the exact same absolute position (`bottom-3 right-3 z-20`) used by the
dashboard status pill (`dashboardActions && <span className="absolute bottom-3 right-3 z-20 ...">`,
lines 347-367). No current caller passes both `onToggleTodo` and
`dashboardActions` together, so this doesn't manifest today, but nothing in the
props/types prevents a future caller from doing so, and the two elements would
then visually collide.

**Fix:** Guard the bookmark button the same way the map button is guarded: `{onToggleTodo && !dashboardActions && (...)}`.

### WR-07: Invite-link recovery redirect loses the invite context, stranding interrupted signups

**File:** `app/business/rekisteroidy/page.tsx:38-63`

**Issue:** `detectRecovery()` checks whether the caller already has a
`business_accounts` row and, if so, unconditionally does `router.replace('/business')`
(line 54) — ignoring `isInvitePath`/`paikkaId` (computed at lines 19-21 from the
same `paikka_id` query param that drives the "happy path" redirect at line 129:
`router.push(isInvitePath ? '/business/liity?paikka_id=' + paikkaId : '/business')`).
D-15's explicit intent is that an invite-link signup "must round-trip back
there so the access request actually fires, instead of becoming the owner of a
bogus company" (comment at lines 16-18) — but that only holds on the
first-time success path. If an invite-link user's `signUp` +
`/api/business/register` (invite branch) succeeds — creating their
`business_accounts` row — but they are interrupted before the follow-up
`/business/liity?paikka_id=X` submission completes (closed tab, crash, lost
connection), revisiting `/business/rekisteroidy?paikka_id=X` (e.g. via the
original invite link) hits the "account already exists" branch and sends them
to the generic `/business` dashboard instead of resuming to
`/business/liity?paikka_id=X`. Their `business_accounts.company_id` is still
`NULL` and no access request was ever submitted, so they land on the generic
"create/claim a venue" screen with no way to resume joining the inviting
venue's team short of contacting support.

**Fix:**
```ts
if (account) {
  router.replace(isInvitePath ? '/business/liity?paikka_id=' + paikkaId : '/business')
  return
}
```

### WR-08: D-02 visibility-gate fetch has no role check and fails silently for non-owner members

**File:** `app/business/page.tsx:217-244`

**Issue:** `approvedNotKeskenVenues` is derived purely from `claim_status ===
'approved'` on the current account's own `business_paikka_links` rows — it does
not check whether the account's `role` is `'owner'`. The per-venue fetch to
`/api/business/access-request/list` then fires for every approved venue
regardless of role. For a `role: 'member'` account this call will always `403`
server-side (`access-request/list/route.ts:66-68` requires `role === 'owner'`),
and the failure is swallowed by the generic `catch` at lines 237-241, which
returns `{ pendingCount: 0, memberBeyondOwnerCount: 0 }` for *any* failure
reason. This means (a) member accounts unconditionally issue a doomed
authorized fetch per approved venue on every `checkState()` run, and (b) a
genuine owner who hits a transient error on this fetch has the "manage team"
icon silently vanish with no visual difference from "there is truly nothing
pending," and no retry.

**Fix:** Gate the fetch on the caller's own role (fetched once, not per-venue)
so members skip the call entirely, and distinguish "no data yet / transient
error" from "confirmed zero" (e.g. `null` vs `0`) so a real owner isn't
silently denied the icon on a network blip.

### WR-09: Raw database error text returned to the client

**File:** `app/api/business/register/route.ts:82-87,111-114`; `app/api/business/access-request/remove/route.ts:72-74`

**Issue:** Failure responses embed the raw Postgres/PostgREST error message
directly in the JSON body:

```ts
return NextResponse.json(
  { error: 'companies insert failed', detail: companyError?.message },
  { status: 500 }
)
```
```ts
return NextResponse.json({ error: 'Delete failed', detail: error.message }, { status: 500 })
```

These can leak internal schema details (constraint names, column names, table
structure) to any authenticated caller who triggers a 500. This mirrors a
pre-existing pattern elsewhere in the codebase, but is worth tightening on
these newly-added write/delete endpoints — exactly the kind of path an
attacker would probe for schema information.

**Fix:** Log `error.message` server-side (`console.error`) and return only the generic `error` field to the client; drop `detail` from the response body.

## Info

### IN-01: `created_at` is fetched but unused, and pending requests have no defined order

**File:** `app/api/business/access-request/list/route.ts:15-19,71-76`

**Issue:** `created_at` is selected and typed on `PendingRequestRow` but never
read anywhere in the response mapping (only `id`, `requester_id`→`requesterId`,
and resolved `name`/`email` are used). There is also no `.order(...)` clause,
so the order pending requests are returned/rendered in is whatever Postgres
happens to pick — typically insertion order in practice, but not guaranteed.

**Fix:** `.order('created_at', { ascending: true })` and keep `created_at` in the response, or drop the column from `select` if genuinely unneeded.

### IN-02: Unsafe type assertion on `claim_status`

**File:** `app/business/page.tsx:133`

**Issue:** `status: isKesken ? 'kesken' : (link.claim_status as 'approved' |
'rejected' | 'pending')` casts the DB-sourced string with `as` rather than
validating it. If `claim_status` is ever something else at runtime (schema
drift, a future status value), TypeScript won't catch the mismatch and
`DiagonaalKortti` silently renders the "pending" (amber) status pill as its
default fallback (`app/components/DiagonaalKortti.tsx:347-367`) — not a crash,
but a misleading status display with no signal that something is off.

**Fix:** Narrow with a runtime guard/lookup table instead of a bare `as` assertion.

### IN-03: `.slice(0, N)` truncation can split UTF-16 surrogate pairs

**File:** `app/api/business/register/route.ts:25,35,42`

**Issue:** `company_name.trim().slice(0, 200)`, `role_in_company...slice(0, 100)`,
and `display_name...slice(0, 100)` truncate by UTF-16 code unit, not Unicode
code point. Free text ending exactly at the cutoff with an astral-plane
character (e.g. certain emoji) could be split into an unpaired surrogate.
Low real-world impact for business names/roles.

**Fix:** If this matters, truncate with `Array.from(str).slice(0, N).join('')` or a grapheme-aware helper instead of raw `.slice()`.

### IN-04: `resolveIdentity` is declared `async` with no internal `await`

**File:** `app/api/business/access-request/list/route.ts:21-30`

**Issue:** `resolveIdentity` is marked `async` and called with `await`, but its
body performs no asynchronous work — it's pure synchronous logic wrapped in an
unnecessary Promise. Not a bug, just avoidable indirection.

**Fix:** Drop `async`/`await` on this function and its call sites, or leave a comment noting it's intentionally async for future extensibility.

---

_Reviewed: 2026-07-02T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
