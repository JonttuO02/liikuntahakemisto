---
phase: 35-admin-hyvaksyntajarjestelma
plan: "07"
subsystem: business-ui
tags: [registration, role-dropdown, rejection-reason, business-panel]
dependency_graph:
  requires: [35-04]
  provides: [role_in_company-registration, rejection-reason-display]
  affects: [app/business/rekisteroidy/page.tsx, app/business/page.tsx]
tech_stack:
  added: []
  patterns: [glassmorphism-select, rejection-reason-reapply-flow]
key_files:
  created: []
  modified:
    - app/business/rekisteroidy/page.tsx
    - app/business/page.tsx
decisions:
  - "Role dropdown placed between company name and email to match admin review priority order"
  - "Rejection reason + Hae uudelleen rendered inline per-venue (not in a modal) for minimal friction"
metrics:
  duration: "8 minutes"
  completed: "2026-06-10"
  tasks_completed: 2
  files_modified: 2
---

# Phase 35 Plan 07: Role Dropdown and Rejection Reason Display Summary

Role_in_company dropdown added to registration form and business panel extended to display rejection reasons with a reapply CTA.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add role_in_company state + select dropdown to rekisteroidy/page.tsx | 25bed03 |
| 2 | Extend VenueLink type, update Supabase query, show rejection reason + reapply button | 25bed03 |

## What Was Built

### Task 1 — app/business/rekisteroidy/page.tsx

- Added `roleInCompany` state variable alongside existing `companyName`, `email`, `password` states
- Inserted `<select>` dropdown between the company name input and email input, using the same `inputClass` as all other form fields
- Dropdown has placeholder option (disabled) + 4 value options: Omistaja, Johtaja, Markkinointi, Muu
- All labels use `t('roleInCompanyLabel')`, `t('roleOwner')` etc. from the Business i18n namespace (keys verified present in messages/fi.json from plan 35-02)
- `handleSubmit` POST body now includes `role_in_company: roleInCompany`
- Dropdown is `required` and `disabled={loading}` consistent with other fields

### Task 2 — app/business/page.tsx

- `VenueLink` type extended with `rejection_reason: string | null`
- Supabase `.select()` updated to include `rejection_reason` column
- Venue list items refactored from `flex items-center justify-between` row to `flex flex-col gap-1` to accommodate the rejection detail block
- When `claim_status === 'rejected'`: shows `rejectionReasonLabel: {reason}` in muted text-xs, followed by `Hae uudelleen ->` underlined button that sets `showAddVenue(true)` to open the ClaimSearchForm

## Deviations from Plan

None - plan executed exactly as written. The `setShowAddVenue` state variable name matched the plan's assumption exactly.

## Self-Check: PASSED

- [x] app/business/rekisteroidy/page.tsx has role_in_company select with 4 options
- [x] POST body includes `role_in_company: roleInCompany`
- [x] VenueLink type includes `rejection_reason: string | null`
- [x] Supabase query selects `rejection_reason` column
- [x] Rejected venues show reason text + Hae uudelleen button
- [x] Both files committed at 25bed03
