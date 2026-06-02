---
phase: 25-todo-overlay
plan: 02
subsystem: map-ui
tags: [overlay, animation, framer-motion, todo-list, review, glassmorphism, supabase]

# Dependency graph
requires:
  - phase: 25-todo-overlay/01
    provides: TodoOverlay, todoOpen state, DiagonaalKortti card list in overlay
provides:
  - KavikoPaikassaPrompt inline prompt (Kyllä/Ei) after TO DO deletion
  - InlineReviewExpanded star rating + comment form inline in overlay
  - handleOverlayDelete function routing TO DO deletion through review prompt for logged-in users
  - onToggleTodo optional prop on DiagonaalKortti
affects: [25-todo-overlay, suosikit, reviews]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline review capture at moment of intent signal (removing from TO DO list)"
    - "AnimatePresence two-child pattern (KavikoPaikassaPrompt / InlineReviewExpanded) sharing one AnimatePresence"
    - "Optional override prop pattern on DiagonaalKortti (onToggleTodo overrides default behavior)"

key-files:
  created: []
  modified:
    - app/components/DiagonaalKortti.tsx
    - app/components/Etusivu.tsx

key-decisions:
  - "D-08 honored: inline KavikoPaikassaPrompt replaces card slot, no modal"
  - "D-09 honored: InlineReviewExpanded inside overlay, no navigation"
  - "D-10 honored: review prompt only for supabaseUser !== null; non-auth gets silent deletion"
  - "Both tasks implemented in a single commit (state, handlers, JSX all co-located in Etusivu.tsx)"
  - "DiagonaalKortti bookmark button rendered only when onToggleTodo prop is provided (opt-in pattern)"

patterns-established:
  - "onToggleTodo optional prop: DiagonaalKortti shows delete button only when prop provided; backward-compatible"
  - "handleOverlayDelete: wrapper around toggleTodo that sets pendingReviewPaikkaId for authenticated users"
  - "closeOverlays resets all review state to prevent stale prompts across open/close cycles"

requirements-completed:
  - TODO-07

# Metrics
duration: ~4min
completed: 2026-06-02
---

# Phase 25 Plan 02: KavikoPaikassaPrompt + InlineReviewExpanded — Summary

**Inline "Kävikö paikassa?" prompt and star+comment review form added to TO DO overlay; logged-in users removing a place see the prompt, Kyllä opens a Supabase-wired review form, Ei dismisses silently**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-06-02T07:18:00Z
- **Completed:** 2026-06-02T07:22:07Z
- **Tasks:** 2 (implemented together in one commit)
- **Files modified:** 2

## Accomplishments

- Added `onToggleTodo?: (id: number) => void` to DiagonaalKortti with a conditional bookmark delete button (visible only when prop provided — backward-compatible)
- Added `handleOverlayDelete` in Etusivu.tsx: wraps `toggleTodo` and sets `pendingReviewPaikkaId` for authenticated users
- Added `closeOverlays` reset for `pendingReviewPaikkaId` and `reviewPaikkaId` to prevent stale state across overlay cycles
- Added `KavikoPaikassaPrompt` animated motion.div with Kyllä/Ei buttons (AnimatePresence, ease [0.23, 1, 0.32, 1])
- Added `InlineReviewExpanded` with StarPicker, textarea, success state, and Supabase `reviews.upsert` via `handleInlineReviewSubmit`
- Added `resetInlineReview` helper for Ohita dismiss flow
- Imported `StarPicker` into Etusivu.tsx

## Task Commits

1. **Task 1 + 2: Add onToggleTodo, handleOverlayDelete, KavikoPaikassaPrompt, InlineReviewExpanded** - `4f16e43` (feat)

## Files Created/Modified

- `app/components/DiagonaalKortti.tsx` — Added `onToggleTodo` prop to interface + bookmark button rendered when prop provided
- `app/components/Etusivu.tsx` — Added 7 new state vars, handleOverlayDelete, resetInlineReview, handleInlineReviewSubmit, StarPicker import, KavikoPaikassaPrompt JSX, InlineReviewExpanded JSX; closeOverlays extended

## Decisions Made

- Tasks 1 and 2 were implemented in a single atomic commit since the state variables added in Task 1 are directly consumed by Task 2's JSX — splitting would have left the file in a non-compiling intermediate state
- DiagonaalKortti bookmark delete button is opt-in (only shown when `onToggleTodo` prop is provided), so all existing usages in search list and PaikkaSheet remain unchanged
- Review upsert uses `is_anonymous: false` and `reviewer_name: supabaseUser.email?.split('@')[0]` to match the pattern in ReviewForm.tsx

## Deviations from Plan

### Auto-fixed Issues

None. Plan executed as specified.

---

**Total deviations:** 0
**Impact on plan:** N/A

## Issues Encountered

None. TypeScript compiled with zero errors on first attempt.

## Known Stubs

None. InlineReviewExpanded submits to the live `reviews` Supabase table via upsert; StarPicker is the real component; state is real React state.

## Threat Flags

No new threat surface beyond what the plan's threat register documents (T-25-03 through T-25-SC). The `user_id` is sourced from `supabaseUser.id` (Supabase JWT-validated), and `paikka_id` originates from server-fetched `paikat` prop — not from user input.

## Next Phase Readiness

Phase 25 (TO DO overlay) is now complete:
1. TO DO overlay opens on map (TODO-03) — Plan 01
2. Button toggles Bookmark/X (TODO-04) — Plan 01
3. Scale animation + card stagger (TODO-05) — Plan 01
4. "TO DO" header visually distinct (TODO-06) — Plan 01
5. Delete → "Kävikö?" → review form (TODO-07) — Plan 02 (this plan)

Ready for `/gsd:verify-work 25`.

## Self-Check: PASSED

- [x] FOUND: app/components/DiagonaalKortti.tsx (modified)
- [x] FOUND: app/components/Etusivu.tsx (modified)
- [x] FOUND: commit 4f16e43 (Task 1+2)
- [x] onToggleTodo prop in DiagonaalKortti.tsx interface
- [x] handleOverlayDelete in Etusivu.tsx sets pendingReviewPaikkaId only when supabaseUser !== null
- [x] closeOverlays calls setPendingReviewPaikkaId(null) and setReviewPaikkaId(null)
- [x] KavikoPaikassaPrompt with h-32, Kyllä and Ei buttons
- [x] InlineReviewExpanded with key="inlineReview", StarPicker, reviews.upsert
- [x] "Arvostelu tallennettu" success string present
- [x] "Tallennus epäonnistui. Yritä uudelleen." error string present
- [x] "Jätä arvostelu" and "Ohita" strings present
- [x] TypeScript: npx tsc --noEmit passes with zero errors
- [x] No STATE.md or ROADMAP.md modifications

---
*Phase: 25-todo-overlay*
*Completed: 2026-06-02*
