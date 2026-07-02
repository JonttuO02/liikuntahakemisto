---
status: resolved
trigger: "UAT Test 3 (Phase 64: hallintaoikeuspyynn-t-dashboard-ui) — Team icon visibility gate (D-02) across venue states"
created: 2026-07-02T14:00:00Z
updated: 2026-07-02T17:55:00Z
---

## Current Focus

status: root cause confirmed — diagnose-only mode, stopping here (goal: find_root_cause_only)
hypothesis: CONFIRMED — handleApprove in TeamManagementPopup.tsx only calls setPendingRequests to remove the row; it never calls setTeamMembers to append the newly-approved member.
next_action: none — return ROOT CAUSE FOUND to caller.

## Symptoms

expected: |
  After clicking Approve on a pending request in the team management popup, the approved member is added to the 'Current team' list immediately (same render pass), without needing to close and reopen the popup.
actual: |
  User reported: "works well except one little fix. When approving request the member isnt added to the list below right after clicking, you need to reopen the popup tp see the updated list. To get better feeling it should happen right after."
errors: |
  None reported — no console/network errors mentioned, purely a stale-UI-after-mutation issue.
reproduction: |
  Test 3 in UAT (.planning/phases/64-hallintaoikeuspyynn-t-dashboard-ui/64-UAT.md). Open /business as a päähallitsija (owner) of a venue that has at least one pending business_access_requests row. Click the Users icon on the venue's DiagonaalKortti to open the team management popup. Click Approve on a pending row. Observe: the row is removed from 'Pending requests' but the approved user is NOT added to 'Current team' until the popup is closed and reopened.
started: Discovered during UAT of Phase 64 (hallintaoikeuspyynn-t-dashboard-ui), which built the team management popup (approve/reject/remove flow) on the /business dashboard.

## Eliminated

## Evidence

- timestamp: 2026-07-02T14:05:00Z
  checked: app/components/TeamManagementPopup.tsx (full file, 369 lines)
  found: |
    Two separate pieces of local state back the two list sections:
    `pendingRequests` (PendingRequestRow[]) and `teamMembers` (TeamMemberRow[]),
    both populated once on popup open via GET /api/business/access-request/list
    (lines 85-115).

    `handleApprove` (lines 117-143): on `res.ok`, it does:
      setPendingRequests(prev => prev.filter(r => r.id !== requestId))
      onChanged?.()
    It never calls `setTeamMembers(...)`. So the "Pending requests" list
    correctly shrinks (row removed), but "Current team" is never given the
    newly-approved member — it stays exactly as it was at popup-open time.

    Contrast with `handleConfirmRemove` (lines 174-202), which correctly
    updates the list it affects: `setTeamMembers(prev => prev.filter(m =>
    m.userId !== userId))`. Approve is the only one of the three mutation
    handlers (approve/reject/remove) that needs to touch the *other* list
    (move a row from pendingRequests to teamMembers) — and it's the only one
    that doesn't do it.

    `onChanged?.()` (called after approve) is a callback prop from the parent
    (app/business/page.tsx) used to refresh the *dashboard's* venue cards
    (e.g. team icon visibility gate D-02) — it does not touch the popup's own
    `teamMembers` state, so it does not mask/fix this bug. Popup-local state
    is only ever repopulated by the `open`/`paikkaId` effect (lines 85-115),
    which only re-runs when the popup transitions from closed to open —
    exactly matching the reported workaround ("reopen the popup to see the
    updated list").
  implication: Root cause confirmed — missing local state update, not a fetch/timing/network issue.

- timestamp: 2026-07-02T14:07:00Z
  checked: app/api/business/access-request/approve/route.ts (full file)
  found: |
    POST /api/business/access-request/approve returns only `{ ok: true }` on
    success — no member data in the response body. Server-side (step 7a) it
    sets `business_accounts.role = 'member'` for the requester and upserts a
    `business_paikka_links` row with `claim_status: 'approved'`. So a correct
    fix has two viable data sources: (a) construct the new TeamMemberRow
    client-side from the pendingRequests row being approved (id/requesterId/
    name/email are already in local state — requesterId -> userId, role:
    'member' literal, isSelf: false, since a pending requester is never the
    approving owner), or (b) have the approve route return enough data to
    build the row, or (c) refetch the list endpoint after a successful
    approve. Confirms the bug is fixable without any new backend fields if
    the client-side construction approach (a) is chosen.
  implication: Multiple valid fix directions exist; simplest is appending a client-constructed TeamMemberRow inside handleApprove's success branch, mirroring the pattern already used for removal.

## Resolution

root_cause: |
  app/components/TeamManagementPopup.tsx `handleApprove` (lines 117-143) only
  updates `pendingRequests` state (filters out the approved row) after a
  successful approve call. It never appends the newly-approved member to the
  `teamMembers` state array, which is what backs the "Current team" section.
  Since `teamMembers` is only ever populated by the fetch effect that runs on
  popup open (lines 85-115), the approved member does not appear in "Current
  team" until the popup is closed and reopened (triggering a fresh fetch).
  This is purely a missing local-state-update bug, not a network/timing/RLS
  issue — no errors occur because the mutation itself (server-side approve)
  succeeds correctly; only the client's optimistic UI update is incomplete.
fix:
verification:
files_changed: []
