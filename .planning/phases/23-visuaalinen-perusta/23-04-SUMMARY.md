---
phase: 23-visuaalinen-perusta
plan: "04"
subsystem: map-pins
tags: [sport-pin, inline-html, map-markers, cluster-pin, migration]
dependency_graph:
  requires: [SportPin component (Plan 03), spinOrbit CSS animation (Plan 03)]
  provides: [Etusivu uses SportPin for single pins, inline HTML cluster pins]
  affects: [app/components/Etusivu.tsx, lib/sportPins.ts]
tech_stack:
  added: []
  patterns: [inline-html-pin, css-keyframes-orbit, deterministic-stagger]
key_files:
  created: []
  modified:
    - app/components/Etusivu.tsx
    - lib/sportPins.ts
decisions:
  - "pinAnimDelay accepts number | string (p.id is number in Liikuntapaikka; helper handles both types for forward compatibility)"
  - "Cluster pin built as pure inline div — no new component file needed, consistent with single-pin pattern"
  - "lib/sportPins.ts cleared to export {} to prevent TypeScript no-exports error while keeping file for docs references"
metrics:
  duration: "~15 min"
  completed: "2026-06-01"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 2
---

# Phase 23 Plan 04: Wire SportPin into Etusivu — Pin Migration Complete Summary

Replaced all red data-URL img map pins in Etusivu.tsx with blue gradient inline HTML elements: SportPin for single venues, inline div cluster with count label and pin-glint for clusters. lib/sportPins.ts cleared.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace single-pin img with SportPin in Etusivu.tsx | f3d7f70 | app/components/Etusivu.tsx |
| 2 | Replace cluster img with inline HTML + clear sportPins.ts | 675ea68 | app/components/Etusivu.tsx, lib/sportPins.ts |

## What Was Built

### Task 1 — Single-pin migration

Three edits to `app/components/Etusivu.tsx`:

- **Import replaced:** `import { pinUrl, clusterPinUrl } from '@/lib/sportPins'` -> `import SportPin from './SportPin'`
- **pinAnimDelay helper added** as a module-level const after `HANDLE_H`: accepts `number | string`, returns a 0-1 float derived from `(id % 10) / 10` (number path) or `(id.charCodeAt(0) % 10) / 10` (string path). The `number` path was added as a Rule 1 fix because `Liikuntapaikka.id` is typed `number`, not `string` as the plan assumed.
- **img replaced:** `<img src={pinUrl(p.laji)} ... className="gmap-pin" />` -> `<SportPin laji={p.laji} animDelay={pinAnimDelay(p.id)} />`

### Task 2 — Cluster pin migration + sportPins.ts cleanup

- **Cluster img replaced** with an inline div structure inside the existing `motion.div whileTap` wrapper:
  - Outer div: position relative, 28x38, cursor pointer, onClick handler preserved
  - Pin body: absolute inset 0, blue gradient teardrop (`borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%'`, `background: 'linear-gradient(to bottom, #38bdf8 0%, #0284c7 100%)'`)
  - White circle: absolute top 4 left 4, 20x20px
  - Count label: absolute, fontSize 9, fontWeight bold, color `#0284c7`, shows `'9+'` for counts > 9
  - Glint dot: `<div className="pin-glint" />`
- **lib/sportPins.ts cleared** to a 2-line file: a comment and `export {}`
- **cluster-popup AnimatePresence** (motion.div with glass rounded-2xl) is structurally unchanged

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] pinAnimDelay type mismatch: number vs. string**
- **Found during:** TypeScript check after Task 1 commit (`npx tsc --noEmit`)
- **Issue:** Plan specified `pinAnimDelay = (id: string): number` and plan text said p.id is a UUID. In the actual codebase, `Liikuntapaikka.id` is typed `number` (integer DB primary key). TypeScript error: `Argument of type 'number' is not assignable to parameter of type 'string'` at line 593.
- **Fix:** Changed helper signature to `(id: number | string): number` with a branch for each type. Both branches produce a stable 0-1 float: `number` path uses `id % 10 / 10`, `string` path uses `charCodeAt(0) % 10 / 10`.
- **Files modified:** app/components/Etusivu.tsx (pinAnimDelay const)
- **Commit:** 675ea68 (folded into Task 2 commit)

## Known Stubs

None — all map pins are now fully wired to inline HTML elements. No data-URL fallback paths remain.

## Threat Flags

None — no new network endpoints, auth paths, or file access patterns introduced. The `pinAnimDelay` function only uses `p.id % 10` (no user data disclosed, T-23-04-01 accepted per plan threat model).

## Self-Check: PASSED

- [x] Etusivu.tsx does NOT contain `pinUrl`: CONFIRMED (grep count: 0)
- [x] Etusivu.tsx does NOT contain `clusterPinUrl`: CONFIRMED (grep count: 0)
- [x] Etusivu.tsx does NOT contain `gmap-pin`: CONFIRMED (grep count: 0)
- [x] Etusivu.tsx contains `import SportPin from './SportPin'`: FOUND
- [x] Etusivu.tsx contains `const pinAnimDelay`: FOUND
- [x] Etusivu.tsx contains `animDelay={pinAnimDelay(p.id)}`: FOUND
- [x] Etusivu.tsx cluster section contains `#38bdf8`: FOUND (count: 1)
- [x] Etusivu.tsx cluster section contains `className="pin-glint"`: FOUND
- [x] Etusivu.tsx cluster section contains `#0284c7`: FOUND (count: 2)
- [x] lib/sportPins.ts does NOT contain `function pinUrl` or `function clusterPinUrl`: CONFIRMED
- [x] lib/sportPins.ts contains `export {}`: FOUND
- [x] TypeScript check (`npx tsc --noEmit`) passes: PASSED (no output = no errors)
- [x] Commit f3d7f70 (Task 1): FOUND
- [x] Commit 675ea68 (Task 2): FOUND
