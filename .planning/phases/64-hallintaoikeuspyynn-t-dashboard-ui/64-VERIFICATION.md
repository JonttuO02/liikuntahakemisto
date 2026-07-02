---
phase: 64-hallintaoikeuspyynn-t-dashboard-ui
verified: 2026-07-02T13:32:32Z
status: human_needed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Open /business as a päähallitsija of a venue with a pending request and a sub-manager. Click the Users icon on the venue's DiagonaalKortti."
    expected: "The popup opens with both 'Pending requests' and 'Current team' sections. Approve/Reject buttons act on a pending row and remove it from the list. The owner's own row shows a disabled/grayed remove control labeled '(Sinä) Omistaja'. Clicking remove on a sub-manager row shows an inline confirm step before the DELETE fires."
    why_human: "Visual rendering, popup open/close, and interactive click-through have no component test harness in this codebase (64-VALIDATION.md Manual-Only Verifications; also a deferred <human-check> in 64-04-PLAN.md Task 1)."
  - test: "On /business, render a DiagonaalKortti for an approved venue that also has the invite-link-copy affordance, edit, and preview icons all visible simultaneously."
    expected: "All icons (up to 4: Preview + Edit + CopyInviteLink + Team) fit on one row without wrapping, at both mobile (w-full) and desktop (sm:w-[396px]) widths."
    why_human: "Responsive layout/wrap behavior requires visual confirmation across breakpoints (64-04-PLAN.md Task 2 deferred <human-check>, Pitfall 6)."
  - test: "Open /business as an owner. (1) Confirm a venue with >=1 pending request OR >=1 sub-manager beyond the owner shows the Users icon. (2) Confirm an approved-but-empty venue (owner only, zero pending requests) shows NO icon (D-02). (3) Confirm the icon does not appear on kesken/pending/rejected cards. (4) After the last pending request is handled and the last sub-manager removed, confirm the icon disappears on the next dashboard load."
    expected: "Icon visibility exactly matches the D-02 gate rule in every venue state."
    why_human: "Gate expression is source-verifiable (confirmed in this report) but actual show/hide behavior across live venue states requires visual confirmation — no UI test harness exists (64-04-PLAN.md Task 3 deferred <human-check>)."
  - test: "Walk a fresh invite link (/business/liity?paikka_id=X → rekisteroidy → back to liity) end-to-end as a new, unauthenticated test account in an incognito session."
    expected: "The new account lands as a pending member (company_id set, role='member') of the inviting venue's company, and a business_access_requests row exists for that venue — not the owner of a newly created bogus company."
    why_human: "End-to-end flow spans redirects + Supabase state with no e2e harness in this repo (64-03-PLAN.md verification section, 64-VALIDATION.md Manual-Only table). NOTE: source review found a related bug (WR-02, see Anti-Patterns) in the recovery-redirect branch that can strand an interrupted invite signup — worth confirming this specific edge case during UAT."
---

# Phase 64: Hallintaoikeuspyynnöt Dashboard UI Verification Report

