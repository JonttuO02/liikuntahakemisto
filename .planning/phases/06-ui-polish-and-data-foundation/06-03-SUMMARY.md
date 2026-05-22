---
phase: 06-ui-polish-and-data-foundation
plan: "03"
subsystem: profile-page
tags: [ui, booking-url, profile-page, row-component, external-link]
dependency_graph:
  requires: []
  provides: [profile-page-varaussivu-row]
  affects: [app/paikat/[id]/page.tsx]
tech_stack:
  added: []
  patterns: [Row component reuse, ExternalLink icon, tabnabbing mitigation via rel=noopener noreferrer]
key_files:
  created: []
  modified:
    - app/paikat/[id]/page.tsx
decisions:
  - "font-bold used on booking anchor per 400/700-only typography rule (PATTERNS.md had font-medium which is forbidden)"
  - "Pre-existing font-medium violations in Sijainti and Puhelin anchors auto-fixed per Rule 1 (typography bug)"
metrics:
  duration: "~8 minutes"
  completed: "2026-05-22T03:17:56Z"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
requirements_satisfied:
  - UI-07
---

# Phase 6 Plan 03: Profile Page Varaussivu Row Summary

**One-liner:** Replaced full-width "Varaa aika" button with an inline Varaussivu Row (ExternalLink icon + plain anchor) inserted between Hinta and Kuvaus rows on the profile page.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace full-width Varaa aika button with Varaussivu Row | f1c3482 | app/paikat/[id]/page.tsx |

## What Was Built

The profile page (`app/paikat/[id]/page.tsx`) now renders the booking URL as a styled inline anchor inside a `Row` component with the label "Varaussivu" and an `ExternalLink` icon. The row appears between the Hinta row (CircleDollarSign) and the Kuvaus row (Info).

Changes made:
- Added `ExternalLink` to the `lucide-react` named import
- Removed the `buttonVariants` import (no longer used)
- Deleted the standalone `{paikka.varauslinkki && <div className="px-6 sm:px-8 pb-8">...</div>}` block that held the full-width black button
- Inserted a new `{paikka.varauslinkki && <Row ...>}` block inside the `flex flex-col gap-5` content card, after Hinta and before Kuvaus
- Anchor uses `font-bold`, `target="_blank"`, `rel="noopener noreferrer"`, `break-all` for long URLs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing font-medium violations in Sijainti and Puhelin anchors**
- **Found during:** Task 1 verification — the automated verify script checks the entire file for `font-medium`
- **Issue:** Two existing anchors (`Sijainti`'s "Näytä kartalla" link and `Puhelin`'s tel link) used `font-medium` (weight 500), which violates CLAUDE.md's "2 weights only: 400 and 700" typography rule
- **Fix:** Changed both to `font-bold` (weight 700)
- **Files modified:** `app/paikat/[id]/page.tsx` (same commit, same task)
- **Commit:** f1c3482

## Verification Results

All automated checks passed:
- `Varaa aika` string removed: confirmed
- `ExternalLink` icon imported and used: confirmed
- `Varaussivu` Row label present: confirmed
- `target="_blank"` on booking anchor: confirmed
- `rel="noopener noreferrer"` on booking anchor: confirmed
- No `font-medium` in file: confirmed
- Row order (Varaussivu after CircleDollarSign, before Info): confirmed (lines 107 / 120)
- `npx tsc --noEmit`: exit 0

## Threat Surface

Threat mitigations from plan's threat model were applied:
- T-06-05 (tabnabbing): `rel="noopener noreferrer"` + `target="_blank"` enforced
- T-06-06 (XSS via varauslinkki): React escapes text node; href is opaque to renderer; anon DB role is read-only

No new threat surface introduced beyond what was planned.

## Known Stubs

None.

## Self-Check: PASSED

- File exists: `app/paikat/[id]/page.tsx` — confirmed (modified)
- Commit exists: `f1c3482` — confirmed
- No unexpected file deletions in commit
