---
phase: 27-siivous-pienet-korjaukset
plan: "02"
subsystem: PaikkaSheet
tags: [sheet, cleanup, dead-link-removal]
dependency_graph:
  requires: []
  provides: [PaikkaSheet without browser link]
  affects: [app/components/PaikkaSheet.tsx]
tech_stack:
  added: []
  patterns: []
key_files:
  created: []
  modified:
    - app/components/PaikkaSheet.tsx
decisions:
  - "D-15: Remove Avaa paikkasivu selaimessa link with no replacement — /paikat/[id] route is not a user-facing destination in v1.6 redesign"
metrics:
  duration: "< 5 minutes"
  completed: "2026-06-03"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 1
---

# Phase 27 Plan 02: Remove PaikkaSheet Browser Link Summary

## One-liner

Deleted the "Avaa paikkasivu selaimessa" Link element and its unused `import Link from 'next/link'` import from PaikkaSheet.tsx, decluttering the sheet footer with no replacement per D-15.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Delete Avaa paikkasivu selaimessa link from PaikkaSheet | 40cb358 | app/components/PaikkaSheet.tsx |

## Verification Results

- `node -e "..."` check: OK — "Avaa paikkasivu selaimessa" not found, `import Link` not found
- Booking link (`isSafeUrl(paikka.varauslinkki)`) block: PRESENT
- ReviewSection: PRESENT
- `npx tsc --noEmit`: passed (no output = clean)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — link removal only eliminates a UI navigation path; /paikat/[id] route itself remains accessible directly and no new surface was introduced.

## Self-Check: PASSED

- `app/components/PaikkaSheet.tsx` exists and is modified
- Commit 40cb358 exists in git log
- All acceptance criteria verified by automated node check and tsc