**Phase Goal:** Päähallitsija hallitsee odottavat hallintaoikeuspyynnöt ja sub-managerien oikeudet uudistetussa `/business`-dashboardissa
**Verified:** 2026-07-02T13:32:32Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Paikan päähallitsija näkee odottavat hallintaoikeuspyynnöt `/business`-dashboardissa ja voi hyväksyä/hylätä ne | ✓ VERIFIED | `GET /api/business/access-request/list` (app/api/business/access-request/list/route.ts) returns venue-scoped pending requests with resolved identity; `TeamManagementPopup.tsx` fetches it on open and renders "Pending requests" with Approve/Reject wired to the existing `approve`/`reject` Route Handlers (`request_id` body, D-13 no reason on reject). All 3 (`access-request-list.test.ts`, existing approve/reject source review) confirm the contract. `npx vitest run` 246/246 green, `npx tsc --noEmit` clean. Minor caveat: WR-01 (see Anti-Patterns) — the "Current team" section does not locally refresh with the newly-approved member until the popup is reopened; the approve/reject action itself is correctly persisted and reflected in "Pending requests." |
| 2 | Sub-managerit eivät voi hyväksyä toisten pyyntöjä (estetty sekä UI:ssa että backendissä) | ✓ VERIFIED | Backend: `approve/route.ts` and `reject/route.ts` (pre-existing, unmodified Phase 60 code, re-read this session) both independently re-derive the caller's identity via `supabaseAdmin.auth.getUser`, then require an approved `business_paikka_links` row for the specific `paikka_id` AND `business_accounts.role === 'owner'` — a `role: 'member'` caller gets 403 before any state mutation. UI: the Users icon is gated by `teamSummaryByPaikkaId`, whose per-venue fetch hits the same owner-only `list` endpoint; for a non-owner member this fetch always 403s and is caught, defaulting the venue's summary to `{pendingCount:0, memberBeyondOwnerCount:0}` (fail-closed), so the icon never renders for sub-managers — confirmed by source read of `app/business/page.tsx:217-244`. |
| 3 | Päähallitsija voi poistaa sub-managerin hallintaoikeuden paikasta | ✓ VERIFIED | `POST /api/business/access-request/remove` (app/api/business/access-request/remove/route.ts) performs a concurrency-safe `DELETE` on `business_paikka_links` gated by the same venue-scoped-owner check. `TeamManagementPopup.tsx` wires this via an inline two-state confirm (`confirmTargetUserId`) before firing the DELETE. `tests/api/access-request-remove.test.ts` — "removes member" case passes (asserts `.eq('business_account_id', targetUserId)` + `.eq('paikka_id', paikkaId)` on the delete call). |
| 4 | Päähallitsijaa itseään ei voi poistaa tämän virran kautta (kova esto) | ✓ VERIFIED | `remove/route.ts` Step 3 checks `targetUserId === user.id` and returns 400 `{error:'Cannot remove yourself'}` BEFORE any DB access (confirmed no `ownerLinkMaybeSingle`/`callerAccountMaybeSingle`/delete mock calls in the "self-removal blocked" test). UI-side: `TeamManagementPopup.tsx` renders the `isSelf` row's remove button with `disabled`, `opacity-40 pointer-events-none`, and it is always present in the list (never omitted), labeled via `ownerSelfLabel` ("(Sinä) Omistaja"). This is documented as UI-only defense-in-depth (T-64-15) — the real block is server-side and unit-tested. |

