---
phase: 33-claim-paikan-luonti
plan: "02"
subsystem: i18n
tags: [i18n, business, claim, next-intl]
dependency_graph:
  requires: []
  provides:
    - messages/fi.json Business namespace Phase 33 keys
    - messages/en.json Business namespace Phase 33 keys
  affects:
    - app/components/ClaimSearchForm.tsx (Wave 3, Plan 33-05)
    - app/business/page.tsx (Wave 3, Plan 33-06)
tech_stack:
  added: []
  patterns:
    - next-intl Business namespace extension
key_files:
  created: []
  modified:
    - messages/fi.json
    - messages/en.json
decisions:
  - Appended new keys after dashboardComingSoon to maintain JSON structure and Phase 32 key order
metrics:
  duration: "5m"
  completed: "2026-06-05"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 2
---

# Phase 33 Plan 02: i18n Business Namespace — Claim/Create Keys — Summary

**One-liner:** 26 claim/create UI strings added to Business namespace in fi.json and en.json, covering search, result cards, claim confirmation, create form, error states, and Path B pending placeholder.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add Phase 33 Business keys to fi.json | 37d8234 | messages/fi.json |
| 2 | Add Phase 33 Business keys to en.json | c2e66c5 | messages/en.json |

## What Was Built

Added 26 new keys to the `Business` namespace in both `messages/fi.json` and `messages/en.json`. Keys cover:

- **Path A — Claim/Create UI:** `claimTitle`, `searchNamePlaceholder`, `searchAllCities`, `searchHelperText`, `createInstead`
- **Search results:** `searchNoResults`, `searchMinChars`
- **Result cards:** `resultSelectCta`, `resultAlreadyClaimed`
- **Step 2 — Claim confirmation:** `backToSearch`, `selectedVenueLabel`, `claimCta`, `claiming`
- **Step 3 — Create form:** `createTitle`, `createNamePlaceholder`, `createAddressPlaceholder`, `createCta`, `creating`
- **Error states:** `errorClaimFailed`, `errorClaimAlreadyTaken`, `errorCreateFailed`, `errorNameRequired`, `errorAddressRequired`
- **Path B — Pending status:** `pendingTitle`, `pendingVenueLabel`, `pendingBody`

All 15 existing Phase 32 Business namespace keys were preserved unchanged.

## Verification Results

- `node -e "require('./messages/fi.json')"` exits 0 (valid JSON)
- `node -e "require('./messages/en.json')"` exits 0 (valid JSON)
- All 26 new keys present in both files
- All 15 existing Phase 32 keys present and unchanged in both files

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. These are static i18n strings with no runtime data dependency.

## Threat Flags

None. Static JSON files in version control; no runtime trust boundary introduced.

## Self-Check: PASSED

- messages/fi.json exists and contains all 26 new keys: FOUND
- messages/en.json exists and contains all 26 new keys: FOUND
- Commit 37d8234 (fi.json): FOUND
- Commit c2e66c5 (en.json): FOUND
- Existing Phase 32 keys preserved in both files: VERIFIED
