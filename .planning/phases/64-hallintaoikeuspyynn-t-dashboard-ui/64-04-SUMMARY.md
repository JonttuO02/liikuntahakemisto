---
phase: 64-hallintaoikeuspyynn-t-dashboard-ui
plan: 04
subsystem: ui
tags: [nextjs, react, framer-motion, next-intl, supabase, business-dashboard]

# Dependency graph
requires:
  - phase: 64-01
    provides: "GET /api/business/access-request/list — service-role read of pending requests + team members with resolved identity (display_name/email fallback)"
  - phase: 64-02
    provides: "POST /api/business/access-request/remove — venue-scoped sub-manager removal with hard self-removal block"
  - phase: 64-03
    provides: "business_accounts.display_name column"
  - phase: 60
    provides: "POST /api/business/access-request/{approve,reject} — existing venue-scoped owner-authorized decision endpoints"
  - phase: 63
    provides: "DiagonaalKortti dashboardActions icon-button panel pattern (Eye/Pencil/Link2/AlertCircle)"
provides:
  - "TeamManagementPopup — the single combined ACCESS-04/ACCESS-07 dashboard UI entry point"
  - "DiagonaalKortti onManageTeam icon (Users glyph, always last in the icon row)"
  - "D-02 icon visibility gate in app/business/page.tsx (teamSummaryByPaikkaId)"
