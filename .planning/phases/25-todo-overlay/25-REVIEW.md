---
phase: 25-todo-overlay
reviewed: 2026-06-02T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - app/components/Etusivu.tsx
  - app/components/DiagonaalKortti.tsx
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: issues_found
---

# Phase 25: Code Review Report

**Reviewed:** 2026-06-02
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Both files implement the TO DO overlay feature: `DiagonaalKortti` is a new diagonal-split card
component used in the TO DO overlay and search results panel, and `Etusivu` integrates the overlay,
a bookmark-toggle button, and an inline post-removal review prompt. The implementation is largely
coherent, but two logic errors produce silent data corruption and a dangling review form — both
ship-blocking. Four warnings cover unreliable teardown, an unguarded `setTimeout` after unmount,
a missing backdrop for the inline review form, and a duplicate icon map. Two info items note
unused imports and a font-weight deviation.

---

## Critical Issues

### CR-01: `inlineReview` panel rendered outside `todoOpen` guard — review form visible after overlay closes

**File:** `app/components/Etusivu.tsx:956`

**Issue:** The `pendingReviewPaikkaId` prompt correctly gates on `todoOpen` (line 928:
`pendingReviewPaikkaId !== null && todoOpen`), but the sibling `reviewPaikkaId` panel (line 956)
has **no `todoOpen` guard**. A user can:
1. Tap remove on a card → review form appears inside the overlay.
2. Tap the backdrop or close the overlay (`closeOverlays()` → `setTodoOpen(false)`,
   `setReviewPaikkaId(null)`).

The backdrop at z-63 (`anyOverlayOpen`) only covers when `rightOpen` is true; `todoOpen` is not
included in `anyOverlayOpen` (line 629: `const anyOverlayOpen = rightOpen`). So closing the TODO
overlay via the TodoButton (line 1152) sets `todoOpen = false` but does NOT call `closeOverlays`,
meaning `reviewPaikkaId` stays non-null. Because the `AnimatePresence` block at line 927 is
**inside** the `todoOpen &&` block of the parent, after `todoOpen` becomes false the entire parent
motion.div unmounts, which will call the exit animation correctly — but only via that path.

The more dangerous path: the user taps the TodoButton again to **reopen** the overlay (`setTodoOpen(o => !o)`, line 1152). The overlay re-mounts with the stale `reviewPaikkaId` still set,
so the review form re-appears for a venue the user may have re-added or that no longer exists in
`todoPaikat`. There is no mechanism to clear `reviewPaikkaId` when the overlay re-opens, so any
in-progress review state (`inlineRating`, `inlineTeksti`) persists invisibly and can be submitted
against the wrong venue context.

**Fix:** Either include `todoOpen` in the guard on `reviewPaikkaId`, or call `resetInlineReview()`
inside the TodoButton onClick when closing:

```tsx
// Option A — guard the panel:
{reviewPaikkaId !== null && todoOpen && (
  <motion.div key="inlineReview" ...>

// Option B — reset on close in the TodoButton handler:
onClick={() => {
  if (todoOpen) resetInlineReview()
  setTodoOpen(o => !o)
}}
```

---

### CR-02: `handleOverlayDelete` always calls `toggleTodo` unconditionally — removes item even when user taps the delete button on a venue NOT in `todoIds`

**File:** `app/components/Etusivu.tsx:391-396`

**Issue:** `handleOverlayDelete` calls `await toggleTodo(id)` which performs an **optimistic
toggle** — if the item is already saved it deletes it; if not, it **inserts** it. In the TO DO
overlay, `DiagonaalKortti` is only rendered for `todoPaikat` (which correctly filters by `todoIds`),
so normally the id will be in `todoIds`. However, there is a race: `toggleTodo` itself checks
`todoIds.has(id)` from a closure at call time (line 365). If a concurrent `toggleTodo` call for
the same id is already in flight (`inFlight.current.has(id)` guard prevents re-entry, line 352),
the second call returns early without calling `setPendingReviewPaikkaId`. This means
`handleOverlayDelete` can await `toggleTodo` successfully (no error thrown — toggleTodo returns
`undefined` on the early-exit path, line 353), and still calls `setPendingReviewPaikkaId(id)` even
though **the delete never actually happened**. The "Kävikö paikassa?" prompt then fires for a venue
that is still in the list, and if the user answers "Kyllä" and submits a review, a review is posted
for a venue that was not removed.

