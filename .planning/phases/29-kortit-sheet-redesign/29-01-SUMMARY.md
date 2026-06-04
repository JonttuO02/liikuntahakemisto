---
phase: 29-kortit-sheet-redesign
plan: "01"
subsystem: css-animations, price-utils
tags: [marquee, animation, pure-function, tdd, price-display]
dependency_graph:
  requires: []
  provides:
    - "@keyframes marquee in app/globals.css"
    - "marqueePriceLines() in lib/priceUtils.ts"
  affects:
    - lib/priceUtils.ts
    - app/globals.css
tech_stack:
  added: []
  patterns:
    - "Pure string-parsing function with whitespace-aware line filtering"
    - "TDD: RED (test commit) -> GREEN (implementation commit)"
    - "CSS keyframe for seamless leftward scroll loop"
key_files:
  created:
    - lib/priceUtils.test.ts (extended — 7 new test cases added to existing file)
  modified:
    - lib/priceUtils.ts
    - app/globals.css
decisions:
  - "marqueePriceLines returns string[] (not boolean) so Plan 02 can render lines directly without re-splitting"
  - "whitespace-only lines filtered before count check — matches UI-25 decision D-17/D-18"
  - "membershipOnly param short-circuits before any string work — no unnecessary parsing"
metrics:
  duration: "~8 minutes"
  completed: "2026-06-04"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 29 Plan 01: Shared Foundations — marquee keyframe + marqueePriceLines() Summary

Pure CSS keyframe and unit-tested helper function providing the two shared foundations for the PaikkaKortti marquee price display in Plan 02.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Add failing marqueePriceLines tests | fff980c | lib/priceUtils.test.ts |
| 1 (GREEN) | Implement marqueePriceLines helper | d77ddc8 | lib/priceUtils.ts |
| 2 | Add leftward @keyframes marquee to globals.css | 15889c3 | app/globals.css |

## What Was Built

### marqueePriceLines() — lib/priceUtils.ts

Exported pure function `marqueePriceLines(hintaKuvaus: string | null | undefined, membershipOnly: boolean): string[] | null`.

Logic:
1. If `membershipOnly` is true — return null (jäsenyyskohteessa ei marqueeta)
2. If `hintaKuvaus` is falsy — return null
3. Split on `\n`, filter lines where `l.trim().length > 0`
4. Return array only if length >= 2; otherwise return null

All 16 priceUtils tests pass (9 existing isMembershipOnly + 7 new marqueePriceLines).

### @keyframes marquee — app/globals.css

Leftward keyframe inserted immediately after `tickerScrollRight` (line 149):

```css
@keyframes marquee {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```

Goes from 0 to -50% (leftward) — pairs with the two-copy seamless loop pattern in Plan 02. `tickerScrollRight` is unchanged (goes rightward -50% to 0%, consumed by FilterCarouselPill).

## TDD Gate Compliance

- RED gate: `test(29-01)` commit fff980c — 7 failing tests
- GREEN gate: `feat(29-01)` commit d77ddc8 — all 16 tests passing
- REFACTOR: No cleanup needed, implementation was clean

## Verification Results

- `npx vitest run lib/priceUtils.test.ts` — 16 passed (9 existing + 7 new)
- `npx tsc --noEmit` — 0 errors
- globals.css contains `@keyframes marquee` (leftward, 0 → -50%) distinct from `tickerScrollRight`

## Deviations from Plan

None — plan executed exactly as written.

The plan's verify command for Task 2 uses `[^}]*` which doesn't match multiline content on Windows (CRLF line endings). The keyframe is correctly inserted; verified with an alternative Node.js check confirming both translateX(0) at 0% and translateX(-50%) at 100% are present.

## Known Stubs

None — this plan introduces no UI rendering; it provides pure utility functions and CSS primitives.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundaries introduced.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| lib/priceUtils.ts | FOUND |
| lib/priceUtils.test.ts | FOUND |
| app/globals.css | FOUND |
| 29-01-SUMMARY.md | FOUND |
| commit fff980c (RED — failing tests) | FOUND |
| commit d77ddc8 (GREEN — implementation) | FOUND |
| commit 15889c3 (marquee keyframe) | FOUND |
