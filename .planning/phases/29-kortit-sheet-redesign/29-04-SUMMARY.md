---
phase: 29-kortit-sheet-redesign
plan: "04"
subsystem: PaikkaSheet
tags: [sheet, hero, carousel, collapsible, reviews, glassmorphism]
dependency_graph:
  requires: []
  provides: [PaikkaSheet-hero-carousel, PaikkaSheet-collapsible-reviews, PaikkaSheet-pricing-row]
  affects: [app/components/PaikkaSheet.tsx]
tech_stack:
  added: []
  patterns: [CSS scroll-snap carousel, framer-motion AnimatePresence height:auto, floating glass-btn overlay]
key_files:
  modified:
    - app/components/PaikkaSheet.tsx
decisions:
  - "Kept outer drag handle div at 32px (pt-3 pb-1) as invisible spacer for calc(100% - 32px) height accounting — added second visual drag indicator inside hero overlay"
  - "Combined Task 1 and Task 2 into single atomic write since both modify PaikkaSheet.tsx and Task 2 depends on Task 1 state variables"
  - "distanceKm appended to overlay address <p> as tabular-nums span per D-04 + plan spec"
  - "WebkitOverflowScrolling cast as React.CSSProperties to avoid TypeScript non-standard property error"
metrics:
  duration: "~12 minutes"
  completed: "2026-06-04"
  tasks_completed: 2
  files_changed: 1
---

# Phase 29 Plan 04: PaikkaSheet Hero Redesign Summary

PaikkaSheet fully redesigned with 16:9 hero carousel (3 Camera placeholder slides), floating glass-btn controls, gradient name/address overlay, dot indicators, pricing SheetRow below hero, and collapsible review widget collapsed by default.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Hero carousel + floating controls + gradient overlay + pricing SheetRow | 449347d | app/components/PaikkaSheet.tsx |
| 2 | Collapsible review widget | 449347d | app/components/PaikkaSheet.tsx |
| 3 | checkpoint:human-verify | PENDING | — |

## What Was Built

### Task 1: Hero Carousel + Floating Controls (SHEET-01, SHEET-02)

- **Imports updated:** `AnimatePresence` added to framer-motion import; `MapPin` and `lajiKonfig` removed (no longer used); `Camera` and `ChevronDown` added to lucide-react import
- **New state:** `activeSlide: number`, `reviewOpen: boolean`, `carouselRef: RefObject<HTMLDivElement>` added alongside existing `scrollRef`
- **Hero container:** `relative aspect-video w-full overflow-hidden` — first child of scrollRef div
- **Floating drag indicator:** `absolute top-3 left-1/2 -translate-x-1/2 z-20 w-10 h-1 bg-[rgba(255,255,255,0.5)] rounded-full` over hero image
- **Floating controls:** bookmark (whileTap scale 0.85, glass-btn) + close (X, glass-btn) at `absolute top-3 right-3 z-20`
- **Carousel:** `ref={carouselRef}`, `snap-x snap-mandatory`, `onPointerDown={e => e.stopPropagation()}` (prevents drag="y" conflict — Pitfall 4), `onScroll` sets `activeSlide` via `Math.round(scrollLeft / offsetWidth)`
- **3 slides:** `bg-[rgba(0,0,0,0.08)]` + `<Camera size={32} className="text-[rgba(255,255,255,0.4)]" />`
- **Gradient overlay:** `linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%)` — venue name (`font-bold text-white text-lg`) + address with distance (`text-sm text-white/70`)
- **Dot indicators:** 3 spans below hero, `bg-[#111111]` active / `bg-[rgba(0,0,0,0.15)]` inactive
- **Pricing SheetRow:** moved to first row below dots (CircleDollarSign, label "Hinta"), content unchanged
- **Sport badge removed:** entire header-row div (lajiKonfig badge + old close/bookmark cluster) deleted — D-05

### Task 2: Collapsible Review Widget (SHEET-03)