affects: [business-dashboard, access-requests, team-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Popup scaffolding copied verbatim from RejectionReasonPopup.tsx (backdrop/panel/Escape/close), widened to max-w-md with max-h-[60vh] overflow-y-auto for two list sections"
    - "Inline two-state confirm row (no separate modal) for destructive actions, matching app/admin/[id]/page.tsx's rejectingOpen pattern"
    - "D-02-style visibility gate: reuse an existing service-role list endpoint at render time instead of adding a second count-only fetch path"

key-files:
  created:
    - app/components/TeamManagementPopup.tsx
  modified:
    - app/components/DiagonaalKortti.tsx
    - app/business/page.tsx
    - messages/fi.json
    - messages/en.json

key-decisions:
  - "checkState() in app/business/page.tsx converted from an effect-local async function to a useCallback so it can be re-invoked from TeamManagementPopup's onChanged prop after approve/reject/remove"
  - "D-02 gate summary (pendingCount, memberBeyondOwnerCount) is computed once per approved-and-not-kesken venue via Promise.all against the same GET .../access-request/list endpoint the popup itself calls on open — no second/separate gate-only endpoint was added, per plan instruction"
  - "removeConfirmBody i18n placeholder standardized on {name} in both fi.json and en.json (UI-SPEC's copy table showed {nimi} for the fi string and {name} for the en string, but next-intl requires the same placeholder key across locales for a shared call site)"

patterns-established:
  - "Per-venue service-role summary fetch for icon-visibility gating, fail-closed on error (icon hidden, no broken control on transient failure)"

requirements-completed: [ACCESS-04, ACCESS-07]

coverage:
  - id: D1
    description: "One team-management icon (Users glyph) on DiagonaalKortti's dashboardActions panel opens a single combined popup with Pending requests + Current team sections"
    requirement: ACCESS-04
    verification:
      - kind: unit
        ref: "npx tsc --noEmit (source-level: onManageTeam prop + button wiring)"
        status: pass
    human_judgment: true
    rationale: "No component test harness exists for DiagonaalKortti/TeamManagementPopup in this repo (established convention per 64-VALIDATION.md Manual-Only Verifications) — visual rendering and popup open/close behavior require manual UAT."
  - id: D2
    description: "Icon renders only when the venue has >=1 pending request OR >=1 team member beyond the owner (D-02); hidden for approved-but-empty (owner-only) venues"
    requirement: ACCESS-04
    verification:
      - kind: unit
        ref: "npx tsc --noEmit (source-level: D-02 gate expression in DashboardVenueCard)"
        status: pass
    human_judgment: true
    rationale: "Gate logic is source-verifiable but the actual show/hide behavior across venue states requires visual confirmation — no UI test harness in this codebase (64-VALIDATION.md)."
  - id: D3
    description: "Approve/Reject call the existing Phase 60 endpoints (request_id body, no reason field for reject per D-13)"
    requirement: ACCESS-04
    verification:
      - kind: unit
        ref: "npx tsc --noEmit; source assertion — fetch bodies contain only request_id"
        status: pass
    human_judgment: true
    rationale: "Approve/reject Route Handlers already have existing coverage from Phase 60; the popup's wiring to them is new UI code with no dedicated test file — manual click-through confirms end-to-end behavior."
  - id: D4
    description: "Owner's own row shown in Current team labeled '(Sinä) Omistaja' with remove control disabled (opacity-40 pointer-events-none), never omitted (D-14)"
    requirement: ACCESS-07
    verification:
      - kind: unit
        ref: "grep -c dangerouslySetInnerHTML app/components/TeamManagementPopup.tsx returns 0; source assertion — isSelf branch renders disabled Trash2 button"
        status: pass
    human_judgment: true
    rationale: "Visual disabled-state confirmation requires manual UAT (64-VALIDATION.md Manual-Only Verifications)."
  - id: D5
    description: "Removing a sub-manager requires an inline two-state confirm before DELETE fires (D-10), wired to POST /api/business/access-request/remove with paikka_id + target_user_id"
    requirement: ACCESS-07
    verification:
      - kind: unit
        ref: "npx tsc --noEmit; source assertion — remove fetch body contains paikka_id and target_user_id"
        status: pass
    human_judgment: true
    rationale: "Interactive click-through confirm flow requires manual UAT — no UI test harness in this codebase (64-VALIDATION.md)."
  - id: D6
    description: "Popup fetches data from GET /api/business/access-request/list on open using the session bearer token — never the anon client"
    requirement: ACCESS-04
    verification:
      - kind: unit
        ref: "npx vitest run (full suite, 246 passed, no regressions); source assertion — Authorization header + access-request/list URL"
        status: pass
    human_judgment: false

# Metrics
duration: ~35min
completed: 2026-07-02
status: complete
---

# Phase 64 Plan 04: Hallintaoikeuspyynnöt Dashboard UI Summary

**TeamManagementPopup gives venue owners a single Users-icon-triggered dialog to approve/reject pending access requests and remove sub-managers, gated by a D-02 render-time visibility check reusing the existing service-role list endpoint.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-07-02T13:13:45Z
- **Tasks:** 3/3 completed
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- Built `TeamManagementPopup.tsx`, the single combined ACCESS-04/ACCESS-07 entry point — Pending requests section (Approve/Reject wired to the existing Phase 60 endpoints, one-click reject per D-13) and Current team section (remove wired to the Plan 64-02 endpoint via an inline two-state confirm, D-10), with the owner's own row always shown and its remove control disabled (D-14)
- Added the `Users` icon button to `DiagonaalKortti`'s `dashboardActions` panel, always rendered last, reusing the exact `w-7 h-7` shape and `panelShade` conditional of its sibling icons, with no notification badge/dot (D-04)
- Wired the popup into `app/business/page.tsx` behind a D-02 visibility gate: `teamSummaryByPaikkaId` is populated at render time by reusing the same Plan 64-01 list endpoint the popup itself calls (no separate/second gate-only fetch path), computed only for approved-and-not-kesken venues, and fails closed (icon hidden) on a per-venue fetch error
- 15 new i18n keys added to `messages/fi.json`/`messages/en.json`'s `Business` namespace, matching the UI-SPEC's Copywriting Contract table

## Task Commits

Each task was committed atomically:

1. **Task 1: Build TeamManagementPopup component + i18n** - `720c8ea` (feat)
2. **Task 2: Add the onManageTeam icon button to DiagonaalKortti** - `67dd1ea` (feat)
3. **Task 3: Wire the popup + D-02 visibility gate into the business dashboard** - `323c506` (feat)

_No TDD tasks in this plan — all three are `type="auto"` execute tasks._

## Files Created/Modified
- `app/components/TeamManagementPopup.tsx` - New client popup: fetches pending requests + team members on open, wires Approve/Reject/Remove, owner self-protection UI
- `app/components/DiagonaalKortti.tsx` - New `onManageTeam?: () => void` dashboardActions prop + `Users` icon button, last in the icon row
- `app/business/page.tsx` - `teamPopupPaikkaId`/`teamSummaryByPaikkaId` state, `checkState()` converted to `useCallback` for re-invocation, D-02 gate computation, popup instance
- `messages/fi.json` / `messages/en.json` - 15 new `Business` namespace keys (manageTeamCta, teamManagementTitle, sectionPendingRequests, sectionCurrentTeam, pendingEmptyBody, approveCta, rejectCta, ownerSelfLabel, memberRoleBadge, removeAccessAria, ownerCannotRemoveAria, removeConfirmBody, removeConfirmCta, removeCancelCta, teamActionError, teamAlreadyProcessed)

## Decisions Made

- **`checkState()` refactored to `useCallback`:** the plan required `onChanged` on the popup to "re-run checkState() so the D-02 summaries + gate refresh after an approve/reject/remove." Since `checkState` was originally defined inline inside a `useEffect`, it had to be lifted to component scope (wrapped in `useCallback`) to be callable from the popup's `onChanged` prop, then invoked once on mount via a separate `useEffect([checkState])`. This is a mechanical refactor with no behavior change to the mount-time fetch sequence.
- **D-02 gate token/session fetched once per `checkState()` run, not once per venue:** the plan's pseudocode implied fetching `session`/`token` inline per-venue inside the `Promise.all` map; implemented it as a single `getSession()` call before the `Promise.all` to avoid N redundant session reads for N approved venues. Functionally identical, more efficient.
- **`removeConfirmBody` i18n placeholder standardized on `{name}`:** UI-SPEC's Copywriting Contract table literally showed `{nimi}` in the Finnish copy example and `{name}` in the English copy example. next-intl requires the caller to pass the interpolation object matching whichever locale's message is active, so both locale strings must use the same placeholder key at the same call site. Used `{name}` in both `fi.json` and `en.json` (matching the existing single-placeholder convention already used elsewhere, e.g. `dashboardStatusRejectedBody`'s `{reason}`).

## Deviations from Plan

None - plan executed exactly as written. The `checkState`-to-`useCallback` refactor and the single-session-fetch optimization above are implementation details within the plan's own instructions (the plan explicitly required `onChanged` to re-run `checkState()`), not scope changes.

## Issues Encountered

**Worktree missing `node_modules` and `64-PATTERNS.md`:**
- This worktree (`agent-a414e79983a93a5ed`) had no `node_modules` directory, so `npx tsc --noEmit` and `npx vitest run` could not run initially. Created an NTFS junction (`mklink /J`) from the worktree's `node_modules` to the main repo's `node_modules` — a read-only reference, no files were copied or modified in the main repo. This is local-machine tooling setup, not a code change, and was not committed (node_modules is gitignored).
- `.planning/phases/64-hallintaoikeuspyynn-t-dashboard-ui/64-PATTERNS.md` (referenced in the plan's `<context>` block and every task's `<read_first>`) does not exist in this worktree — it is untracked/uncommitted in the main repo's working tree (confirmed via `git status` at session start showing it as `??`), so it was never checked out into this worktree's commit history. Proceeded using `64-RESEARCH.md` and `64-UI-SPEC.md` instead, both of which contain the equivalent guidance (exact code patterns, button classes, popup scaffolding) that PATTERNS.md would have distilled. No gap in implementation guidance resulted.

## User Setup Required

None - no external service configuration required.

## Manual UAT Still Required

Per `64-VALIDATION.md`'s "Manual-Only Verifications" table, the following require human click-through (no component/UI test harness exists in this codebase for `DiagonaalKortti`/`TeamManagementPopup`):

1. Icon visibility: confirm the Users icon only renders on venues with >=1 pending request or >=1 non-owner team member, and stays hidden on approved-but-empty venues (D-02)
2. Popup layout: confirm both sections render, Approve/Reject act on a pending row and remove it from the list
3. Owner self-protection: confirm the owner's own row is visible with a disabled (grayed) remove control labeled "(Sinä) Omistaja"
4. Remove confirm flow: confirm clicking remove on a sub-manager shows the inline confirm before the DELETE fires, and Peruuta/Cancel dismisses without side effects
5. Icon-panel width (Pitfall 6, RESEARCH.md): confirm up to 4 simultaneous icons (Preview + Edit + CopyInviteLink + Team) do not wrap to a second row at both `w-full` (mobile) and `sm:w-[396px]` (desktop)

These are tracked in `64-VALIDATION.md`'s Manual-Only Verifications table and should be exercised during `/gsd-verify-work 64`.

## Next Phase Readiness

ACCESS-04 and ACCESS-07 are both code-complete: `npx tsc --noEmit` passes clean across the whole project, `npx vitest run` is fully green (246/246, no regressions). Phase 64 is the last planned phase in the v3.1 roadmap's dependency chain (59 → 60 → 64, 62 → 63 → 64); no downstream phase currently depends on this plan's output beyond the manual UAT pass noted above.

---
*Phase: 64-hallintaoikeuspyynn-t-dashboard-ui*
*Completed: 2026-07-02*
