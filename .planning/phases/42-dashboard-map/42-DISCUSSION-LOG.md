# Phase 42: Dashboard & Map - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-12
**Phase:** 42-dashboard-map
**Areas discussed:** Status card semantics, Dashboard layout scope, Business map implementation, Dashboard data fetching

---

## Status card semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Account-level status | One card showing `business_accounts.approval_status`. Venue statuses shown separately. | ✓ |
| Per-venue status cards only | No account-level card; existing per-venue badges are the "status card". | |

**User's choice:** Account-level status

---

| Option | Description | Selected |
|--------|-------------|----------|
| Reset to pending (reapply mechanism) | POST to new Route Handler, sets approval_status back to 'pending' | |
| You decide | Claude picks reapply mechanism based on existing patterns | ✓ |

**User's choice:** You decide (deferred to Claude)
**Notes:** Claude will mirror the existing venue reapply pattern (`/api/business/reapply`).

---

| Option | Description | Selected |
|--------|-------------|----------|
| Status only | No rejection_reason shown — just the status badge + reapply button. No schema change. | |
| Add rejection_reason to business_accounts | New nullable column in a migration; shown if set. Admin sets via Supabase Studio for now. | ✓ |

**User's choice:** Add rejection_reason column (nullable), admin panel not updated in Phase 42.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Just add the column, show it if set | Migration adds the column; no admin panel changes in Phase 42. | ✓ |
| Update admin panel too | Add rejection_reason input to /admin approve/reject flow for accounts. | |

**User's choice:** Just add the column — admin panel deferred.

---

## Dashboard layout scope

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal — add sections to centered card | Keep centered glass card; add status card at top; add /business/map quick-action link | ✓ |
| Full dashboard layout | Replace centered card with wider multi-section layout | |

**User's choice:** Minimal — add sections to existing centered card. Add top padding for BusinessNav clearance.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Inside the glass card | /business/map quick-action link inside the card, below venue list | ✓ |
| Separate section above venue list | Dedicated quick-actions row outside the main card | |

**User's choice:** Inside the glass card.

---

## Business map implementation

| Option | Description | Selected |
|--------|-------------|----------|
| Lean standalone page | New app/business/map/ page + client component; does not touch Etusivu.tsx | ✓ |
| Extract shared map from Etusivu | Refactor Etusivu to share a VenueMap component | |

**User's choice:** Lean standalone page.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed top-center overlay on map | Pill toggle pinned at top-center, below BusinessNav | ✓ |
| Fixed bottom-center | Pill toggle at bottom-center | |

**User's choice:** Fixed top-center.

---

| Option | Description | Selected |
|--------|-------------|----------|
| All published venues | All liikuntapaikat where published=true — same as Etusivu | ✓ |
| Only approved+published venues | Only business_managed=true AND published=true | |

**User's choice:** All published venues for "Kaikki paikat" mode.

---

## Dashboard data fetching

| Option | Description | Selected |
|--------|-------------|----------|
| Stay client-only | Add new queries inline in existing 'use client' page | |
| RSC + client split | RSC fetches data server-side; BusinessDashboardClient.tsx handles interactivity | ✓ |

**User's choice:** RSC + client split
**Notes:** User asked "what do you mean 'not a free refactor'?" — clarified it means executor effort (~30–60 min extra), not monetary cost. User confirmed RSC split after understanding the tradeoff.

---

| Option | Description | Selected |
|--------|-------------|----------|
| RSC server-fetch | Venues fetched server-side in RSC, passed as props to client map | ✓ |
| Client-side fetch on mount | Map component fetches on mount; loading delay before pins appear | |

**User's choice:** RSC server-fetch for /business/map.

---

## Claude's Discretion

- Account reapply CTA mechanism: follow existing venue reapply pattern (POST to `/api/business/account-reapply`, reset `approval_status` to `'pending'`)
- Status card visual style: `.glass rounded-2xl` with same badge color tokens as the existing venue list
- BusinessMapClient GPS integration: include recenter button (`Locate` icon, `glass-btn rounded-full`)

## Deferred Ideas

- Admin panel update to set `business_accounts.rejection_reason` — deferred past Phase 42
- Dashboard analytics (visit counts, sheet opens) — future milestone
- Multi-venue account management (ketjuadmin) — future milestone
