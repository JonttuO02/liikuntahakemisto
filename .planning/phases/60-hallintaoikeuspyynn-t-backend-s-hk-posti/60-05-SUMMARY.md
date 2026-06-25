---
phase: 60-hallintaoikeuspyynn-t-backend-s-hk-posti
plan: "05"
subsystem: business-ui
tags: [invite-link, access-request, i18n, glassmorphism, next-intl]
dependency_graph:
  requires: ["60-03"]
  provides: ["invite-copy-button", "pending-banner", "liity-landing-page"]
  affects: ["app/business/page.tsx", "app/business/liity/page.tsx"]
tech_stack:
  added: []
  patterns: ["useSearchParams", "useRouter redirect", "useState clipboard swap", "next-intl Business namespace"]
key_files:
  created:
    - app/business/liity/page.tsx
  modified:
    - app/business/page.tsx
    - messages/fi.json
    - messages/en.json
decisions:
  - "D-09 detected client-side on mount (company_id not null) for immediate feedback without waiting for API"
  - "D-10 detected from API response (no client-side pre-check, keeps mount logic simple)"
  - "Pending banner added in BOTH render branches (venueLinks > 0 and empty) to cover invite-link requesters who have no paikka_links yet"
  - "VenueRow carries its own useState(copied) — no lift to parent needed for 2s clipboard swap"
metrics:
  duration_minutes: 18
  completed: "2026-06-25T19:21:04Z"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 4
status: complete
---

# Phase 60 Plan 05: UI Surfaces (invite button + pending banner + liity page) Summary

## One-liner

Minimal owner-facing "Kopioi kutsulinkki" clipboard button, requester-facing "Pyyntösi odottaa hyväksyntää" banner, and `/business/liity` deep-link landing page using existing glassmorphism patterns and next-intl Business namespace.

## What Was Built

### Task 1 — i18n keys (fi.json + en.json)

Added 9 new keys to the `Business` namespace in both locale files:

| Key | Finnish |
|-----|---------|
| `copyInviteLinkCta` | Kopioi kutsulinkki |
| `inviteLinkCopied` | Linkki kopioitu |
| `accessRequestPendingTitle` | Pyyntösi odottaa hyväksyntää |
| `accessRequestPendingBody` | Paikan päähallitsija käsittelee pyyntösi pian. Saat sähköpostin, kun päätös on tehty. |
| `liityHeading` | Liity yrityksen tiimiin |
| `liityBody` | Pyydä hallintaoikeutta tähän paikkaan. Päähallitsija hyväksyy pyyntösi. |
| `liitySubmitCta` | Lähetä pyyntö |
| `liityErrorInvalidLink` | Tämä kutsulinkki ei ole voimassa. Pyydä uutta linkkiä paikan päähallitsijalta. |
| `liityErrorAlreadyInCompany` | Tilisi on jo liitetty toiseen yritykseen. Ota yhteyttä päähallitsijaan, jos tarvitset pääsyn tähän paikkaan. |

Both JSON files remain valid. Finnish copy matches UI-SPEC Copywriting Contract verbatim.

**Commit:** `4a4d70c`

### Task 2 — app/business/page.tsx modifications

Two additions:

**(a) Copy-invite-link button in VenueRow:**
- Added `useState(copied)` inside `VenueRow` for the 2s "Linkki kopioitu" swap
- Button rendered only when `claim_status === 'approved' && !isKesken`
- Calls `navigator.clipboard.writeText(origin + '/business/liity?paikka_id=' + id)` — pure client-side, no API call
- Reuses exact sibling CTA class: `text-xs font-bold text-[#111111] border border-[rgba(0,0,0,0.12)] hover:border-[rgba(0,0,0,0.25)] rounded-full px-3 py-1`

**(b) Pending-request banner:**
- Added `pendingAccessRequests` state (array), type `PendingAccessRequest[]`
- `checkState` queries `business_access_requests` for `.eq('status', 'pending')` — RLS self-scopes to `auth.uid() = requester_id`
- Banner uses existing `.glass rounded-2xl p-4 flex flex-col gap-1 border-l-4 border-amber-400` shape — identical to StatusCard's pending variant
- Rendered in **both** views: `venueLinks.length > 0` branch (below StatusCard) and `venueLinks.length === 0` branch (above ClaimSearchForm) — covers invite-link requesters who have no paikka_links yet

**Commit:** `1030e36`

### Task 3 — app/business/liity/page.tsx (new, 190 lines)

`'use client'` deep-link landing page reading `?paikka_id` via `useSearchParams`.

State machine (`PageState`):

| State | Trigger | Display |
|-------|---------|---------|
| `loading` | Initial | Spinner |
| `invalid-link` | Missing/malformed paikka_id OR D-10 from API | `liityErrorInvalidLink` in `text-red-600`, no submit button |
| `already-in-company` | D-09: account.company_id not null (mount) OR API response | `liityErrorAlreadyInCompany` in `text-red-600`, no submit button |
| `pending` | Existing pending request found on mount OR submit success (incl. D-08 idempotent) | `accessRequestPendingTitle` + `accessRequestPendingBody`, no submit button |
| `submit-form` | Auth OK, no company, no pending request | `liityHeading` + `liityBody` + `liitySubmitCta` button |
| Redirect | No user or no business_accounts row | `router.replace('/business/rekisteroidy?paikka_id=X')` |

Submit path: POSTs `{ paikka_id }` to `/api/business/access-request/submit` with `Authorization: Bearer <session.access_token>`. Button disabled while in-flight.

Error mapping from API:
- `errorMsg.includes('toiseen yritykseen')` → `already-in-company`
- `errorMsg.includes('kutsulinkki')` OR `'Missing fields'` → `invalid-link`
- Other → inline `submitError` text

**Commit:** `4d947f0`

## Deviations from Plan

### Auto-added missing functionality (Rule 2)

**1. [Rule 2 - Missing functionality] Pending banner in both render branches**
- **Found during:** Task 2
- **Issue:** The plan specified placing the pending banner "in the same banner region StatusCard renders into" (the `venueLinks.length > 0` branch). However, a requester who registered via invite link has no `business_paikka_links` rows, so they land in the `venueLinks.length === 0` branch (ClaimSearchForm view) and would never see the banner.
- **Fix:** Added the pending banner to both branches, ensuring invite-link requesters without venue links also see the "Pyyntösi odottaa hyväksyntää" state.
- **Files modified:** `app/business/page.tsx`
- **Commit:** `1030e36`

## Known Stubs

None — all data is live (RLS-scoped queries, real clipboard API, real fetch to submit endpoint).

## Threat Flags

None — this plan introduces no new network endpoints, auth paths, or schema changes. The submit POST flows through the existing Plan 03 endpoint (T-60-13/T-60-14 already registered). Error copy is static i18n strings, not server-echoed user input (T-60-15 accepted).

## Self-Check

Files created/modified:

- [x] `app/business/liity/page.tsx` — 190 lines, `'use client'`, reads `?paikka_id`, state machine, submit
- [x] `app/business/page.tsx` — copy-invite-link button on approved rows, pending banner
- [x] `messages/fi.json` — 9 new Business keys, Finnish copy verbatim from UI-SPEC
- [x] `messages/en.json` — 9 new Business keys, English equivalents

Commits:
- [x] `4a4d70c` — i18n keys
- [x] `1030e36` — business/page.tsx modifications
- [x] `4d947f0` — liity/page.tsx creation

TypeScript: `npx tsc --noEmit` passed after all changes with zero errors.
i18n verification: node verify script printed `OK`.

## Self-Check: PASSED
