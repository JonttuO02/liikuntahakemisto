---
phase: 25-todo-overlay
plan: 01
subsystem: map-ui
tags: [overlay, animation, framer-motion, todo-list, glassmorphism]
dependency_graph:
  requires: []
  provides: [TodoButton, TodoOverlay, todoOpen state, nav-pill TO DO trigger]
  affects: [app/components/Etusivu.tsx]
tech_stack:
  added: []
  patterns: [AnimatePresence scale-from-top-right, staggerChildren card list, icon crossfade mode=wait]
key_files:
  created: []
  modified:
    - app/components/Etusivu.tsx
decisions:
  - "D-05 honored: anyOverlayOpen remains rightOpen-only; todoOpen does NOT add a backdrop"
  - "TodoButton placed as sibling fixed div after top-right toolbar, not inside it"
  - "Nav-pill TO DO Link converted to button with onClick to preserve /suosikit route intact"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-02T07:15:58Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 1
---

# Phase 25 Plan 01: TO DO Overlay — Summary

## One-liner

TodoButton (fixed, Bookmark/X icon crossfade) and TodoOverlay (glassmorphism panel, scale from top-right, staggered DiagonaalKortti cards, empty state) added inline to Etusivu.tsx; nav-pill TO DO link converted to overlay trigger without removing /suosikit route.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add todoOpen state, extend closeOverlays, add TodoButton | c6bd83d | app/components/Etusivu.tsx |
| 2 | Add TodoOverlay with staggered cards and empty state | 1a1590d | app/components/Etusivu.tsx |

## What Was Built

### Task 1

- Added `const [todoOpen, setTodoOpen] = useState(false)` state after `searchKertakaynti`
- Extended `closeOverlays()` to call `setTodoOpen(false)` alongside `setRightOpen(false)`
- `anyOverlayOpen` remains `rightOpen` only — D-05 preserved, no backdrop for TO DO overlay
- Added named import `{ diagonaalKorttiVariants }` from `DiagonaalKortti`
- Added `TodoButton`: `motion.button` fixed at `right: 16, top: calc(max(12px, env(safe-area-inset-top)) + 48px), z-index: 64`, uses `AnimatePresence mode="wait"` to crossfade Bookmark/X icons with 0.12s opacity transition
- Converted nav-pill expanded menu TO DO `<Link href="/suosikit">` to `<button onClick={() => { setTodoOpen(true); closeOverlays() }}>` — `/suosikit` route untouched

### Task 2

- Added `todoContainerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }` for DiagonaalKortti stagger
- Derived `todoPaikat = paikat.filter(p => todoIds.has(p.id))` (no new Supabase calls)
- Added `AnimatePresence` + `motion.div key="todo-overlay"`: `scale 0→1, opacity 0→1, transformOrigin: 'top right', duration: 0.2, ease: [0.25, 0.1, 0.25, 1]`
- Overlay: `fixed right-0 bottom-0, glass rounded-l-2xl, p-4, overflow-y-auto, z-index: 62, width: calc(100vw - 56px), maxWidth: 420`
- Overlay header: `"TO DO"` in `text-sm font-bold uppercase tracking-widest mb-4`
- Empty state: Bookmark icon (w-8 h-8, 20% opacity) + `"Lista on tyhjä"` + `"Lisää paikkoja kirjanmerkkipainikkeella"`
- Non-empty: `motion.div variants={todoContainerVariants}` containing `DiagonaalKortti` per `todoPaikat` item
- `onShowMap` pans map via `setAutoZoomTarget` — overlay stays open on map pan

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing X icon import**
- **Found during:** Task 2 TypeScript check
- **Issue:** The plan's `<interfaces>` section stated "Bookmark and X already imported" but `X` was not in the lucide-react import line in Etusivu.tsx
- **Fix:** Added `X` to the lucide-react import: `import { Moon, Sun, Locate, Search, Bookmark, X, MoreHorizontal, ... }`
- **Files modified:** app/components/Etusivu.tsx
- **Commit:** 1a1590d (included in Task 2 commit)

## Known Stubs

None. The overlay reads from existing `paikat` prop and `todoIds` state — no hardcoded empty data flows to UI.

## Threat Flags

No new threat surface beyond what is documented in the plan's threat register (T-25-01, T-25-02). No new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- [x] FOUND: app/components/Etusivu.tsx
- [x] FOUND: commit c6bd83d (Task 1)
- [x] FOUND: commit 1a1590d (Task 2)
- [x] const [todoOpen, setTodoOpen] = useState(false) present
- [x] setTodoOpen(false) in closeOverlays()
- [x] anyOverlayOpen = rightOpen (no todoOpen — D-05 honored)
- [x] aria-label={todoOpen ? ...} on TodoButton
- [x] key="todo-overlay" on motion.div
- [x] staggerChildren: 0.06 in todoContainerVariants
- [x] todoPaikat = paikat.filter(p => todoIds.has(p.id))
- [x] "Lista on tyhjä" empty state present
- [x] TypeScript: npx tsc --noEmit passes with zero errors
- [x] href="/suosikit" count in Etusivu.tsx = 0
- [x] app/suosikit/page.tsx untouched
