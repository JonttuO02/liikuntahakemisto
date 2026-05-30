---
phase: 16
plan: "03"
subsystem: ui
tags: [logo, bottom-sheet, animation, gradient, etusivu]
dependency_graph:
  requires: [16-02]
  provides: [AktiiviLogo-in-sheet, gradient-cycle]
  affects: [app/components/Etusivu.tsx]
tech_stack:
  added: []
  patterns: [useState-gradient-index, useRef-mounted-guard, sheetPhase-useEffect]
key_files:
  created: []
  modified:
    - app/components/Etusivu.tsx
decisions:
  - "PILL_W set to 194 (preferred simpler approach) rather than Framer Motion x-transform centering — keeps existing left/right spring animation intact"
  - "gradMounted useRef guard skips first mount trigger so gradient 0 (Fire) shows statically on load; sweep fires from first user close+reopen"
  - "No key prop on AktiiviLogo — stays mounted, animates sweep internally on gradientIndex prop change"
metrics:
  duration: "12 minutes"
  completed: "2026-05-29"
  tasks: 2
  files_changed: 1
---

# Phase 16 Plan 03: Wire AktiiviLogo into Etusivu Summary

**One-liner:** AktiiviLogo SVG wordmark replaces the w-10 h-1 drag bar in the bottom sheet handle, with gradient index cycling on each open transition.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 4 | Add gradient index state and sheetPhase effect | fd9aed1 | app/components/Etusivu.tsx |
| 5 | Replace drag bar with AktiiviLogo, center closed pill | 541b755 | app/components/Etusivu.tsx |

## What Was Built

- `AktiiviLogo` imported into `Etusivu.tsx`
- `gradIndex` useState(0) tracks which of the 5 gradients (Fire → Ocean → Neon → Sunset → Electric) is active
- `gradMounted` useRef(false) acts as a mounted guard so the first render shows gradient 0 without triggering a sweep animation
- `useEffect` watching `sheetPhase`: when sheetPhase transitions to 'open' (after first mount), increments `gradIndex` by 1 modulo 5
- `PILL_W` changed from 160 to 194 — widens the closed pill to fit the AKTIIVI wordmark (~130px) with comfortable padding
- The `w-10 h-1 bg-[rgba(0,0,0,0.12)] rounded-full` drag bar div replaced with `<AktiiviLogo gradientIndex={gradIndex} />`
- The separate drag bar on the valittu-paikka card (rivi 889) was intentionally left unchanged — only the sheet handle was modified

## Deviations from Plan

None — plan executed exactly as written. The preferred simpler PILL_W=194 approach was used as directed.

## Verification Results

1. `grep -c "w-10 h-1 bg-[rgba(0,0,0,0.12)]" app/components/Etusivu.tsx` returns 1 (only the paikka card drag bar, not the sheet handle)
2. `grep -n "AktiiviLogo" app/components/Etusivu.tsx` shows import line 28 and usage line 667
3. `grep -n "gradIndex|gradMounted" app/components/Etusivu.tsx` shows useState (125), useRef (126), useEffect body (305-306), usage (667)
4. `npm run build` exits 0 — no new errors, only pre-existing warnings

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

- [x] fd9aed1 exists: `git log --oneline | grep fd9aed1` confirmed
- [x] 541b755 exists: `git log --oneline | grep 541b755` confirmed
- [x] app/components/Etusivu.tsx modified with all required changes
- [x] Build passed with `npm run build` exit 0