**Fix:** Have `toggleTodo` return a boolean indicating whether the operation completed, and check
it in `handleOverlayDelete`:

```tsx
async function toggleTodo(id: number): Promise<boolean> {
  if (inFlight.current.has(id)) return false   // already in flight
  inFlight.current.add(id)
  // ... existing logic ...
  return true
}

async function handleOverlayDelete(id: number) {
  const completed = await toggleTodo(id)
  if (completed && supabaseUser !== null) {
    setPendingReviewPaikkaId(id)
  }
}
```

---

## Warnings

### WR-01: `setTimeout` inside `handleInlineReviewSubmit` is not cleared on unmount — stale state update after navigation

**File:** `app/components/Etusivu.tsx:428-434`

**Issue:** After a successful review submission, a bare `setTimeout(..., 1500)` resets inline
review state. The component has cleanup `useEffect` hooks for `debounceRef` and `rightOpenTimerRef`
(lines 469-481), but no equivalent cleanup for this timer. If the user navigates away within 1.5 s
of a successful submission, the `setTimeout` callback fires on the unmounted component and calls
`setReviewPaikkaId(null)`, `setInlineRating(0)`, etc., producing React "setState on unmounted
component" warnings and potentially interfering with the new page's state.

**Fix:** Promote the timer to a ref and clear it on unmount:

```tsx
const reviewResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

// inside handleInlineReviewSubmit, replace bare setTimeout:
reviewResetTimerRef.current = setTimeout(() => { ... }, 1500)

// add cleanup effect alongside existing timer cleanups:
useEffect(() => {
  return () => { if (reviewResetTimerRef.current) clearTimeout(reviewResetTimerRef.current) }
}, [])
```

---

### WR-02: Closing TODO overlay via backdrop does not reset inline review state

**File:** `app/components/Etusivu.tsx:883-885`

**Issue:** The backdrop div at z-63 fires `closeOverlays()` (line 884). `closeOverlays` correctly
calls `setReviewPaikkaId(null)` and `setPendingReviewPaikkaId(null)` (lines 321-322). However,
`anyOverlayOpen` is only `rightOpen` (line 629) — the TODO overlay is not included. This means
**the backdrop never renders** when only the TODO overlay is open. A user who opens the TODO
overlay, triggers the inline review form, and then taps outside the overlay has no tap-to-close
mechanism for the review form; they can only use the "Ohita" button inside the form or the
TodoButton. This is a UX correctness defect: the review form can appear stuck.

**Fix:** Include `todoOpen` in `anyOverlayOpen`:

```tsx
const anyOverlayOpen = rightOpen || todoOpen
```

Note: verify that the backdrop's z-63 does not conflict with the TODO overlay's z-62 — since the
backdrop sits below z-64 toolbar buttons, this should be safe, but test that clicking outside the
overlay but inside the screen closes it correctly.

---

### WR-03: `SPORT_ICONS` map duplicated verbatim between `Etusivu.tsx` and `DiagonaalKortti.tsx`

**File:** `app/components/Etusivu.tsx:122-130` / `app/components/DiagonaalKortti.tsx:24-32`

**Issue:** The `SPORT_ICONS` record is defined twice with identical content. Any future addition
of a sport type must be added in two places. Per CLAUDE.md: "`lib/lajit.ts` is the single source
of truth for sport labels and colors." The icon mapping belongs there as well.

**Fix:** Export the icon map from `lib/lajit.ts` and import it in both components:

```ts
// lib/lajit.ts
import { Dumbbell, Waves, Leaf, Building2, Zap, Target, Activity } from 'lucide-react'
export const SPORT_ICONS: Record<string, LucideIcon> = { padel: Zap, ... }
```

---

### WR-04: `DiagonaalKortti` bookmark button `aria-label` is hardcoded to "Poista TO DO -listalta" even when used in search-results context

**File:** `app/components/DiagonaalKortti.tsx:147`

**Issue:** `DiagonaalKortti` is rendered in two contexts: the TODO overlay (where `onToggleTodo`
removes an item) and the search results panel (where `onToggleTodo` is **not passed** — the prop
is undefined and the button does not render). In the TODO overlay the label "Poista TO DO -listalta"
is correct. However if `onToggleTodo` were passed in a future search-result context for adding
(not removing), the label would be wrong. More critically, the button currently never shows a
filled/active bookmark state — the icon is always the outline `<Bookmark>` regardless of whether
the venue is already saved. Screen reader users have no feedback about the current saved state.

**Fix:** Accept a `isSaved` prop and derive the label:

```tsx
interface DiagonaalKorttiProps {
  ...
  isSaved?: boolean
  onToggleTodo?: (id: number) => void
}

// in JSX:
aria-label={isSaved ? 'Poista TO DO -listalta' : 'Lisää TO DO -listaan'}
```

---

## Info

### IN-01: Unused imports in `Etusivu.tsx`

**File:** `app/components/Etusivu.tsx:7`

**Issue:** `Moon` and `Sun` are imported from `lucide-react` and used (day/night toggle — line
1248-1256). `LayoutGroup` is imported from `framer-motion` (line 6) and used as the root wrapper
(line 676). However `User` appears twice conceptually — as the Profiili icon and as the Kirjaudu
icon (lines 1091, 1121) — that is intentional. On review all lucide imports are actually consumed.
The real unused item is `supabaseUser` being read inside `useEffect` at line 551 where it is used
only to branch the fetch method — but the eslint-disable comment already acknowledges the omission
from the dependency array (line 566). This is not a missing dep bug since `supabaseUser` is
captured via closure intentionally. No action needed — this is informational.

**Actual unused import:** `hintateksti` is imported in `DiagonaalKortti.tsx` (line 8) but the
derived `hintaTeksti` variable (line 45) is only used in the `priceText` calculation (line 47).
Tracing line 47: `membershipOnly ? null : (paikka.hinta_kuvaus?.split('\n')[0] ?? (hintaTeksti !== '' ? hintaTeksti : null))` — `hintaTeksti` IS used as a fallback when `hinta_kuvaus` is absent.
So the import is live. No unused imports confirmed.

**Actual finding:** The `diagonaalKorttiVariants` export from `DiagonaalKortti.tsx` (line 15) is
imported into `Etusivu.tsx` (line 27) but never referenced in `Etusivu.tsx` JSX — the
`DiagonaalKortti` children inside the TODO overlay rely on the variants being applied inside the
component itself via `motion.div variants={diagonaalKorttiVariants}`. The import in Etusivu is
dead.

**Fix:** Remove the `diagonaalKorttiVariants` named import from `Etusivu.tsx` line 27:

```tsx
import DiagonaalKortti from './DiagonaalKortti'
```

---

### IN-02: `text-lg` used in `CalloutCard` violates the 4-size typography rule

**File:** `app/components/Etusivu.tsx:204, 219`

**Issue:** CLAUDE.md defines exactly 4 permitted font sizes. `text-lg` is not among them (the four
are `text-[10px]`, `text-sm`, `text-xl`, `text-3xl sm:text-4xl`). Both the venue name and sport
label inside `CalloutCard` use `text-lg font-bold` (lines 204 and 219). This is a design-system
violation introduced in this phase.

**Fix:** Replace with `text-sm font-bold` (Body / UI label tier) or `text-xl font-bold`
(Subheading tier) according to the intended visual weight of the callout card name.

---

_Reviewed: 2026-06-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
