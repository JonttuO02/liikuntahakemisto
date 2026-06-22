---
status: complete
phase: 53-google-places-datan-ja-synkkauksen-poisto
source: [53-01-SUMMARY.md, 53-02-SUMMARY.md, 53-03-SUMMARY.md]
started: 2026-06-22T18:35:19Z
updated: 2026-06-22T18:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server, start fresh (`npm run dev` or equivalent). App boots without errors and the homepage loads. No errors referencing the deleted `sync-paikat` route or the new migration files.
result: pass

### 2. Admin sync route is fully gone
expected: Visiting `/api/admin/sync-paikat` (any method) returns a 404 — the route no longer exists. No part of the admin UI references it.
result: pass

### 3. Homepage map view reflects the emptied database
expected: |
  Open `/` (map view). Because Wave 2 deleted ALL 327 `liikuntapaikat` rows (not just
  unclaimed ones — an operator-approved deviation from the original plan), the map should
  now show ZERO venue markers anywhere. This is a major, highly visible change — confirm
  it's the expected current state of the database, not a bug, before passing this test.
result: pass

### 4. List view reflects the emptied database
expected: |
  Open `/?nakyma=lista` (list view). The list should show zero liikuntapaikat cards /
  an empty state, consistent with the database wipe. Confirm the empty state renders
  cleanly (no crash, no infinite spinner) rather than erroring out.
result: pass

### 5. Affected business accounts show a sane "no venue" state
expected: |
  Two business accounts (paikka_id 10/14/18/24/25, previously claimed) had their
  `business_paikka_links` and `business_branding` rows cascade-deleted along with
  their venue. Log in as one of those business accounts (or inspect `/business`
  dashboard behavior for an account with zero linked venues) and confirm the
  dashboard shows a reasonable "no claimed venue" / onboarding state rather than
  crashing, showing stale cached data, or 500ing.
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