**Score:** 4/4 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/api/business/access-request/list/route.ts` | New service-role GET Route Handler | ✓ VERIFIED | Exists, exports `GET`, venue-scoped owner auth, identity resolution via `supabaseAdmin.auth.admin.getUserById`, no `lib/email` import |
| `app/api/business/access-request/remove/route.ts` | New service-role POST Route Handler | ✓ VERIFIED | Exists, exports `POST`, self-block first, venue-scoped owner auth, literal DELETE with count guard, no `lib/email` import |
| `tests/api/access-request-list.test.ts` | Vitest unit coverage (5 cases) | ✓ VERIFIED | All 5 cases pass |
| `tests/api/access-request-remove.test.ts` | Vitest unit coverage (6 cases) | ✓ VERIFIED | All 6 cases pass; genuine assertions on mock call args, not vacuous |
| `supabase/migrations/20260702000000_business_accounts_display_name.sql` | New migration adding `display_name TEXT` | ✓ VERIFIED | Exists; `ALTER TABLE ... ADD COLUMN IF NOT EXISTS display_name TEXT`; no GRANT/REVOKE added. Confirmed applied to the linked remote Supabase project via `npx supabase migration list` — `20260702000000` present in both `local` and `remote` columns. |
| `app/api/business/register/route.ts` | Invite-path insert extended with `display_name` | ✓ VERIFIED | `display_name` parsed (`.trim().slice(0,100)`), included in the invite-path `business_accounts.insert(...)` |
| `app/business/rekisteroidy/page.tsx` | Invite-wiring fix + name input | ✓ VERIFIED (with a caveat) | Reads `paikka_id` via `useSearchParams`, sends `invite`/`display_name`, redirects to `/business/liity?paikka_id=X` on success. **Caveat (WR-02):** the recovery-mode branch (`detectRecovery`, line 54) unconditionally `router.replace('/business')`, ignoring `isInvitePath` — an interrupted invite signup that already has a `business_accounts` row will be recovery-redirected to the generic dashboard instead of back to `/business/liity?paikka_id=X`, stranding that user. This is a real gap in the invite-recovery edge case, flagged by code review (64-REVIEW.md WR-02), not disproven by this verification. |
| `app/components/TeamManagementPopup.tsx` | New client popup component | ✓ VERIFIED | Exists, default-exports `TeamManagementPopup`, fetches list endpoint with bearer token, renders both sections, wires approve/reject/remove with correct body contracts, no `dangerouslySetInnerHTML` |
| `app/components/DiagonaalKortti.tsx` | New `onManageTeam` prop + Users icon | ✓ VERIFIED | `onManageTeam?: () => void` in `dashboardActions`; `Users` icon imported and rendered last in the icon row; no badge/dot; reuses exact `w-7 h-7`/`panelShade` conditional and `stopPropagation`/`preventDefault` guards |
| `app/business/page.tsx` | Popup state, D-02 visibility gate, popup instance | ✓ VERIFIED | `teamPopupPaikkaId`, `teamSummaryByPaikkaId` state present; D-02 gate expression matches plan exactly; `TeamManagementPopup` imported and rendered with `onChanged={() => checkState()}` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `DiagonaalKortti` Users button | `app/business/page.tsx` `onManageTeam` handler | `dashboardActions.onManageTeam()` → `setTeamPopupPaikkaId` | ✓ WIRED | Handler passed through props, click guards present |
| `app/business/page.tsx` | `TeamManagementPopup` | `<TeamManagementPopup open paikkaId onClose onChanged>` | ✓ WIRED | Instance rendered, `onChanged` re-invokes `checkState` |
| `TeamManagementPopup` | `GET /api/business/access-request/list` | `fetch(...)` with `Authorization: Bearer <session token>` | ✓ WIRED | Confirmed via source; bearer-token pattern matches `liity/page.tsx` |
| `TeamManagementPopup` Approve | `POST /api/business/access-request/approve` | `fetch` with `{request_id}` | ✓ WIRED | Body contract matches existing endpoint |
| `TeamManagementPopup` Reject | `POST /api/business/access-request/reject` | `fetch` with `{request_id}`, no `reason` | ✓ WIRED | D-13 confirmed — no reason field sent |
| `TeamManagementPopup` Remove confirm | `POST /api/business/access-request/remove` | `fetch` with `{paikka_id, target_user_id}` | ✓ WIRED | Body contract matches new endpoint |
| `app/business/page.tsx` D-02 gate | `GET /api/business/access-request/list` (per venue) | `Promise.all` over approved-not-kesken venues | ✓ WIRED (with caveat WR-04) | Reuses same list endpoint (no second fetch path, per plan); however the gate fetch is issued for every approved venue regardless of the caller's own role, so `role:'member'` accounts always get a doomed 403 on this call, and both "confirmed zero" and "transient error" collapse into the same fail-closed zero (see Anti-Patterns WR-04) |
| `app/business/rekisteroidy/page.tsx` | `/business/liity?paikka_id=X` | `router.push` on invite success | ✓ WIRED (happy path); ⚠️ gap on recovery path (WR-02) | |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| ACCESS-04 | 64-01, 64-03, 64-04 | Paikan päähallitsija näkee odottavat hallintaoikeuspyynnöt `/business`-dashboardissa ja voi hyväksyä/hylätä; sub-managerit eivät voi hyväksyä toisten pyyntöjä | ✓ SATISFIED | List endpoint + popup UI + venue-scoped owner auth on approve/reject (Truths 1 & 2 above) |
| ACCESS-07 | 64-02, 64-04 | Päähallitsija voi poistaa sub-managerin hallintaoikeuden paikasta; päähallitsijaa itseään ei voi poistaa tämän virran kautta | ✓ SATISFIED | Remove endpoint + inline confirm UI + server hard self-block (Truths 3 & 4 above) |

No orphaned requirements — REQUIREMENTS.md's traceability table maps exactly ACCESS-04 and ACCESS-07 to Phase 64, and both appear in PLAN frontmatter (`64-01`: ACCESS-04, `64-02`: ACCESS-07, `64-03`: ACCESS-04, `64-04`: ACCESS-04 + ACCESS-07).

### Anti-Patterns Found

Carried forward from `64-REVIEW.md` (0 critical, 5 warning, 3 info) and independently confirmed by source read during this verification:

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/components/TeamManagementPopup.tsx` | 117-143 | `handleApprove` doesn't add the newly-approved member into local `teamMembers` state | ⚠️ Warning (WR-01) | Owner sees the approved person vanish from "Pending requests" but must close/reopen the popup to see them in "Current team" — real stale-UI gap in the core flow, does not break the underlying approve action |
| `app/business/rekisteroidy/page.tsx` | 54 | Recovery-mode redirect unconditionally `router.replace('/business')`, ignoring `isInvitePath` | ⚠️ Warning (WR-02) | An interrupted invite-link signup that already created its `business_accounts` row gets recovery-redirected to the generic dashboard instead of back to `/business/liity?paikka_id=X`, stranding the pending access request submission |
| `app/api/business/access-request/list/route.ts` | 92-101 | Unguarded `Promise.all` over `getUserById` calls, no try/catch | ⚠️ Warning (WR-03) | One transient identity-lookup failure produces an uncaught exception → framework 500 → the whole popup (both sections) fails to load, instead of degrading gracefully for just that one row |
| `app/business/page.tsx` | 217-244 | D-02 gate fetch has no caller-role pre-check; every approved venue is queried regardless of role, and 403/transient-error/confirmed-zero all collapse to the same silent `{0,0}` | ⚠️ Warning (WR-04) | `role:'member'` accounts issue a doomed 403 fetch per approved venue on every dashboard load; a genuine owner hitting a transient network error sees the team icon silently vanish with no distinguishing signal from "nothing pending" |
| `app/api/business/register/route.ts`, `app/api/business/access-request/remove/route.ts` | various | Raw Postgres/PostgREST error text (`detail: error.message`) returned in 500 responses | ⚠️ Warning (WR-05) | Potential internal schema detail leak to an authenticated caller who triggers a 500; pre-existing pattern elsewhere in the codebase |
| `app/api/business/access-request/list/route.ts` | 71-76 | `created_at` selected but unused; no `.order()` on pending requests | ℹ️ Info (IN-01) | Pending request order is undefined/incidental, not a queue-order guarantee |
| `app/business/page.tsx` | 133 | `link.claim_status as 'approved'\|'rejected'\|'pending'` unsafe cast | ℹ️ Info (IN-02) | Schema drift would silently mis-render status pill, no crash/signal |
| `app/components/TeamManagementPopup.tsx` | 105-106, 135-136, 164-165, 194-195 | Same generic error copy (`teamActionError`) used for both load and action failures | ℹ️ Info (IN-03) | Minor UX ambiguity |