- **Guard:** entire collapsible block wrapped in `{reviews !== null && (...)}` — matches original async-load pattern
- **Collapsed header:** `onClick={() => reviews.length > 0 && setReviewOpen(prev => !prev)}` — no toggle at 0 reviews (D-13)
- **Star display:** `★` unicode in icon slot; star string `'★'.repeat(Math.round(avgRating ?? 0)) + '☆'.repeat(5 - ...)` + rating + count
- **0-review state:** static `☆ Ei arvosteluja` text, no ChevronDown rendered
- **ChevronDown:** `rotate-180` class when `reviewOpen` is true
- **AnimatePresence:** `initial={false}`, motion.div with `animate={{ height: 'auto', opacity: 1 }}`, duration 0.25, ease `[0.25, 0.1, 0.25, 1]`, `style={{ overflow: 'hidden' }}` (Pitfall 3)
- **ReviewSection:** rendered unchanged inside motion.div

### Critical Constraints Preserved

| Constraint | Status |
|-----------|--------|
| `layoutId={\`vc-${paikka.id}\`}` on outer motion.div | PRESERVED |
| `overflow: 'hidden'` on outer motion.div style | PRESERVED |
| `drag="y"` on outer motion.div | PRESERVED |
| Drag handle div at `pt-3 pb-1` (32px) | PRESERVED |
| `height: 'calc(100% - 32px)'` on scrollRef | PRESERVED |
| `onPointerDown stopPropagation` on carousel | IMPLEMENTED |
| `overflow: 'hidden'` on AnimatePresence motion.div | IMPLEMENTED |

## Deviations from Plan

### Auto-combined Tasks 1 and 2

Both tasks modify the same file (`PaikkaSheet.tsx`) and Task 2 depends on state variables (`reviewOpen`, `setReviewOpen`) declared in Task 1. Implementing both in a single write reduces risk of partial-state commits. Both acceptance criteria were verified before the single commit.

### Removed unused imports (Rule 2 — correctness)

- `MapPin` removed — the old address block used it but the new overlay uses plain text per 29-PATTERNS.md
- `lajiKonfig` removed — sport badge removed per D-05; no remaining usage
- Both removals required for `npx tsc --noEmit` to pass cleanly

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| Hero carousel slides | app/components/PaikkaSheet.tsx | All 3 slides are gray Camera placeholders; real images deferred per D-08/CONTEXT.md |

## Threat Flags

None. No new trust boundaries introduced. PaikkaSheet renders existing trusted venue data. The `onPointerDown stopPropagation` mitigates T-29-06 (gesture conflict DoS). `overflow: hidden` on motion.div mitigates T-29-07 (paint overflow).

## Checkpoint Status

**Task 3: checkpoint:human-verify — PENDING**

The user must open the running app and visually verify:
1. 16:9 hero carousel with Camera placeholder slides at the top of PaikkaSheet
2. Floating drag handle bar (white, centered over image top)
3. Floating close (X) + bookmark chips (glass-btn, top-right over image)
4. Name + address gradient overlay at hero bottom; distance shown when available
5. Horizontal swipe changes slides + dots update — sheet does NOT close on swipe
6. Pricing SheetRow ("Hinta", CircleDollarSign) immediately below dots
7. No sport color badge anywhere in the sheet
8. Review widget collapsed by default; expands/collapses smoothly on tap; chevron rotates
9. 0-review venues show "☆ Ei arvosteluja" with no chevron and no tap action
10. Drag-to-close by the handle still works

## Self-Check: PASSED

- [x] `app/components/PaikkaSheet.tsx` exists and was modified (134 insertions, 52 deletions)
- [x] Commit 449347d exists: `feat(29-04): redesign PaikkaSheet — hero carousel, floating controls, collapsible reviews`
- [x] `npx tsc --noEmit` exits 0 (verified before commit)
- [x] No files deleted in commit (git diff --diff-filter=D returns empty)
- [x] Critical constraints: layoutId, overflow:hidden, drag="y", pt-3 pb-1, calc(100% - 32px) all preserved
