---
phase: 25-todo-overlay
fixed_at: 2026-06-02T00:00:00Z
review_path: .planning/phases/25-todo-overlay/25-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 4
skipped: 2
status: partial
---

# Phase 25: Code Review Fix Report

**Fixed at:** 2026-06-02
**Source review:** .planning/phases/25-todo-overlay/25-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (CR-01, CR-02, WR-01, WR-02, WR-03, WR-04)
- Fixed: 4 (CR-01, CR-02, WR-01, WR-03, WR-04)
- Skipped: 1 (WR-02 — design conflict, per instruction)
- Out of scope: 2 (IN-01, IN-02 — Info severity, not included in critical_warning scope)

## Fixed Issues

### CR-01: Add `todoOpen` guard to `inlineReview` panel

**Files modified:** `app/components/Etusivu.tsx`
**Commit:** 5020e8f
**Applied fix:** Changed the TodoButton's `onClick` handler from `() => setTodoOpen(o => !o)` to call `resetInlineReview()` before toggling when `todoOpen` is true (Option B from REVIEW.md). This ensures any in-progress inline review state is cleared whenever the overlay is closed via the TodoButton, preventing stale review state from reappearing on overlay reopen.

---

### CR-02: Make `toggleTodo` return a boolean; check it in `handleOverlayDelete`

**Files modified:** `app/components/Etusivu.tsx`
**Commit:** 2e98e4c
**Applied fix:** Changed `toggleTodo` signature to `async function toggleTodo(id: number): Promise<boolean>`. The in-flight early-exit path returns `false`, the no-user early-exit path returns `false`, and the successful completion path returns `true`. In `handleOverlayDelete`, changed `await toggleTodo(id)` to `const completed = await toggleTodo(id)` and guarded the `setPendingReviewPaikkaId(id)` call with `if (completed && supabaseUser !== null)`. This prevents the review prompt from firing when the delete was skipped due to a concurrent in-flight request.

---

### WR-01: Clear `setTimeout` on unmount

**Files modified:** `app/components/Etusivu.tsx`
**Commit:** 0c9f1f5
**Applied fix:** Added `const reviewResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)` alongside the existing timer refs. Changed the bare `setTimeout` inside `handleInlineReviewSubmit` to `reviewResetTimerRef.current = setTimeout(...)`. Added a cleanup `useEffect` alongside the existing `debounceRef` and `rightOpenTimerRef` cleanups that calls `clearTimeout(reviewResetTimerRef.current)` on unmount.

---

### WR-03: Deduplicate SPORT_ICONS — export from `lib/lajit.ts`

**Files modified:** `lib/lajit.ts`, `app/components/Etusivu.tsx`, `app/components/DiagonaalKortti.tsx`
**Commit:** c3b3669
**Applied fix:** Added `import { Dumbbell, Waves, Leaf, Building2, Zap, Target, Activity } from 'lucide-react'` and `export const SPORT_ICONS: Record<string, LucideIcon>` to `lib/lajit.ts` as the single source of truth. Removed the duplicate `SPORT_ICONS` const from both `Etusivu.tsx` and `DiagonaalKortti.tsx`. Updated both files to import `SPORT_ICONS` from `@/lib/lajit`. Removed the now-unused lucide icon imports (`Dumbbell, Waves, Leaf, Building2, Zap, Target`) and `LucideIcon` type import from both component files; kept `Activity` in each file as the fallback icon for unknown sport types.

---

### WR-04: Add `isSaved` prop to `DiagonaalKortti` for accessibility

**Files modified:** `app/components/DiagonaalKortti.tsx`, `app/components/Etusivu.tsx`
**Commit:** ac43ddf
**Applied fix:** Added `isSaved?: boolean` to `DiagonaalKorttiProps` interface and added `isSaved` to the function destructure. Changed the bookmark button's `aria-label` from the hardcoded `"Poista TO DO -listalta"` to `{isSaved ? 'Poista TO DO -listalta' : 'Lisää TO DO -listaan'}`. In `Etusivu.tsx`, added `isSaved={true}` to the `DiagonaalKortti` rendered inside the TODO overlay (where all cards are by definition already saved).

---

## Skipped Issues

### WR-02: Closing TODO overlay via backdrop does not reset inline review state

**File:** `app/components/Etusivu.tsx:629`
**Reason:** skipped: design conflict — CLAUDE.md and phase design contract (D-05) explicitly lock `anyOverlayOpen = rightOpen` only. The TODO overlay does not participate in the backdrop mechanism by design. Fixing WR-02 would override a locked design decision.
**Original issue:** The backdrop div fires `closeOverlays()` but `anyOverlayOpen` is only `rightOpen`, so the backdrop never renders when only the TODO overlay is open. A user who triggers the inline review form from the TODO overlay has no tap-to-close escape except the "Ohita" button.

---

_Fixed: 2026-06-02_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
