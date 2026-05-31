---
phase: 21-todo-lista
plan: 01
subsystem: ui
tags: [lucide-react, bookmark, react, typescript, supabase]

# Dependency graph
requires:
  - phase: 18-kartan-pinnit
    provides: PaikkaSheet component with suosikki/Heart toggle

provides:
  - BookmarkButton component (replacing HeartButton) with Bookmark/BookmarkCheck icons
  - PaikkaSheet with renamed props todo/onToggleTodo
  - Etusivu with renamed state todoIds/function toggleTodo

affects:
  - 21-02-PLAN.md (SuosikitClient replacement, uses same todoIds pattern)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bookmark/BookmarkCheck lucide icons: Bookmark (unsaved) w-N h-N text-[rgba(17,17,17,0.35)], BookmarkCheck (saved) w-N h-N fill-[#111111] text-[#111111] — both fill- and text- required"
    - "Supabase table name 'suosikit' and wire key 'suosikit' stay unchanged — only local variable names change"

key-files:
  created:
    - app/components/BookmarkButton.tsx
  modified:
    - app/components/PaikkaSheet.tsx
    - app/components/Etusivu.tsx
    - app/paikat/[id]/page.tsx
  deleted:
    - app/components/HeartButton.tsx

key-decisions:
  - "BookmarkButton replaces HeartButton via file rename (git shows it as 71% similar rename)"
  - "PaikkaSheet Props interface: suosikki->todo, onToggleSuosikki->onToggleTodo — atomic rename to avoid TS compile errors"
  - "Etusivu nav link Heart icon replaced with Bookmark, label 'Suosikit' renamed 'TO DO' (deviation: label change not explicitly in plan but required for semantic consistency)"
  - "Supabase table name 'suosikit' in all query strings unchanged — only JS variable names renamed"
  - "AI fetch wire key 'suosikit' in JSON.stringify body unchanged (per D-06 and RESEARCH.md Pattern 4)"

patterns-established:
  - "BookmarkCheck icon always requires both fill- and text- Tailwind classes (Pitfall 5 from plan)"

requirements-completed:
  - TODO-01

# Metrics
duration: 15min
completed: 2026-05-31
---

# Phase 21 Plan 01: BookmarkButton Rename + PaikkaSheet Props Summary

**HeartButton replaced with BookmarkButton (Bookmark/BookmarkCheck icons), PaikkaSheet props renamed suosikki->todo/onToggleSuosikki->onToggleTodo, Etusivu state renamed suosikitIds->todoIds/toggleSuosikki->toggleTodo — all in one atomic wave with no TypeScript errors**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-31T00:00:00Z
- **Completed:** 2026-05-31T00:15:00Z
- **Tasks:** 2
- **Files modified:** 4 (+ 1 created, 1 deleted)

## Accomplishments

- Created BookmarkButton.tsx from HeartButton.tsx: Bookmark/BookmarkCheck icons, isTodo state, TO DO -lista aria-labels
- Deleted HeartButton.tsx (git tracks as 71% similar rename)
- PaikkaSheet Props interface fully renamed: todo/onToggleTodo, Heart icon replaced with conditional Bookmark/BookmarkCheck
- Etusivu: suosikitIds->todoIds, toggleSuosikki->toggleTodo, suosikkiNimet->todoNimet throughout; Supabase table and AI wire key 'suosikit' unchanged
- paikat/[id]/page.tsx import and JSX updated to BookmarkButton
- TypeScript compiles without errors (npx tsc --noEmit exits 0)

## Task Commits

1. **Task 1: Create BookmarkButton.tsx and delete HeartButton.tsx** - `ac9972c` (feat)
2. **Task 2: Rename PaikkaSheet props and update Etusivu call site atomically** - `b11cd10` (feat)

## Files Created/Modified

- `app/components/BookmarkButton.tsx` - New bookmark toggle button replacing HeartButton; Bookmark/BookmarkCheck icons; isTodo state; TO DO aria-labels
- `app/components/HeartButton.tsx` - DELETED
- `app/components/PaikkaSheet.tsx` - Props renamed todo/onToggleTodo; Heart->Bookmark/BookmarkCheck icons
- `app/components/Etusivu.tsx` - State suosikitIds->todoIds, function toggleSuosikki->toggleTodo, suosikkiNimet->todoNimet; nav link label Suosikit->TO DO; wire key unchanged
- `app/paikat/[id]/page.tsx` - Import and JSX updated to BookmarkButton

## Decisions Made

- **Supabase table 'suosikit' unchanged:** Query strings targeting the suosikit table are left as-is — only JS/TS variable names change. Wire key in AI fetch body also left as 'suosikit' (per RESEARCH.md Pattern 4, D-06).
- **Atomic rename:** PaikkaSheet and Etusivu were updated in the same commit to prevent a TypeScript compile window where the prop interface would mismatch the call site.
- **Bookmark in Etusivu nav:** The navigation link Heart icon was replaced with Bookmark and label changed from "Suosikit" to "TO DO" — see deviations below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Etusivu nav link Heart icon and "Suosikit" label updated**
- **Found during:** Task 2 (TypeScript verification)
- **Issue:** After removing Heart from Etusivu.tsx lucide-react import, tsc reported `Cannot find name 'Heart'` at line 730 — the nav sidebar link to `/suosikit` used `<Heart className="w-3.5 h-3.5" />`. Additionally `setSuosikitIds` was still used in the signOut handler.
- **Fix:** Replaced Heart icon with Bookmark icon in the nav link; renamed label "Suosikit" to "TO DO"; renamed setSuosikitIds->setTodoIds in signOut handler; added Bookmark to lucide-react import
- **Files modified:** app/components/Etusivu.tsx
- **Verification:** TypeScript compiles without errors
- **Committed in:** b11cd10 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug: broken TypeScript reference)
**Impact on plan:** Necessary fix — Heart icon had remaining usage in nav that was not listed in the plan. No scope creep; all changes serve the bookmark/TO DO rename objective.

## Issues Encountered

None beyond the auto-fixed deviation above.

## Known Stubs

None — BookmarkButton is fully wired to Supabase suosikit table (same as HeartButton was). No placeholder data or empty values.

## Threat Flags

No new security surface introduced. BookmarkButton reuses the identical RLS-protected suosikit table access pattern from HeartButton (T-21A-01, T-21A-02 accepted per plan threat model).

## Next Phase Readiness

- BookmarkButton and renamed props ready for Plan 02 (SuosikitClient replacement / TO DO -lista page)
- All four modified files compile without errors
- No blockers

---
*Phase: 21-todo-lista*
*Completed: 2026-05-31*
