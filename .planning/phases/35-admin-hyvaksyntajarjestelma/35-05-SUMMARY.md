---
phase: 35-admin-hyvaksyntajarjestelma
plan: "05"
subsystem: api-routes
tags: [admin, email, notifications, business-registration]
dependency_graph:
  requires: [35-03, 35-04]
  provides: [admin-notification-on-claim, admin-notification-on-create, admin-notification-on-onboarding, role_in_company-in-register]
  affects: []
tech_stack:
  added: []
  patterns: [non-critical-email-wrapped-in-try-catch]
key_files:
  created: []
  modified:
    - app/api/business/register/route.ts
    - app/api/business/claim-paikka/route.ts
    - app/api/business/create-paikka/route.ts
    - app/api/business/onboarding/submit/route.ts
decisions:
  - "sendAdminNotificationEmail wrapped in try/catch in all three submit routes — email failure never blocks user-facing action"
  - "onboarding/submit Step 2 link query extended to select link_type alongside id — avoids a second round-trip for the notification"
metrics:
  duration: "8 minutes"
  completed: "2026-06-10"
  tasks_completed: 4
  tasks_total: 4
---

# Phase 35 Plan 05: Admin Notification Emails + role_in_company Summary

Extended four Route Handlers with admin notification emails (sendAdminNotificationEmail from lib/email.ts) and added role_in_company field to the registration route.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | register/route.ts — save role_in_company | a462c18 | app/api/business/register/route.ts |
| 2 | claim-paikka/route.ts — admin notification | a462c18 | app/api/business/claim-paikka/route.ts |
| 3 | create-paikka/route.ts — admin notification | a462c18 | app/api/business/create-paikka/route.ts |
| 4 | onboarding/submit/route.ts — admin notification | a462c18 | app/api/business/onboarding/submit/route.ts |

## What Was Built

**register/route.ts:** Parses `role_in_company` from request body (optional string, trimmed, max 100 chars, null if empty). Saved to `business_accounts` INSERT alongside `user_id` and `company_name`. No email notification here — admin is notified by claim/create/onboarding routes.

**claim-paikka/route.ts:** After the `is_claimed` UPDATE, fetches company name, venue name, and link ID then calls `sendAdminNotificationEmail` with `linkType: 'claim'`. Entire block is wrapped in try/catch.

**create-paikka/route.ts:** After the `is_claimed` UPDATE (Step 3), fetches same three fields using `newPaikkaId` and calls `sendAdminNotificationEmail` with `linkType: 'created'`. Entire block is wrapped in try/catch.

**onboarding/submit/route.ts:** Step 2 ownership check query extended from `select('id')` to `select('id, link_type')` to make `link_type` available for the notification without an extra round-trip. After the draft DELETE, calls `sendAdminNotificationEmail` using `link.link_type as 'claim' | 'created'`. Entire block is wrapped in try/catch.

## Deviations from Plan

**1. [Rule 1 - Bug] Extended onboarding/submit Step 2 query to include link_type**
- **Found during:** Task 4
- **Issue:** The plan's notification block uses `link.link_type` but the existing Step 2 query only selected `id`. Adding a separate query would be an unnecessary round-trip.
- **Fix:** Extended the existing `select('id')` to `select('id, link_type')` — same single query, no extra DB call.
- **Files modified:** app/api/business/onboarding/submit/route.ts
- **Commit:** a462c18

## Known Stubs

None.

## Threat Flags

None. No new network endpoints, auth paths, or schema changes introduced — only additions to existing routes that already require JWT auth.

## Self-Check: PASSED

- app/api/business/register/route.ts: FOUND (commit a462c18)
- app/api/business/claim-paikka/route.ts: FOUND (commit a462c18)
- app/api/business/create-paikka/route.ts: FOUND (commit a462c18)
- app/api/business/onboarding/submit/route.ts: FOUND (commit a462c18)
