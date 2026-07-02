---
status: diagnosed
phase: 64-hallintaoikeuspyynn-t-dashboard-ui
source: [64-VERIFICATION.md]
started: 2026-07-02T13:35:00Z
updated: 2026-07-02T13:55:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Open the team management popup and approve/reject/remove flow
expected: Open /business as a päähallitsija of a venue with a pending request and a sub-manager. Click the Users icon on the venue's DiagonaalKortti. The popup opens with both 'Pending requests' and 'Current team' sections. Approve/Reject buttons act on a pending row and remove it from the list. The owner's own row shows a disabled/grayed remove control labeled '(Sinä) Omistaja'. Clicking remove on a sub-manager row shows an inline confirm step before the DELETE fires.
result: pass

### 2. Icon-row wrap at mobile/desktop breakpoints
expected: On /business, render a DiagonaalKortti for an approved venue that also has the invite-link-copy affordance, edit, and preview icons all visible simultaneously. All icons (up to 4: Preview + Edit + CopyInviteLink + Team) fit on one row without wrapping, at both mobile (w-full) and desktop (sm:w-[396px]) widths.
result: pass

### 3. Team icon visibility gate (D-02) across venue states
expected: Open /business as an owner. (1) Confirm a venue with >=1 pending request OR >=1 sub-manager beyond the owner shows the Users icon. (2) Confirm an approved-but-empty venue (owner only, zero pending requests) shows NO icon (D-02). (3) Confirm the icon does not appear on kesken/pending/rejected cards. (4) After the last pending request is handled and the last sub-manager removed, confirm the icon disappears on the next dashboard load. Icon visibility exactly matches the D-02 gate rule in every venue state.
result: issue
reported: "works well except one little fix. When approving request the member isnt added to the list below right after clicking, you need to reopen the popup tp see the updated list. To get better feeling it should happen right after."
severity: minor

### 4. End-to-end invite-link signup
expected: Walk a fresh invite link (/business/liity?paikka_id=X → rekisteroidy → back to liity) end-to-end as a new, unauthenticated test account in an incognito session. The new account lands as a pending member (company_id set, role='member') of the inviting venue's company, and a business_access_requests row exists for that venue — not the owner of a newly created bogus company. NOTE: source review found a related bug (WR-02) in the recovery-redirect branch that can strand an interrupted invite signup — worth confirming this specific edge case during UAT.
result: pass

## Summary

total: 4
passed: 3
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "After approving a pending request, the approved member appears in the 'Current team' list immediately, without reopening the popup"
  status: failed
  reason: "User reported: works well except one little fix. When approving request the member isnt added to the list below right after clicking, you need to reopen the popup tp see the updated list. To get better feeling it should happen right after."
  severity: minor
  test: 3
  root_cause: "app/components/TeamManagementPopup.tsx handleApprove (lines 117-143) updates only pendingRequests state on success (setPendingRequests filter) but never updates teamMembers state. teamMembers is only repopulated by the fetch effect that runs on popup open, so the approved member doesn't show until the popup is closed and reopened. handleConfirmRemove correctly updates its list (setTeamMembers filter); handleApprove is the only mutation handler that needs to move a row between two lists and fails to do so."
  artifacts:
    - path: "app/components/TeamManagementPopup.tsx"
      issue: "handleApprove success branch missing setTeamMembers update to append the newly-approved member"
  missing:
    - "In handleApprove's res.ok branch, look up the approved row from pendingRequests by requestId and append a constructed TeamMemberRow ({ userId: row.requesterId, name: row.name, email: row.email, role: 'member', isSelf: false }) into teamMembers via setTeamMembers(prev => [...prev, newRow]), mirroring the optimistic-update pattern already used in handleConfirmRemove."
  debug_session: ".planning/debug/team-list-no-refresh-approve.md"
