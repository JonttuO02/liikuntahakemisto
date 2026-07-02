# Phase 64: Hallintaoikeuspyynnöt — dashboard-UI - Research

**Researched:** 2026-07-02
**Domain:** Internal feature extension — Next.js 14 App Router dashboard UI + Supabase service-role Route Handlers + RLS-scoped Postgres. No new external technology.
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Pending-requests entry point (ACCESS-04)**
- **D-01:** One icon button on the `DiagonaalKortti` dashboard `dashboardActions` controls panel (e.g. a `Users`/`UserPlus` icon from `lucide-react`, matching Phase 63's icon conventions) opens a single popup. This is the ONE combined "team management" entry point — not a separate icon for requests vs. team.
- **D-02:** The icon/popup is shown whenever the venue has pending requests and/or team members beyond the owner (i.e., relevant state exists to manage).
- **D-03:** The popup has two sections: "Pending requests" (rows with requester identity + inline Approve/Reject buttons) and "Current team" (rows with member identity + a remove button, see Team & removal UI below).
- **D-04:** Per the REQUIREMENTS.md Out-of-Scope list, an in-app notification badge/bell system for pending requests is explicitly NOT wanted — email (Phase 60) is deemed sufficient for alerting. This icon+popup is the in-dashboard list ACCESS-04 requires, not a global notification system; do not build a nav-level unread counter.

**Requester/member identification — new name field (small scope extension)**
- **D-05:** `business_accounts` has NO personal-name column (`company_name` was dropped entirely in Phase 59's `20260625000000_companies_role_rls.sql` — only `companies.name`, the *company's* name, remains). To show a real name (not just email) in the pending-requests and team lists, Phase 64 ALSO adds a name-collection input to the invite-link signup flow (`app/business/liity` or wherever that signup path lives) plus a new `business_accounts` column (exact naming, e.g. `display_name`/`requester_name`, left to planner). **This is a confirmed deliberate expansion beyond pure dashboard-UI — the user approved it explicitly after being shown the scope-creep tradeoff (it touches Phase 60's deferred "polished signup-via-invite-link onboarding UX"). Do not redirect this back to "defer" during planning/research — it's locked.**
- **D-06:** The full polished signup-via-invite-link onboarding UX (Phase 60's original deferred item) is NOT in scope — only the minimal name field needed for identification. A richer onboarding screen for that flow stays deferred.
- **D-07:** Displaying another user's email still requires a service-role Route Handler (mirrors `admin/approve`'s JWT-verify + `supabaseAdmin` pattern) — RLS cannot join `auth.users` for other users' rows. The name field (D-05) reduces reliance on email for display but doesn't eliminate the need for service-role fetches for the popup's data.

**Team & removal UI (ACCESS-07)**
- **D-08:** Team management lives in the SAME popup as pending requests (D-03) — not a separate icon/popup.
- **D-09:** "Current team" rows list all `business_paikka_links` rows for that `paikka_id` beyond the requester's own row — i.e., every member with approved access to that specific venue, joined to `business_accounts.role` to distinguish owner from member. No RLS SELECT policy currently allows an owner to read other members' `business_paikka_links` rows (self-scoped only) — Phase 64 needs a service-role Route Handler for this list (or a new RLS SELECT policy; researcher should evaluate which is more consistent — Phase 60's D-05 precedent favors service-role for sensitive cross-account reads/writes over new RLS).
- **D-10:** Removing a sub-manager requires a confirm-dialog step before the DELETE fires (no undo — the removed member would need to re-request access). Matches the destructive-action caution pattern used elsewhere in the app.
- **D-11:** No email notification on removal — silent DB update. The removed member discovers it via RLS blocking their next access attempt, or their own dashboard/UI reflecting the change on next load. This deliberately diverges from Phase 60's approve/reject-decision emails (user's explicit choice, not an oversight).
- **D-12:** No removal backend exists yet (confirmed via codebase scout — no DELETE RLS policy, no Route Handler). New Route Handler must: JWT-verify caller, confirm caller is `role='owner'` AND holds an approved `business_paikka_links` row for that `paikka_id` (venue-scoped, matching the existing approve/reject authorization shape), guard against removing the owner's own row (ACCESS-07 hard-block, backend-enforced regardless of UI state — see D-14), then delete/downgrade the target member's `business_paikka_links` row for that venue.

**Reject interaction detail**
- **D-13:** One-click reject in the dashboard popup — no reason text field in the UI. `rejection_reason` (column already exists on `business_access_requests` since Phase 60) stays `null` for all Phase 64 dashboard-triggered rejections. The requester's decision email (`sendAccessRequestDecisionEmail`, Phase 60) will show no reason for this path — accepted tradeoff for UI simplicity.

**Owner self-protection UX (ACCESS-07)**
- **D-14:** The owner's own row IS shown in the "Current team" list (e.g. labeled "(Sinä) Omistaja" or similar — exact copy left to planner), with its remove icon visibly disabled/grayed out — not omitted from the list. This makes the protection explicit and visible in the UI, on top of the backend hard-block (D-12) which is the actual enforcement mechanism (defense-in-depth: UI disables it, backend refuses it even if somehow bypassed).

### Claude's Discretion
- Exact icon choice for the combined team-management entry point (D-01) — e.g. `Users`, `UserPlus`, `UserCog` from `lucide-react`, matching existing DiagonaalKortti icon sizing/style (`w-7 h-7 rounded-full`, `stopPropagation`/`preventDefault` click guards per Phase 63's established pattern).
- Exact column name for the new `business_accounts` name field (D-05) — e.g. `display_name`, `requester_name`, `contact_name`.
- Whether the new team-list/removal read (D-09) uses a new RLS SELECT policy or a service-role Route Handler — flagged for researcher to evaluate against Phase 60's D-05 precedent (service-role preferred for sensitive cross-account reads in this codebase).
- Exact UI copy/wording for the owner's disabled remove control (D-14) and the confirm-dialog text for removal (D-10).
- Whether the popup reuses/extends `RejectionReasonPopup.tsx`'s glass-panel/backdrop/Escape-close pattern directly, or is a new component — `RejectionReasonPopup` is single-value today (one reason), so a list variant needs restructuring per Phase 63's own scout notes; planner should decide reuse vs. new component.

### Deferred Ideas (OUT OF SCOPE)
- **Full polished signup-via-invite-link onboarding UX** — Phase 60's original deferred item stays deferred; Phase 64 only adds the minimal name field (D-05/D-06), not a redesigned onboarding screen for that flow.
- **In-app notification badge/bell system** — explicitly Out of Scope per REQUIREMENTS.md; not revisited.
- **Removal email notification** — considered and explicitly declined (D-11), not just unaddressed. If a future need arises, it's a new addition to `lib/email.ts` following the existing conventions.
- **Company-wide `business_paikka_links` visibility widening** — still not delivered (re-deferred from Phase 59 → 60 → still open). Phase 64's team-list read (D-09) is venue-scoped only (for the specific `paikka_id` the popup is opened from), not a company-wide member directory. If a future phase wants a company-wide "all my people across all venues" view, that's new scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ACCESS-04 | Paikan päähallitsija näkee odottavat hallintaoikeuspyynnöt `/business`-dashboardissa ja voi hyväksyä/hylätä; sub-managerit eivät voi hyväksyä toisten pyyntöjä | Existing approve/reject Route Handlers (`app/api/business/access-request/{approve,reject}/route.ts`) already enforce venue-scoped `role='owner'` authorization server-side — reused as-is. Existing RLS policy `"Owner reads requests for owned venues"` on `business_access_requests` already permits an owner to SELECT pending rows for venues they own (found this session — not previously surfaced in Phase 60 docs). Identity display (name/email) still requires a service-role Route Handler per D-07. See Architecture Patterns and Common Pitfalls. |
| ACCESS-07 | Päähallitsija voi poistaa sub-managerin hallintaoikeuden paikasta; päähallitsijaa itseään ei voi poistaa tämän virran kautta | No DELETE RLS policy or Route Handler exists for `business_paikka_links` — confirmed via full migration history read this session. New service-role Route Handler required, templated directly on `approve/route.ts`'s JWT-verify + venue-scoped-owner-authorization + `count:'exact'` concurrency shape. `claim_status` CHECK constraint has no `'removed'` value, so removal must be a literal `DELETE`, not a status UPDATE. See Code Examples and Common Pitfalls (Pitfall 4, 8, 9). |
</phase_requirements>

## Summary

Phase 64 is a pure internal extension: no new npm packages, no new external services, no new architectural tier. Everything needed already exists in the codebase as a pattern to copy — the work is (1) a new combined "team management" popup wired into `DiagonaalKortti`'s existing `dashboardActions` panel, (2) a new service-role Route Handler for reading pending-requests + team-member identity and for removing a sub-manager, and (3) a `business_accounts.display_name` column plus a name-collection input somewhere in the invite-link signup path.

The single most important finding of this research is **not** about ACCESS-04/ACCESS-07 directly — it is a confirmed, pre-existing gap in the invite-link signup wiring that Phase 64's D-05 name-collection work will collide with. `app/business/liity/page.tsx` redirects brand-new/unauthenticated visitors to `/business/rekisteroidy?paikka_id=X`, but `app/business/rekisteroidy/page.tsx` never reads `paikka_id` from `useSearchParams`, never sends `invite: true` to `/api/business/register`, and always `router.push('/business')` after signup instead of routing back to `/business/liity?paikka_id=X`. The backend (`/api/business/register`'s `invite` branch, added in Phase 60) fully supports the no-auto-company invite path — it is simply never invoked by any current UI caller (confirmed via grep: zero call sites pass `invite: true`). Concretely, today, a brand-new employee who clicks an invite link and signs up becomes the **owner of a brand-new bogus company**, not a pending member of the inviting venue's company — the entire ACCESS-03 request flow silently never triggers for that user. Phase 60's own `60-RESEARCH.md` flagged this exact risk as Assumption A2 ("reusing the existing register flow... may be structurally incompatible") and it appears the wiring was never completed. Since CONTEXT.md's D-05 explicitly targets "the invite-link signup flow" as the place to add the name field, the planner must decide whether to bundle a fix for this wiring gap into Phase 64 (recommended — otherwise the new name field has no reachable code path for new users) or explicitly flag it to the user as separately deferred. See Common Pitfalls (Pitfall 1) and Open Questions (Q1).

**Primary recommendation:** Build one new service-role Route Handler (e.g. `POST /api/business/access-request/remove` and a `GET`/`POST` team-and-requests list endpoint) templated directly on `app/api/business/access-request/approve/route.ts`'s JWT-verify → venue-scoped-owner-check → concurrency-safe-mutation shape; extend `RejectionReasonPopup.tsx`'s glass/backdrop/Escape pattern into a new `TeamManagementPopup` component rather than shoehorning a list into the single-value original; and fix the `rekisteroidy` → `register` → `liity` invite-flow wiring gap as part of implementing D-05, since the name field is otherwise unreachable for genuinely new invite-link users.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Pending-request + team-member list read (with names/emails) | API/Backend (new service-role Route Handler) | — | `business_accounts` and `business_paikka_links` SELECT RLS policies are both self-scoped only (`auth.uid() = user_id` / `business_account_id`); no RLS path lets an owner read another account's row. Service role is the only way to resolve cross-account identity (D-07, D-09). |
| Approve/Reject pending request | API/Backend (existing Route Handlers, reused) | — | Already built and working in Phase 60; venue-scoped owner authorization already enforced server-side. |
| Remove sub-manager | API/Backend (new Route Handler) | Database (DELETE via service role) | No DELETE RLS policy exists on `business_paikka_links`; owner-authorization + hard self-block (ACCESS-07) must be enforced server-side, matching the approve/reject authorization shape exactly. |
| Team-management icon + popup trigger | Browser/Client | — | `DiagonaalKortti`'s existing `dashboardActions` icon-button pattern (Phase 63), client-only interaction. |
| Popup rendering (two sections: requests, team) | Browser/Client | — | New/extended React client component; fetches from the new Route Handler on open. |
| Name-collection input (D-05) | Frontend Server (Next.js page, client component) | — | Form input in `app/business/rekisteroidy` and/or `app/business/liity`'s submit-form; plain client-side form state. |
| `business_accounts.display_name` storage | Database (Postgres column) | API/Backend (write only via `supabaseAdmin`) | New nullable column; written exclusively through service-role Route Handlers (mirrors `role`/`company_id`'s existing lockdown pattern) — no client UPDATE grant needed. |
| Invite-link wiring fix (paikka_id passthrough, `invite:true`, post-signup redirect) | Frontend Server (Next.js pages `rekisteroidy`/`liity`) | API/Backend (`/api/business/register`, already supports `invite:true`) | Pure routing/state-passing fix between existing pages; no new backend logic needed, the `invite` branch already exists and works. |

## Standard Stack

### Core

No new packages. This phase reuses the project's existing stack exclusively.

| Library | Version (installed) | Purpose | Why Standard (for this codebase) |
|---------|---------|---------|--------------|
| `lucide-react` | ^1.16.0 [VERIFIED: package.json] | Icon set for the new team-management icon button and popup close/remove icons | Already the sole icon library used throughout `DiagonaalKortti.tsx`, `RejectionReasonPopup.tsx` |
| `framer-motion` | ^12.38.0 [VERIFIED: package.json] | `AnimatePresence`/`motion` for the new popup's backdrop/panel animation | Existing pattern in `RejectionReasonPopup.tsx`, `AuthModal.tsx` — reuse exact duration/easing constants |
| `next-intl` | ^4.13.0 [VERIFIED: package.json] | i18n for all new Finnish/English copy (`Business` namespace in `messages/fi.json`/`messages/en.json`) | Existing pattern; every Business-facing string in the codebase goes through this |
| `@supabase/supabase-js` | ^2.105.4 [VERIFIED: package.json] | `supabaseAdmin` service-role client for the new Route Handlers | `lib/supabaseAdmin.server.ts` — existing shared client, server-only import |
| Next.js App Router Route Handlers | 14.2.35 [VERIFIED: package.json] | New `app/api/business/access-request/{list,remove}/route.ts` endpoints | Existing pattern for every business API endpoint in the codebase |

**Version verification:** `npm view lucide-react version` returns `1.23.0` on the registry (installed: `1.16.0` — this is an existing, already-used dependency; no upgrade is required or in scope for this phase since no new icon capability beyond standard `Users`/`UserPlus`/`UserCog`/`Trash2`/`X` glyphs is needed, all of which have existed in lucide-react for a long time). No other package versions need verification since nothing new is being installed.

### Supporting

None — no supporting libraries needed beyond the Core table above.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Service-role Route Handler for team/requests list (D-09) | New RLS SELECT policy widening `business_paikka_links`/`business_accounts` visibility to same-company/same-venue members | Rejected: Phase 59's D-14 explicitly deferred company-wide RLS widening to "Phase 60/64" as a deliberate choice, and Phase 60's D-05 established the service-role-for-sensitive-cross-account-reads precedent (`admin/approve`, `access-request/approve`). Widening RLS would also still not solve the `auth.users` email-join problem (RLS cannot join `auth.users`), so a service-role read is needed for identity resolution regardless — a new RLS policy would be extra surface for no benefit. |
| Literal `DELETE` for removal (D-12) | Add a new `'removed'` value to the `claim_status` CHECK constraint and soft-delete via UPDATE | Rejected as default: no CONTEXT.md decision requests preserving removed-member history, D-11 confirms "silent DB update" with no audit trail requirement (ACCESS-09 audit log is explicitly v2/deferred). A literal DELETE is simpler and matches "no undo" (D-10). If future audit requirements emerge, that's new scope. |
| New `TeamManagementPopup` component | Restructure `RejectionReasonPopup.tsx` in place to support both single-value and list rendering via props | Either is viable — CONTEXT.md explicitly leaves this to the planner. Restructuring in place risks regressing the working single-reason rejection popup; a new sibling component that copies the glass/backdrop/Escape scaffolding is lower-risk and matches the codebase's existing pattern of small, single-purpose popup components. |

**Installation:** None — no new dependencies to install.

## Package Legitimacy Audit

**Not applicable.** This phase introduces zero new npm packages, so the Package Legitimacy Gate protocol was not run — there is nothing to audit. All work uses `lucide-react`, `framer-motion`, `next-intl`, and `@supabase/supabase-js`, which are pre-existing, already-vetted dependencies used throughout the codebase.

**Packages removed due to [SLOP] verdict:** none (no packages evaluated)
**Packages flagged as suspicious [SUS]:** none (no packages evaluated)

## Architecture Patterns

### System Architecture Diagram

```
Owner's browser (/business dashboard)
  │
  ├─ DiagonaalKortti (per-venue card, dashboardActions panel)
  │     └─ new "Team" icon button (Users/UserPlus) — visible when
  │        pending requests exist and/or team has >1 member (D-02)
  │        onClick → opens TeamManagementPopup, passes paikka_id
  │
  ▼
TeamManagementPopup (new client component, extends RejectionReasonPopup's
  glass/backdrop/Escape scaffolding)
  │
  ├─ on open: GET/POST /api/business/access-request/list?paikka_id=X
  │     (NEW service-role Route Handler)
  │       1. JWT-verify caller (supabaseAdmin.auth.getUser)
  │       2. Verify caller is approved owner of THIS paikka_id
  │          (business_paikka_links + business_accounts.role='owner')
  │       3. Fetch pending business_access_requests for paikka_id
  │          (existing RLS policy already permits this read, but the
  │          Route Handler uses supabaseAdmin anyway to resolve names/emails)
  │       4. Fetch business_paikka_links rows for paikka_id (all members)
  │          joined to business_accounts (role, display_name)
  │       5. Resolve auth.users email for each row via
  │          supabaseAdmin.auth.admin.getUserById (fallback when no
  │          display_name)
  │       ← returns { pendingRequests: [...], teamMembers: [...] }
  │
  ├─ "Pending requests" section
  │     ├─ Approve button → POST /api/business/access-request/approve
  │     │     (EXISTING, unmodified — Phase 60)
  │     └─ Reject button  → POST /api/business/access-request/reject
  │           (EXISTING, unmodified — Phase 60, rejection_reason always null, D-13)
  │
  └─ "Current team" section
        ├─ Owner's own row: shown, remove icon disabled (D-14)
        └─ Other members: remove icon → confirm step (D-10, no reusable
              ConfirmDialog exists — build inline in the popup) → on
              confirm: DELETE /api/business/access-request/remove
                (NEW service-role Route Handler)
                  1. JWT-verify caller
                  2. Verify caller is approved owner of THIS paikka_id
                     AND business_accounts.role='owner' (same check as above)
                  3. Hard-block: target user_id === caller user_id → 403
                     (ACCESS-07, enforced regardless of UI state)
                  4. DELETE business_paikka_links WHERE
                     business_account_id=target AND paikka_id=X
                     (count:'exact' concurrency guard)
                  5. No email sent (D-11) — silent

  On success (approve/reject/remove): popup refetches the list endpoint
  or optimistically updates local state; DiagonaalKortti's parent
  (app/business/page.tsx) does NOT need a full page reload.

─────────────────────────────────────────────────────────────────────
Invite-link signup wiring (existing gap this phase must address for D-05
to have any effect on brand-new users):

  /business/liity?paikka_id=X (unauthenticated OR no business_accounts row)
    → router.replace('/business/rekisteroidy?paikka_id=X')
        │
        ▼
  /business/rekisteroidy  [GAP: does not read paikka_id today]
    → supabase.auth.signUp(...)
    → POST /api/business/register  [GAP: never sends invite:true today]
        (needs: read paikka_id via useSearchParams, collect display_name
         input (D-05), send { invite: true, display_name } when
         paikka_id present, skip company_name field for invite path)
    → router.push('/business')  [GAP: should be
        router.push('/business/liity?paikka_id=X') when paikka_id present,
        so the access-request submit actually happens]
```

### Recommended Project Structure

No new directories — all new files slot into existing structure:

```
app/
├── api/business/access-request/
│   ├── approve/route.ts        # existing, unmodified
│   ├── reject/route.ts         # existing, unmodified
│   ├── submit/route.ts         # existing — may need a small display_name
│   │                             write path if collected at submit-time
│   ├── list/route.ts           # NEW — combined pending+team read
│   └── remove/route.ts         # NEW — sub-manager removal
├── components/
│   ├── DiagonaalKortti.tsx     # modified: new dashboardActions icon
│   ├── RejectionReasonPopup.tsx  # unmodified OR base for the new popup
│   └── TeamManagementPopup.tsx # NEW (recommended name)
├── business/
│   ├── page.tsx                 # modified: fetch trigger + popup wiring
│   ├── liity/page.tsx           # modified: read paikka_id fix, optional
│   │                              display_name input for existing accounts
│   └── rekisteroidy/page.tsx    # modified: paikka_id read, invite:true
│                                  send, display_name input, redirect fix
supabase/migrations/
└── 20260702000000_business_accounts_display_name.sql   # NEW
```

### Pattern 1: Service-role Route Handler with venue-scoped owner authorization

**What:** Every mutation/sensitive-read endpoint verifies the caller's JWT, then checks the caller holds an *approved* `business_paikka_links` row for the *specific* `paikka_id` in question AND `business_accounts.role === 'owner'` — never role-alone, never company-wide.
**When to use:** Both new endpoints (`list`, `remove`) must follow this exactly.
**Example:**
```typescript
// Source: app/api/business/access-request/approve/route.ts (existing, this session)
const { data: ownerLink } = await supabaseAdmin
  .from('business_paikka_links')
  .select('business_account_id')
  .eq('paikka_id', row.paikka_id)
  .eq('claim_status', 'approved')
  .eq('business_account_id', user.id)
  .maybeSingle()

if (!ownerLink) {
  return NextResponse.json({ error: 'Forbidden: not an approved owner of this venue' }, { status: 403 })
}

const { data: callerAccount } = await supabaseAdmin
  .from('business_accounts')
  .select('role')
  .eq('user_id', user.id)
  .maybeSingle()

if (callerAccount?.role !== 'owner') {
  return NextResponse.json({ error: 'Forbidden: owner role required' }, { status: 403 })
}
```

### Pattern 2: Concurrency-safe destructive mutation

**What:** Every state-changing write filters on the expected pre-state in the `WHERE` clause with `{ count: 'exact' }`, and checks `count` afterward — never `SELECT` then unconditionally mutate.
**When to use:** The new removal endpoint's `DELETE`.
**Example:**
```typescript
// Source: app/api/business/access-request/approve/route.ts (existing pattern to replicate for DELETE)
const { error: updateError, count } = await supabaseAdmin
  .from('business_access_requests')
  .update({ status: 'approved', updated_at: new Date().toISOString() }, { count: 'exact' })
  .eq('id', requestId)
  .eq('status', 'pending')
if (!count) {
  return NextResponse.json({ error: 'Access request already processed' }, { status: 409 })
}
// For removal, the DELETE equivalent:
// const { error, count } = await supabaseAdmin
//   .from('business_paikka_links')
//   .delete({ count: 'exact' })
//   .eq('business_account_id', targetUserId)
//   .eq('paikka_id', paikkaId)
```

### Pattern 3: DiagonaalKortti dashboardActions icon button

**What:** Icon buttons in the dashboard controls panel follow a fixed shape: `w-7 h-7 rounded-full`, `stopPropagation`/`preventDefault` click guards, contrast-aware inline style vs. `.glass-btn` fallback depending on `panelShade`.
**When to use:** The new team-management icon.
**Example:**
```tsx
// Source: app/components/DiagonaalKortti.tsx:264-274 (existing copy-invite-link button, same shape to copy)
{dashboardActions.onCopyInviteLink && (
  <button
    type="button"
    onClick={e => { e.stopPropagation(); e.preventDefault(); dashboardActions.onCopyInviteLink?.() }}
    aria-label={dashboardActions.copied ? tBusiness('inviteLinkCopied') : tBusiness('copyInviteLinkCta')}
    className={`w-7 h-7 rounded-full flex items-center justify-center [transition:color_150ms_ease] ${panelShade ? '' : 'glass-btn text-[rgba(17,17,17,0.5)] hover:text-[#111111]'}`}
    style={panelShade ? { backgroundColor: panelChipBg, color: panelShadeContrastText } : undefined}
  >
    {dashboardActions.copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
  </button>
)}
```
A new `onManageTeam?: () => void` prop on `DashboardActionsProps` follows this exact shape with `Users` (or `UserCog`) as the glyph.

### Pattern 4: Popup scaffolding (glass/backdrop/Escape)

**What:** `AnimatePresence` wrapping a fixed-position backdrop + glass panel, Escape-key listener, backdrop-click-to-close, close button top-right.
**When to use:** Base for the new `TeamManagementPopup`.
**Example:** See `app/components/RejectionReasonPopup.tsx` in full — copy the `useEffect` Escape handler, the `motion.div` backdrop/panel transition values (`duration: 0.2` for backdrop, `duration: 0.25, ease: [0.25, 0.1, 0.25, 1]` for panel), and the `aria-modal`/`role="dialog"` attributes. The new component needs internal list rendering (map over pending requests + team members) instead of a single value — this is the "restructuring" Phase 63's own scout notes anticipated.

### Anti-Patterns to Avoid
- **Reading team members via the anon/browser Supabase client:** `business_paikka_links` and `business_accounts` SELECT RLS are both self-scoped (`auth.uid() = ...`). A client-side query for "other venue members" will silently return zero/own-only rows, not throw an error — this fails silently and is easy to miss in manual testing. Always use the service-role Route Handler.
- **Trusting the UI to prevent self-removal:** D-14's disabled button is UI-only defense-in-depth. The Route Handler MUST independently check `targetUserId !== callerUserId` — never rely on the client not sending the request.
- **Adding a new `claim_status` value via UPDATE instead of DELETE:** The CHECK constraint on `business_paikka_links.claim_status` only allows `'pending' | 'approved' | 'rejected'`. Attempting `UPDATE ... SET claim_status = 'removed'` will throw a Postgres CHECK-violation error at runtime, not a TypeScript error at build time.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT verification | Custom token decode/verify | `supabaseAdmin.auth.getUser(token)` | Existing pattern at every Route Handler boundary (CLAUDE.md constraint); reimplementing JWT verification is a well-known security foot-gun |
| Concurrency-safe status/row transitions | `SELECT` then conditionally `UPDATE`/`DELETE` in application code | `UPDATE/DELETE ... WHERE <guard-column>` + `{ count: 'exact' }`, check `count` | Race conditions between the SELECT and the mutation are exactly what caused Phase 60 to establish this pattern; do not reintroduce the gap for DELETE |
| Popup dialog behavior (backdrop, Escape, focus trap-lite) | New from-scratch modal implementation | Copy `RejectionReasonPopup.tsx`'s `AnimatePresence`/backdrop/Escape scaffolding | Already battle-tested in this codebase, matches CLAUDE.md's animation-duration conventions exactly |
| Column-privilege lockdown for the new `display_name` column (if a client UPDATE path is ever added) | A column-only `REVOKE UPDATE (display_name) ON business_accounts FROM authenticated` | `REVOKE UPDATE ON business_accounts FROM authenticated;` then `GRANT UPDATE (allow-list including display_name) TO authenticated;` | A column-only REVOKE does NOT narrow Supabase's pre-existing table-wide GRANT in this project — this exact mistake was made and fixed twice already (Phase 59, `20260625000001`/`20260625000002`). If `display_name` is only ever written via `supabaseAdmin` (recommended, mirrors `role`/`company_id`), skip granting UPDATE to `authenticated` entirely and this problem doesn't arise. |
| Confirm-before-destructive-action dialog (D-10) | A generic reusable `ConfirmDialog` component (none exists in this codebase today) | A small inline two-state confirm inside `TeamManagementPopup` (click remove → row shows "Vahvista poisto?" + confirm/cancel — no separate modal needed) | Grepped the codebase for `window.confirm`/`ConfirmDialog` — no existing pattern to reuse; building a full new generic modal library for one interaction is overkill relative to an inline confirm row matching CLAUDE.md's minimal-animation philosophy |

**Key insight:** Every backend piece of this phase is a direct structural copy of an already-shipped, already-reviewed pattern (Phase 60's approve/reject handlers). The only genuinely new backend logic is the hard self-removal block (D-12/D-14) and the identity-resolution join (business_accounts + auth.users email fallback) — everything else is template reuse, which is the intended design given Phase 60 explicitly scoped ACCESS-04's dashboard and ACCESS-07's removal flow to "Phase 64" in its own migration comments.

## Common Pitfalls

### Pitfall 1: The invite-link signup wiring gap silently defeats D-05 for new users
**What goes wrong:** A brand-new employee clicks an invite link, signs up via `/business/rekisteroidy`, and becomes the owner of a brand-new bogus company instead of a pending member of the inviting venue's company. No error is shown — the flow "succeeds" from the user's perspective.
**Why it happens:** `app/business/liity/page.tsx` passes `paikka_id` as a query param when redirecting unauthenticated/unregistered visitors to `/business/rekisteroidy?paikka_id=X`, but `app/business/rekisteroidy/page.tsx` never calls `useSearchParams()` and never reads it (confirmed via full file read + grep — zero references). It always calls `/api/business/register` without `invite: true` and always `router.push('/business')` regardless of how the user arrived. The backend's `invite` branch (added Phase 60, `app/api/business/register/route.ts` lines 46-59) is fully functional but has zero callers today (confirmed via grep across `app/` for `invite:` — only 5 files reference the word `invite` at all, and none of them is `rekisteroidy/page.tsx`).
**How to avoid:** As part of implementing D-05 (which explicitly targets "the invite-link signup flow"), read `paikka_id` from `useSearchParams()` in `rekisteroidy/page.tsx`; when present, send `{ invite: true, display_name, role_in_company }` to `/api/business/register` (and skip/hide the `company_name` field, since the register route already treats it as optional for the invite path); after success, redirect to `/business/liity?paikka_id=X` instead of `/business` so the existing `submit` endpoint actually fires the access request.
**Warning signs:** Manually walking through "copy invite link → open in incognito → sign up" and observing the new account lands on an empty `/business` dashboard with no pending-request banner, and the owner never receives the notification email — this is the symptom.

### Pitfall 2: `business_paikka_links` SELECT RLS is self-scoped only — confirmed, not assumed
**What goes wrong:** A naive implementation queries `business_paikka_links` from the browser client (anon key) filtering by `paikka_id` expecting to see all team members; it silently returns only the caller's own row (or zero rows for other members).
**Why it happens:** `supabase/migrations/20260625000000_companies_role_rls.sql` (D-14) explicitly kept this policy self-scoped (`business_account_id = auth.uid()`) and deferred company-wide widening to "Phase 60/64" — this phase IS that deferred widening, but CONTEXT.md's D-09 correctly directs it to a service-role Route Handler, not a new RLS policy (see Alternatives Considered).
**How to avoid:** Use the new `/api/business/access-request/list` service-role endpoint for all team-member reads; never attempt this via the browser Supabase client.
**Warning signs:** The team list shows only the owner's own row (or is empty) even though other members exist.

### Pitfall 3: `business_accounts` SELECT RLS is also self-scoped
**What goes wrong:** Same trap as Pitfall 2 but for resolving a requester's/member's `display_name`/`role` — a client-side join against `business_accounts` for another user's row returns nothing.
**Why it happens:** `"Business reads own account"` policy (`auth.uid() = user_id`), unchanged since the original Phase 5-equivalent migration and every subsequent phase.
**How to avoid:** Resolve all cross-account `display_name`/`role`/email lookups inside the service-role Route Handler.
**Warning signs:** Names/emails render as blank or `undefined` in the popup for anyone other than the current user.

### Pitfall 4: No `'removed'` status exists — removal must be a real DELETE
**What goes wrong:** Implementing removal as `UPDATE business_paikka_links SET claim_status = 'removed' WHERE ...` throws a Postgres CHECK-constraint violation at runtime (the constraint only allows `'pending' | 'approved' | 'rejected'`), surfacing as an opaque 500 error unless caught.
**Why it happens:** The CHECK constraint has not changed since `20260605000000_business_accounts.sql` and no migration since has touched it (confirmed via grep across all migrations for `claim_status`).
**How to avoid:** Use a literal `DELETE FROM business_paikka_links WHERE business_account_id = $target AND paikka_id = $paikkaId`, matching D-12's "delete" language and D-11's "no undo" framing. Do not add a new CHECK value unless the user explicitly wants soft-delete/audit-trail semantics (out of current scope — ACCESS-09 audit log is v2).
**Warning signs:** A 500 error on remove with a Postgres constraint-violation message in the server log.

### Pitfall 5: The approval-publish trigger does not fire on DELETE — this is correct, but verify it
**What goes wrong:** Assuming `set_business_managed_on_approval()` (the trigger that sets `liikuntapaikat.published`/`business_managed = true`) might also need to run in reverse on removal, or worrying that removing a sub-manager could accidentally unpublish the venue.
**Why it happens:** The trigger is `AFTER UPDATE OF claim_status ... WHEN (NEW.claim_status = 'approved')` (`20260611000001_approval_trigger.sql`, refined by `20260611000002`) — it only fires on UPDATE, never on DELETE, and never in the "un-approve" direction.
**How to avoid:** No action needed — removing a sub-manager's `business_paikka_links` row correctly leaves the venue's `published`/`business_managed` flags untouched (the venue remains published as long as the owner's own approved link exists, which can never be removed per D-12/D-14). Worth a one-line comment in the new removal handler noting this was verified, so a future reader doesn't "fix" something that isn't broken.
**Warning signs:** N/A — this is a confirm-and-document pitfall, not a bug to fix.

### Pitfall 6: Icon-panel width with up to 4 simultaneous icons
**What goes wrong:** `DiagonaalKortti`'s dashboard controls panel currently renders at most 3 icon buttons simultaneously (Preview + Edit + exactly one of CopyInviteLink/RejectionInfo, since those two are mutually exclusive by `status`). Adding a 4th (team-management) that can appear alongside CopyInviteLink (both apply to `approved` venues) means up to 4 `w-7 h-7` buttons with `gap-2` must fit in the right-hand panel, which is roughly half of a 396px-wide card on desktop and narrower on mobile (`w-full` below `sm:`).
**Why it happens:** Phase 63 designed the panel for a maximum of 3 icons; this phase adds a scenario where 4 can coexist.
**How to avoid:** Test the rendered card at `w-full` (mobile) and `sm:w-[396px]` (desktop) with all 4 icons visible (approved, non-kesken venue with both an invite-link-copy option and team/requests to manage) before considering the UI task done. If it visually crowds, consider whether team-management and copy-invite-link can share a single overflow affordance, though CONTEXT.md's D-01 is explicit that this must be ONE icon, not folded into another existing one.
**Warning signs:** Icons overlapping or wrapping onto a second row on narrow viewports.

### Pitfall 7: Column-privilege lockdown pattern must be replicated correctly if `display_name` ever gets a client UPDATE path
**What goes wrong:** A column-only `REVOKE UPDATE (display_name) ON business_accounts FROM authenticated` appears to work in testing but doesn't actually block anything, because Supabase's pre-existing table-wide `GRANT UPDATE` to `authenticated` still applies.
**Why it happens:** This exact mistake was made twice in this codebase already (`20260605000003_fix_column_privileges.sql`'s original attempts, corrected by `20260625000001_fix_column_privilege_escalation.sql`) — it is now a documented, load-bearing lesson in `STATE.md`'s Active Decisions: *"column-level `REVOKE UPDATE (col) ... FROM authenticated` does NOT work in this codebase's Supabase setup — a pre-existing table-wide GRANT overrides it."*
**How to avoid:** Recommended: do not grant `authenticated` UPDATE on `display_name` at all — write it exclusively via `supabaseAdmin` at registration time (mirrors how `role`/`company_id` are handled today, which have zero client UPDATE grant). If a future phase wants users to edit their own display name, use the two-step `REVOKE UPDATE ON business_accounts FROM authenticated;` + `GRANT UPDATE (existing-allow-list, display_name) TO authenticated;` shape exactly as `20260625000002_tighten_business_accounts_grant.sql` demonstrates.
**Warning signs:** A member successfully updates a column that was supposedly revoked.

### Pitfall 8: Venue-scoped (not company-wide) authorization must be replicated exactly for removal
**What goes wrong:** Implementing the removal authorization check as "caller.role === 'owner'" alone (without also checking the caller has an approved link to the *specific* `paikka_id` being managed) would let an owner of Venue A remove a member's access to Venue B in the same company, if such a scenario ever arises.
**Why it happens:** The codebase's model is deliberately venue-scoped, not company-wide (D-04 from Phase 60, reaffirmed by D-14 in Phase 59's migration) — this is easy to simplify away since no current test data actually has a multi-venue company.
**How to avoid:** Copy Pattern 1 exactly (both checks: approved link for `paikka_id` AND `role === 'owner'`).
**Warning signs:** None currently observable in test data (no multi-venue companies exist yet per STATE.md), which makes this an easy check to accidentally omit without anything breaking in manual testing — cover it with a unit test instead (see Validation Architecture).

### Pitfall 9: Never trust the client for the self-removal block
**What goes wrong:** Relying solely on the UI disabling the owner's own remove button (D-14) as the actual security boundary.
**Why it happens:** It's tempting to consider the UI-level disable "done" since it satisfies the visible acceptance criterion.
**How to avoid:** The Route Handler must independently compare `targetUserId === callerUserId` and return 403/400 regardless of what the client sends — CONTEXT.md's D-12 already states this explicitly ("backend-enforced regardless of UI state").
**Warning signs:** A direct `fetch`/`curl` to the remove endpoint with the caller's own `user_id` as the target succeeds.

## Code Examples

### Removal Route Handler skeleton (new — templated on approve/route.ts)
```typescript
// Source: pattern derived from app/api/business/access-request/approve/route.ts (this session)
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'

export async function POST(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let paikkaId: number
  let targetUserId: string
  try {
    const body = await request.json()
    paikkaId = parseInt(body.paikka_id, 10)
    targetUserId = typeof body.target_user_id === 'string' ? body.target_user_id : ''
    if (isNaN(paikkaId) || !targetUserId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // ACCESS-07 hard block — independent of UI state
  if (targetUserId === user.id) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
  }

  // Venue-scoped owner authorization — identical shape to approve/reject
  const { data: ownerLink } = await supabaseAdmin
    .from('business_paikka_links')
    .select('business_account_id')
    .eq('paikka_id', paikkaId)
    .eq('claim_status', 'approved')
    .eq('business_account_id', user.id)
    .maybeSingle()
  if (!ownerLink) {
    return NextResponse.json({ error: 'Forbidden: not an approved owner of this venue' }, { status: 403 })
  }
  const { data: callerAccount } = await supabaseAdmin
    .from('business_accounts')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()
  if (callerAccount?.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden: owner role required' }, { status: 403 })
  }

  const { error, count } = await supabaseAdmin
    .from('business_paikka_links')
    .delete({ count: 'exact' })
    .eq('business_account_id', targetUserId)
    .eq('paikka_id', paikkaId)
  if (error) {
    return NextResponse.json({ error: 'Delete failed', detail: error.message }, { status: 500 })
  }
  if (!count) {
    return NextResponse.json({ error: 'Member not found for this venue' }, { status: 404 })
  }

  // D-11: no email notification — silent
  return NextResponse.json({ ok: true })
}
```

### New `display_name` migration (following the exact REVOKE/GRANT precedent)
```sql
-- Source: pattern derived from supabase/migrations/20260625000000_companies_role_rls.sql
-- and 20260625000002_tighten_business_accounts_grant.sql (REVOKE-table/GRANT-allowlist shape)
BEGIN;

ALTER TABLE business_accounts
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- display_name is written ONLY via supabaseAdmin (service role, bypasses RLS/grants)
-- at registration/submit time — mirrors role/company_id, which have zero
-- authenticated UPDATE grant today. No GRANT UPDATE (display_name) is added here.
-- If a future phase needs client-side self-editing of display_name, follow the
-- two-step REVOKE-table/GRANT-allowlist shape, never a column-only REVOKE.

COMMIT;
```

## State of the Art

Not applicable in the "external tech evolved" sense — this phase makes no use of any technology or pattern that has changed externally. The one internal "state of the art" progression worth noting:

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Self-scoped RLS SELECT policies for all business tables | Service-role Route Handlers for cross-account sensitive reads/writes, RLS kept narrow/self-scoped | Established Phase 60 (`admin/approve`, `access-request/{approve,reject}`) | Phase 64 continues this exact pattern rather than introducing wider RLS policies — confirmed as the right call by re-reading Phase 59's D-14 deferral note |

**Deprecated/outdated:** None.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Users`/`UserPlus`/`UserCog`/`Trash2` icon glyphs exist and render correctly in the installed `lucide-react` ^1.16.0 | Architecture Patterns, Standard Stack | Low — these are extremely long-standing, common icon names in lucide-react; if one name is wrong, swapping to a sibling icon name is a trivial fix with no architectural impact |
| A2 | New Route Handler paths `app/api/business/access-request/list/route.ts` and `app/api/business/access-request/remove/route.ts` are reasonable, unclaimed names | Recommended Project Structure | Low — pure naming; easy to rename during planning if the planner prefers different paths (e.g. a single combined `manage/route.ts`) |
| A3 | `display_name` should be a nullable `TEXT` column with a reasonable client-side length cap (e.g. 100 chars, mirroring `role_in_company`'s existing `.slice(0, 100)` convention in `register/route.ts`) | Code Examples, Don't Hand-Roll | Low — a length cap is a defensive default, not a hard requirement from CONTEXT.md; adjusting the cap later is a one-line change |
| A4 | Fixing the `rekisteroidy` → `register` → `liity` invite-wiring gap should be bundled into Phase 64 rather than deferred, because D-05's name field has no reachable code path for brand-new invite-link users without it | Summary, Common Pitfalls (Pitfall 1), Open Questions (Q1) | **High if wrong in the other direction** — if the user actually wants this deferred and Phase 64 ships only the name-field UI without the wiring fix, the new field will be dead code for the primary "brand-new employee joins via invite link" scenario, and the underlying company-mis-assignment bug persists silently. This should be explicitly confirmed with the user during planning, not silently decided by the planner. |

## Open Questions

1. **Should Phase 64 fix the confirmed `rekisteroidy`/`register`/`liity` invite-wiring gap (paikka_id drop, missing `invite:true`, wrong post-registration redirect), or is that explicitly separate deferred work?**
   - What we know: The gap is real and independently confirmed this session via full file reads and repo-wide grep (zero call sites send `invite: true`; `rekisteroidy/page.tsx` never reads `paikka_id`). Phase 60's own research flagged this exact risk as a Medium-risk assumption (A2) that appears to have materialized.
   - What's unclear: Whether the user is aware of this gap, and whether they want it fixed now (since D-05 already touches this exact file/flow) or tracked as a separate bug for a future phase.
   - Recommendation: Surface this explicitly during `/gsd-discuss-phase` follow-up or plan review before committing to a plan — bundling the fix into Phase 64 is the pragmatic choice since D-05 already requires editing `rekisteroidy/page.tsx`, but it does expand Phase 64's diff beyond CONTEXT.md's literal scope (which described D-05 as "a minimal name-collection field," not a routing-logic fix).

2. **Should `display_name` also be collected on the DEFAULT (non-invite) registration path, for consistency?**
   - What we know: D-05 scopes the name field to the invite-link signup flow only. Default-path owners already display as "(Sinä) Omistaja" per D-14 without needing a personal name.
   - What's unclear: Nothing user-facing currently needs a default-path owner's personal name to be shown anywhere.
   - Recommendation: Keep it invite-path-only per D-05's literal scope; do not expand to the default `rekisteroidy` flow unless the user asks.

3. **Exact copy/wording for team-list labels and the removal confirm-dialog** — explicitly left to the planner per CONTEXT.md's Claude's Discretion section; no further research needed beyond following the existing Finnish tone in `messages/fi.json`'s `Business` namespace (e.g. `dashboardStatusRejectedTitle: "Hakemus hylätty"` style — short, direct, no exclamation marks except on success states like `"Hakemuksesi on hyväksytty!"`).

## Environment Availability

Skipped — this phase has no new external dependencies. It uses the project's already-configured Supabase project (existing `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` env vars, already verified working by every prior phase) and no new tools, runtimes, or services.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (`vitest.config.ts`, `environment: 'node'`) [VERIFIED: vitest.config.ts] |
| Config file | `vitest.config.ts` (repo root) |
| Quick run command | `npx vitest run tests/api/<new-file>.test.ts` |
| Full suite command | `npx vitest run` |

Existing Route Handler tests (`tests/api/register.test.ts`, `tests/api/submit.test.ts`, `tests/api/create-paikka.test.ts`, `tests/api/update-paikka.test.ts`) establish the exact mocking pattern to follow: `vi.mock('next/server', ...)` stubbing `NextResponse.json`, `vi.mock('@/lib/supabaseAdmin.server', ...)` with a hand-built chainable table-mock keyed by table name, and `vi.mock('@/lib/email', ...)` to silence non-critical email side effects.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ACCESS-04 | Owner reads pending requests for owned venue via new list endpoint | unit (Route Handler) | `npx vitest run tests/api/access-request-list.test.ts -t "returns pending requests"` | ❌ Wave 0 |
| ACCESS-04 | Non-owner (member without approved link to this venue) cannot read the list | unit (Route Handler, 403 case) | `npx vitest run tests/api/access-request-list.test.ts -t "forbidden"` | ❌ Wave 0 |
| ACCESS-04 | Approve/Reject buttons call the existing, unmodified endpoints | integration (existing coverage) | already covered by existing approve/reject route tests if present, or manual UAT | check existing `tests/api/` for approve/reject coverage before assuming a gap |
| ACCESS-07 | Owner removes a sub-manager's access (happy path) | unit (Route Handler) | `npx vitest run tests/api/access-request-remove.test.ts -t "removes member"` | ❌ Wave 0 |
| ACCESS-07 | Non-owner cannot remove any member (403) | unit (Route Handler) | `npx vitest run tests/api/access-request-remove.test.ts -t "forbidden non-owner"` | ❌ Wave 0 |
| ACCESS-07 | Owner cannot remove themselves (hard block, even if UI bypassed) | unit (Route Handler) | `npx vitest run tests/api/access-request-remove.test.ts -t "self-removal blocked"` | ❌ Wave 0 |
| ACCESS-07 | Removal is venue-scoped (owner of Venue A cannot remove a member from Venue B) | unit (Route Handler) | `npx vitest run tests/api/access-request-remove.test.ts -t "venue-scoped"` | ❌ Wave 0 |
| ACCESS-07 | Concurrent double-removal only succeeds once (count guard) | unit (Route Handler) | `npx vitest run tests/api/access-request-remove.test.ts -t "concurrency"` | ❌ Wave 0 |
| D-05 (support) | `display_name` is written correctly at invite-path registration | unit (Route Handler, extends existing `register.test.ts`) | `npx vitest run tests/api/register.test.ts -t "display_name"` | ❌ extend existing file |

### Sampling Rate
- **Per task commit:** targeted `npx vitest run tests/api/<file>.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/api/access-request-list.test.ts` — covers ACCESS-04's new list endpoint (owner read, non-owner 403, identity resolution)
- [ ] `tests/api/access-request-remove.test.ts` — covers ACCESS-07's new removal endpoint (happy path, non-owner 403, self-removal block, venue-scoping, concurrency)
- [ ] Extend `tests/api/register.test.ts` — covers `display_name` being persisted correctly on the invite path
- [ ] Framework install: none — Vitest is already configured and used project-wide

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `supabaseAdmin.auth.getUser(token)` JWT verification at the top of every new Route Handler — existing, mandatory pattern |
| V3 Session Management | no | No new session-handling logic; reuses existing `sb-biz-*` cookie namespace and `createBusinessBrowserClient()`/`createBusinessServerClient()` |
| V4 Access Control | yes | Venue-scoped owner authorization (approved `business_paikka_links` row for the specific `paikka_id` AND `business_accounts.role === 'owner'`) on both new endpoints; hard server-side self-removal block (ACCESS-07) independent of UI state |
| V5 Input Validation | yes | `parseInt`/`.trim()`/`.slice(0, N)` on all new body fields (`paikka_id`, `target_user_id`, `display_name`), matching existing patterns in `submit/route.ts`/`register/route.ts` |
| V6 Cryptography | no | No new cryptographic surface |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR on the removal endpoint (removing a member from a venue the caller doesn't own) | Elevation of Privilege / Tampering | Venue-scoped owner-authorization check (Pattern 1), identical to approve/reject |
| Self-removal via the API even though the UI disables it (ACCESS-07 bypass) | Tampering | Server-side `targetUserId === callerUserId` hard block (D-12/D-14), independent of client state |
| Column-level privilege escalation on `business_accounts.role`/`company_id`/new `display_name` column | Tampering | Table-wide `REVOKE UPDATE` + explicit allow-list `GRANT UPDATE` pattern; `display_name` written only via `supabaseAdmin` (no client grant at all) |
| Cross-account information disclosure (reading another business account's email/name/link data via RLS gaps) | Information Disclosure | Both new reads happen exclusively via `supabaseAdmin` server-side, never via the anon-key browser client — RLS self-scoping on `business_accounts`/`business_paikka_links` remains unchanged and intact |
| Stored/reflected XSS via unescaped `display_name` rendered in the popup or (if ever) in an email | Tampering / Information Disclosure | React's default JSX text-node escaping handles the popup rendering (never use `dangerouslySetInnerHTML`, matching `RejectionReasonPopup.tsx`'s existing T-63-04A convention); if `display_name` is ever interpolated into an HTML email in `lib/email.ts`, it MUST go through the existing `esc()` helper, exactly as every other user-supplied string in that file already does |

## Sources

### Primary (HIGH confidence)
- Direct codebase reads this session (all `[VERIFIED: codebase]`): `app/components/DiagonaalKortti.tsx`, `app/components/RejectionReasonPopup.tsx`, `app/business/page.tsx`, `app/business/liity/page.tsx`, `app/business/rekisteroidy/page.tsx`, `app/api/business/access-request/{approve,reject,submit}/route.ts`, `app/api/business/register/route.ts`, `app/api/admin/approve/route.ts`, `lib/email.ts`, `lib/supabaseAdmin.server.ts`, `middleware.ts`, `vitest.config.ts`, `tests/api/submit.test.ts`
- All Supabase migrations touching `business_accounts`/`business_paikka_links`/`business_access_requests` (11 files read in full, chronologically): `20260605000000_business_accounts.sql`, `20260605000003_fix_column_privileges.sql`, `20260610000006_rls_business_paikka_links.sql`, `20260611000001_approval_trigger.sql`, `20260611000002_approval_trigger_not_found.sql`, `20260625000000_companies_role_rls.sql`, `20260625000001_fix_column_privilege_escalation.sql`, `20260625000002_tighten_business_accounts_grant.sql`, `20260626000000_business_access_requests.sql`
- `package.json` — confirmed installed versions of `lucide-react`, `framer-motion`, `next-intl`, `@supabase/supabase-js`, `next`

### Secondary (MEDIUM confidence)
- `npm view lucide-react version` — confirmed registry latest (`1.23.0`) vs. installed (`1.16.0`); not upgraded since out of scope (existing dependency, no new capability needed)

### Tertiary (LOW confidence)
- None — no web-search-only claims in this research. This phase required zero external research since it introduces no new libraries, frameworks, or external APIs; every finding was independently verified against the actual codebase rather than training knowledge.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all versions read directly from `package.json`
- Architecture: HIGH — every pattern cited is copied from an existing, already-shipped file in this exact codebase, not inferred or assumed
- Pitfalls: HIGH — the invite-wiring gap (Pitfall 1) and both self-scoped-RLS pitfalls (2, 3) were independently confirmed via direct file reads and repo-wide grep, not inferred from CONTEXT.md's hints alone

**Research date:** 2026-07-02
**Valid until:** 30 days (stable internal codebase, no fast-moving external dependency)
