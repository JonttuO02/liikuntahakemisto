---
phase: 16-brandi-logo-uloke
plan: 04
status: complete
completed: 2026-05-29
commit: 13f9c65
files_modified:
  - app/components/Etusivu.tsx
---

# Plan 04 Summary — AKTIIVI logo watermark

## What was built

AKTIIVI logo watermark at the bottom of the main bottom sheet.

Previous tab/bump approach was abandoned (see .continue-here.md decisions). New direction: full-width SVG logo as background decoration behind sheet content.

## Key decisions

- Inline SVG with tight viewBox `"120 200 1430 560"` — eliminates ~137px empty margin on each side and ~217px on top that the original 1672×940 canvas had
- `position: absolute; bottom: 0` — logo anchors to sheet bottom, scales to full width
- `opacity: 0.08` — visible but clearly subordinate to content
- `mask-image: linear-gradient(to top, black 0%, black 40%, transparent 100%)` — fades upward into content
- `z-index: 0` on watermark, `z-index: 1` on drag handle + content — correct CSS stacking within the fixed sheet stacking context
- `pointerEvents: none` — no interaction interference
- Static black (`stroke="#000000"`) — gradient animation deferred

## Phase 16 closure note

Original requirements UI-13 through UI-16 called for a tappable logo tab replacing the drag bar. After multiple implementation attempts (bump/clip-path), the design direction changed to a background watermark. The drag bar remains as-is. Gradient animation (UI-15, UI-16) deferred indefinitely.
