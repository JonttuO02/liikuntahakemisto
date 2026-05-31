---
phase: 23-visuaalinen-perusta
plan: "02"
subsystem: ui-components
tags: [logo, animation, svg, framer-motion]
dependency_graph:
  requires: []
  provides: [AktiiviLogo-auto-loop]
  affects: [app/components/AktiiviLogo.tsx]
tech_stack:
  added: []
  patterns: [framer-motion-imperative-animate, svg-clippath-sweep, recursive-async-loop]
key_files:
  modified:
    - app/components/AktiiviLogo.tsx
decisions:
  - "Replaced two-layer gradient system with single blue gradient and one clipped letter layer"
  - "Used recursive async runLoop() with cancelled boolean guard instead of setInterval to handle async animation sequencing cleanly"
  - "wait() helper wraps setTimeout in a Promise that respects the cancelled flag"
metrics:
  duration: "~10 min"
  completed: "2026-06-01"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
---

# Phase 23 Plan 02: AktiiviLogo Redesign Summary

AktiiviLogo redesigned as self-contained auto-looping blue sweep animation at 32px height, replacing the external-prop gradient cycle.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Redesign AktiiviLogo — auto-loop blue sweep, 32px height | fd4dd3d | app/components/AktiiviLogo.tsx |

## What Was Built

The AktiiviLogo SVG component was fully rewritten:

- **Height:** 56px to 32px (per D-13)
- **Gradient:** Removed the 5-color GRADIENTS array and grad-prev/grad-curr two-layer system; replaced with a single `grad-blue` linearGradient (#38bdf8 to #0284c7, same userSpaceOnUse coordinates)
- **Props:** Removed `gradientIndex: number` prop entirely — component is now `AktiiviLogo()` with no parameters
- **Animation loop:** `runLoop()` recursive async function runs on mount: (a) reset clip rect to width=0 (letters hidden), (b) animate width 0 to 1672 in 0.6s easeInOut (sweep reveal), (c) wait 1000ms (letters visible), (d) animate width 1672 to 0 in 0.4s easeInOut (collapse), (e) wait 3000ms (pause), then repeat
- **Letter rendering:** Single clipped `<g clipPath="url(#sweep-clip)">` layer with `stroke="url(#grad-blue)"` — no more two-layer prev/curr approach
- **Decorative arcs:** Unchanged at `stroke="#111111"` (black)
- **Cleanup guard:** `cancelled` boolean + `currentControls.cancel()` in useEffect return prevents setState-after-unmount (T-23-02-01 mitigation)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — T-23-02-01 (DoS / memory leak) was mitigated as specified.

## Self-Check: PASSED

- app/components/AktiiviLogo.tsx exists and contains all required patterns (grad-blue, runLoop, height: 32, sweep-clip, #38bdf8, #0284c7, no gradientIndex, no GRADIENTS)
- Commit fd4dd3d verified in git log