No debt markers (`TBD`/`FIXME`/`XXX`) found in any file touched by this phase (`grep` across all 7 modified/created source files returned zero matches).

No prohibitions violated: `dangerouslySetInnerHTML` absent from `TeamManagementPopup.tsx`; no `GRANT UPDATE`/`REVOKE UPDATE (display_name)` in the migration; no `'removed'` literal written to `claim_status` (literal `DELETE` used); `remove/route.ts` and `list/route.ts` import no `lib/email`; no notification badge/dot rendered on the Users icon (D-04).

### Automated Verification Run (this session)

| Check | Command | Result |
|-------|---------|--------|
| Phase-scoped unit tests | `npx vitest run tests/api/access-request-list.test.ts tests/api/access-request-remove.test.ts tests/api/register.test.ts` | ✓ PASS — 18/18 |
| Full suite regression | `npx vitest run` | ✓ PASS — 246/246, 23 files |
| Typecheck | `npx tsc --noEmit` | ✓ PASS — clean |
| i18n key parity | Node script checking 18 new keys in `messages/fi.json` + `messages/en.json` | ✓ PASS — all present in both locales |
| Migration applied to remote | `npx supabase migration list` | ✓ PASS — `20260702000000` present in both `local` and `remote` columns |
| Commit evidence | `git log --oneline` | ✓ PASS — all 8 task commits (`d6107cf`, `ba1d2a7`, `ad32f98`, `a823178`, `760dd81`, `04e655e`, `720c8ea`, `67dd1ea`, `323c506`) found in history |

### Human Verification Required

See frontmatter `human_verification` for the structured list. Summary:

1. **Popup interaction end-to-end** — open popup, approve/reject a pending row, confirm owner's disabled row, confirm remove inline-confirm step (harvested from 64-04-PLAN.md Task 1's deferred `<human-check>`, also 64-VALIDATION.md).
2. **Icon-row wrap at both breakpoints** — up to 4 icons (Preview/Edit/Invite-link/Team) on one row, mobile + desktop (64-04-PLAN.md Task 2's deferred `<human-check>`, Pitfall 6).
3. **D-02 icon visibility across venue states** — pending-request venue shows icon, empty-approved venue does not, kesken/rejected never show it, icon disappears once cleared (64-04-PLAN.md Task 3's deferred `<human-check>`).
4. **Invite-link end-to-end signup** — new account lands as pending member of the correct company, not owner of a bogus one (64-03-PLAN.md deferred verification, 64-VALIDATION.md). Recommend specifically covering the interrupted/recovery edge case given the WR-02 finding above.

### Gaps Summary

No FAILED truths and no missing/stub artifacts — the four roadmap success criteria all have working, tested, server-enforced implementations, and the full automated suite (246 tests) plus typecheck are green. The phase is not `passed` because:

1. A meaningful set of visual/interactive behaviors (popup UX, icon visibility gating, responsive icon-row layout, invite-link end-to-end signup) were explicitly deferred to human verification by the plan authors themselves (no component/UI test harness exists in this codebase) — these are outstanding, not failed.
2. Code review (64-REVIEW.md) found 5 real warning-level issues, most notably WR-01 (stale "Current team" list after approve) and WR-02 (invite-recovery redirect drops invite context) — both are genuine, source-confirmed gaps in the delivered UX/flow, though neither breaks the core server-enforced authorization guarantees the four roadmap truths require. These are not blocking the phase goal but should be triaged (a follow-up plan or accepted as known debt).

