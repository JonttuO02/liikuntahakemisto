---
phase: 16
plan: "02"
subsystem: ui/branding
tags: [svg, animation, gradient, framer-motion, logo, branding]
dependency_graph:
  requires: [16-01]
  provides: [AktiiviLogo component]
  affects: [Etusivu.tsx (future), NavBar.tsx (future)]
tech_stack:
  added: []
  patterns: [SVG clipPath sweep animation, Framer Motion imperative animate()]
key_files:
  created:
    - app/components/AktiiviLogo.tsx
  modified: []
decisions:
  - "animate(element, keyframes, options) imperative API used for SVG rect width — avoids MotionValue overhead"
  - "prevIndex tracked via useState + useRef combo: useState triggers re-render for gradient color swap, useRef provides immediate access in animation callback"
  - "On first mount (prevIndex === currIndex) clip rect width initializes to 1672 — no animation flash"
  - "gradientIndex % 5 guard implements T-16P2-01 threat mitigation"
metrics:
  duration: "15min"
  completed: "2026-05-29"
  tasks_completed: 1
  files_created: 1
---

# Phase 16 Plan 02: AktiiviLogo — SVG-logokomponentti animoidulla liukuväripyyhkäisyllä

**One-liner:** AKTIIVI SVG wordmark with Framer Motion clipPath sweep animation cycling 5 sporty gradients via gradientIndex prop.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| Task 3 | Create AktiiviLogo.tsx with animated gradient SVG paths | 282f84c | app/components/AktiiviLogo.tsx |

## What Was Built

`app/components/AktiiviLogo.tsx` — standalone `'use client'` component that renders the AKTIIVI SVG wordmark with animated left-to-right gradient wipe on each gradient change.

### Component API

```tsx
<AktiiviLogo gradientIndex={0} /> // 0–4, cycles through GRADIENTS
```

### GRADIENTS

| Index | Name | Start | End |
|-------|------|-------|-----|
| 0 | Fire | #FF7B00 | #E63946 |
| 1 | Ocean | #00B4D8 | #0077B6 |
| 2 | Neon | #C9F400 | #00D68F |
| 3 | Sunset | #FF6CA8 | #BE2ED6 |
| 4 | Electric | #7B2FFF | #0055FF |

### SVG Architecture

- viewBox `0 0 1672 940`, height 28, width auto
- Two `linearGradient` defs: `grad-prev` (previous color) + `grad-curr` (new color)
- `sweep-clip` clipPath contains a rect whose width Framer Motion animates 0→1672
- Decorative paths (arc + wave): always `stroke="#111111"`
- Letter paths rendered twice:
  - Layer 1: `stroke="url(#grad-prev)"` — full width, always visible
  - Layer 2: `stroke="url(#grad-curr)"` — inside `<g clipPath="url(#sweep-clip)">` — revealed by sweep

### Animation Flow (D-14)

1. `gradientIndex` changes → `currIndex = gradientIndex % 5` updates
2. `useEffect` fires: reset rect width to 0
3. `animate(rectRef.current, { width: 1672 }, { duration: 0.55, ease: 'easeInOut' })` starts
4. Rect grows left→right, revealing `grad-curr` over `grad-prev`
5. On complete: `setPrevIndex(currIndex)` swaps gradient colors, rect reset to 0 (ready for next)

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written. One implementation detail clarified:

**animate() callback form vs. element form:** The plan suggested a callback form `animate(fn, options)` but Framer Motion's `animate()` uses `animate(element, keyframes, options)` for direct DOM element animation. Used the correct element form: `animate(rect, { width: 1672 }, options)`.

## Known Stubs

None. This is a pure presentational component — no data dependency. `gradientIndex` must be wired by the parent (Etusivu.tsx or NavBar — planned in subsequent plans of phase 16).

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. SVG is fully client-side.

Threat mitigation implemented:
- T-16P2-01: `Math.abs(gradientIndex) % 5` guards all GRADIENTS array access

## Self-Check

- [x] `app/components/AktiiviLogo.tsx` exists
- [x] Commit 282f84c exists
- [x] Verification script passed: `OK`
- [x] TypeScript: `npx tsc --noEmit` — no errors
- [x] ActaLogo.tsx unchanged — `git diff` empty
