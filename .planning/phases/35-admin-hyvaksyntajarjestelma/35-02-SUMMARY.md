---
phase: 35-admin-hyvaksyntajarjestelma
plan: "02"
subsystem: i18n
tags: [i18n, admin, business, strings]
dependency_graph:
  requires: []
  provides:
    - Admin i18n namespace (FI+EN, 26 keys each)
    - Business.roleInCompanyLabel and role keys (FI+EN)
    - Business.rejectionReasonLabel and reapplyCta (FI+EN)
  affects:
    - messages/fi.json
    - messages/en.json
tech_stack:
  added: []
  patterns:
    - next-intl JSON message files (existing pattern)
key_files:
  created: []
  modified:
    - messages/fi.json
    - messages/en.json
decisions:
  - Admin namespace added as top-level key (same level as Business, Auth, etc.) — consistent with project i18n structure
metrics:
  duration: "~5 minutes"
  completed: "2026-06-10T14:13:55Z"
  tasks_completed: 2
  files_modified: 2
---

# Phase 35 Plan 02: Admin i18n strings Summary

**One-liner:** Finnish and English i18n strings for Admin approval UI, rejection flow, and Business role-in-company field — 26 Admin keys + 7 Business keys added to both locale files.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add Admin namespace + Business role keys to messages/fi.json | 6517239 | messages/fi.json |
| 2 | Add Admin namespace + Business role keys to messages/en.json | 6517239 | messages/en.json |

Note: Tasks 1 and 2 were committed atomically as a single commit since they form one logical unit (paired FI/EN translations).

## What Was Built

### Admin namespace (26 keys, both languages)
- Page title, empty state message
- Application type labels (Claim / New venue)
- Table column labels (Company, Venue, Role, Submitted)
- Action CTAs (View details, Approve, Reject, Cancel)
- In-progress state strings (Approving..., Rejecting...)
- Rejection reason placeholder and confirm CTA
- Error strings (unauthorized, generic)
- Success strings (approved, rejected)
- Detail panel labels (title, media, pricing, hours, contact, no-media fallback)

### Business namespace additions (7 keys, both languages)
- `roleInCompanyLabel` — form field label for role-in-company step
- `roleOwner`, `roleManager`, `roleMarketing`, `roleOther` — role option labels
- `rejectionReasonLabel` — label shown on rejected applications
- `reapplyCta` — CTA button on rejected application screen

## Verification

- Both JSON files parse without errors (validated with `node -e "JSON.parse(...)"`)
- All 26 Admin keys present in both fi.json and en.json
- All 7 Business role/rejection keys present in both fi.json and en.json
- All pre-existing Business namespace keys intact (verified by explicit key check)
- No existing keys removed or modified

## Deviations from Plan

None — plan executed exactly as written.

The worktree branch was 231 commits behind master (branch was created at Phase 28; master has advanced to Phase 35). The `messages/` directory was added to master after this branch diverged. A `git rebase master` was performed before executing the tasks to bring the worktree up to date. This is expected worktree lifecycle behavior, not a plan deviation.

## Known Stubs

None — this plan only adds string constants to JSON files.

## Threat Flags

None — JSON message files have no security surface (no network endpoints, no auth paths, no schema changes).

## Self-Check: PASSED

- [x] messages/fi.json exists and contains Admin namespace
- [x] messages/en.json exists and contains Admin namespace
- [x] Commit 6517239 exists
- [x] Both files parse as valid JSON
