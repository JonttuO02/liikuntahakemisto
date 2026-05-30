---
phase: 20-navigaatio-korjaukset
fixed_at: 2026-05-30T00:00:00Z
review_path: .planning/phases/20-navigaatio-korjaukset/20-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 20: Code Review Fix Report

**Fixed at:** 2026-05-30T00:00:00Z
**Source review:** .planning/phases/20-navigaatio-korjaukset/20-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (CR-01, CR-02, CR-03, WR-01, WR-02, WR-03, WR-04, WR-05)
- Fixed: 8
- Skipped: 0

## Fixed Issues

### CR-01 + WR-04: NavPill sign-out and auth-gated links

**Files modified:** `app/components/NavPill.tsx`
**Commit:** 17dc93a
**Applied fix:** Added `useRouter` import; `handleSignOut` is now `async`, awaits `signOut()`, and calls `router.refresh()` in the `finally` block. Profiili/Suosikit links are wrapped in `{user && (...)}` so they are hidden for unauthenticated users. A comment notes that both destination pages carry their own guest guards (ProfiiliClient and SuosikitClient both handle the unauthenticated state).

### CR-02: SuosikitClient stale setState guard

**Files modified:** `app/suosikit/SuosikitClient.tsx`
**Commit:** 60e9510
**Applied fix:** Added a `cancelled` boolean flag. `loadFavorites` checks the flag before the await and again after. `subscribeToAuthUser` return value captured as `unsub`; cleanup returns `() => { cancelled = true; unsub() }`.

### CR-03: Etusivu sessionStorage shape validation

**Files modified:** `app/components/Etusivu.tsx`
**Commit:** fffbea6
**Applied fix:** Each field of the parsed JSON is now checked with `typeof` before calling the corresponding state setter (string for text fields, boolean for toggles, number > 0 for scrollTop). Empty `catch {}` replaced with `catch (err) { console.warn(...) }`. The trailing `eslint-disable-line` on this effect was also converted to `eslint-disable-next-line` (see WR-05).

### WR-01: Bottom sheet left/right animation comment

**Files modified:** `app/components/Etusivu.tsx`
**Commit:** 383b54d
**Applied fix:** Added a block comment above the bottom sheet `motion.div` documenting that animating CSS `left`/`right` is an intentional exception to the CLAUDE.md "no layout animations" rule, explaining the architectural constraints that make a compositor-only alternative impractical for this specific transition.

### WR-02: rightOpen setTimeout cleared on unmount

**Files modified:** `app/components/Etusivu.tsx`
**Commit:** 9c0fbfa
**Applied fix:** Added `rightOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)`. The onClick handler clears any existing timer before setting a new one. A cleanup `useEffect` clears the timer on unmount, mirroring the existing `debounceRef` cleanup pattern.

### WR-03: DiagonaalKortti full-cover Link gets z-10

**Files modified:** `app/components/DiagonaalKortti.tsx`
**Commit:** 4a5772f
**Applied fix:** Added `z-10` to the full-cover `<Link>` element. A short inline comment explains the intent. The MapPin button's existing `z-20` now explicitly wins the stacking context on all devices.

### WR-05: Replace trailing eslint-disable-line with targeted disable-next-line

**Files modified:** `app/components/Etusivu.tsx`
**Commit:** 43c55b4
**Applied fix:** Both remaining `// eslint-disable-line react-hooks/exhaustive-deps` trailing comments were converted to `// eslint-disable-next-line react-hooks/exhaustive-deps` placed on the line before the dep array, each with a brief explanatory note about why the omitted deps are safe (stable useState setters; mount-only intent).

## Skipped Issues

None — all 8 in-scope findings were fixed.

---

**Build verification:** `npm run build` completed successfully after all fixes. No new errors or type failures introduced. Pre-existing `<img>` warnings are unrelated to this phase.

---

_Fixed: 2026-05-30T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
