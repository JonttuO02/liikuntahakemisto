---
phase: 17-toolbar-haku-ux
fixed_at: 2026-05-29T00:00:00Z
review_path: .planning/phases/17-toolbar-haku-ux/17-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 6
skipped: 1
status: partial
---

# Phase 17: Code Review Fix Report

**Fixed at:** 2026-05-29
**Source review:** .planning/phases/17-toolbar-haku-ux/17-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (CR-01, CR-02, WR-01 through WR-06)
- Fixed: 6 (CR-01, CR-02, WR-01, WR-02, WR-03, WR-04, WR-05)
- Skipped: 1 (WR-06 — already fixed in prior commit `9a13b5c`)

---

## Fixed Issues

### CR-01: Debounce timer leaks — `debounceRef` never cleared on unmount

**Files modified:** `app/components/Etusivu.tsx`
**Commit:** `caec763`
**Applied fix:** Added a `useEffect` with empty deps array that calls `clearTimeout(debounceRef.current)` on cleanup. Placed immediately before the `isDark` setup effects so unmount teardown is grouped with other lifecycle effects.

---

### CR-02: Sign-out race — optimistic local state cleared before Supabase promise resolves

**Files modified:** `app/components/Etusivu.tsx`
**Commit:** `1dc9fd5`
**Applied fix:** Moved `setSupabaseUser(null)`, `setSuosikitIds(new Set())`, and `closeOverlays()` to run synchronously before `createBrowserSupabase().auth.signOut()`. Only `router.refresh()` remains inside the `.then()`. This eliminates the window where `supabaseUser` is non-null while the session is being torn down.

---

### WR-01: `toggleSearch` inverted logic — clicking list button when search open closes instead of switching mode

**Files modified:** `app/components/Etusivu.tsx`
**Commit:** `080ea38`
**Applied fix:** Replaced `toggleSearch(focused)` with an `openSearch(focused)` helper. Search button now uses: `searchOpen && searchFocused ? setSearchOpen(false) : searchOpen ? setSearchFocused(true) : openSearch(true)`. LayoutList button uses: `searchOpen && !searchFocused ? setSearchOpen(false) : searchOpen ? setSearchFocused(false) : openSearch(false)`. Each button closes only when it was the one that opened, and switches mode when the other was active.

---

### WR-02: `MapAutoZoom` missing `onComplete` in `useEffect` dependency array

**Files modified:** `app/components/Etusivu.tsx`
**Commit:** `19ecbf1`
**Applied fix:** Added `onComplete` to the `useEffect` dependency array with an `eslint-disable-next-line react-hooks/exhaustive-deps` comment above the deps array, as the call-site arrow function changes identity on every render but the effect semantics are correct with `[map, target, onComplete]`.

---

### WR-03: Selected venue from map does not close search overlay

**Files modified:** `app/components/Etusivu.tsx`
**Commit:** `4d69a30`
**Applied fix:** Applied Option A from the review — added `setSearchOpen(false)` to the venue card marker `onClick` alongside `setValittu(p)`. This ensures the search overlay closes when a user selects a venue from the map at zoom level 16+.

---

### WR-04: AI cache key uses `suosikitIds.size` (count) instead of sorted ID string

**Files modified:** `app/components/Etusivu.tsx`
**Commit:** `9d441b6`
**Applied fix:** Changed the cache key suffix from `suosikitIds.size` to `suosikitSizeAndIds` (the sorted comma-separated ID string already computed by `useMemo`). Cache keys now uniquely identify the actual favourite set, not just its cardinality.

---

### WR-05: `layout` animation on right toolbar violates CLAUDE.md animation rules

**Files modified:** `app/components/Etusivu.tsx`
**Commit:** `7e52743`
**Applied fix:** Replaced the `motion.div` wrapper for the right toolbar pill with a plain `div`. Removed the `layout` prop and the associated spring transition. The `AnimatePresence` fade on the inner expanded content (`motion.div` with `opacity: 0/1`) continues to handle show/hide animation. The pill snaps width on open/close, which is acceptable per CLAUDE.md ("No `layout` animations unless absolutely required — they cause reflow jank").

---

## Skipped Issues

### WR-06: `searchFocused` not controlling overlay content

**File:** `app/components/Etusivu.tsx`
**Reason:** Already fixed in prior commit `9a13b5c` (`fix(17): show card list only in browse mode, not when search button opens overlay`). The card list is already conditionally rendered with `{!searchFocused && ...}`. Re-applying would be a no-op.

---

_Fixed: 2026-05-29_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
