---
phase: 16-brandi-logo-uloke
reviewed: 2026-05-29T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - app/layout.tsx
  - app/manifest.ts
  - app/tietosuoja/page.tsx
  - app/components/AktiiviLogo.tsx
  - app/components/Etusivu.tsx
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 16: Code Review Report

**Reviewed:** 2026-05-29
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 16 introduced the AKTIIVI brand logo (`AktiiviLogo.tsx`), wired it into `Etusivu.tsx` as a tappable sheet handle, updated PWA metadata in `layout.tsx` and `manifest.ts`, and added the `tietosuoja` privacy page. The core animation mechanism in `AktiiviLogo` works for the happy path but carries a race condition that corrupts gradient state when the prop changes rapidly. `Etusivu.tsx` has a missing `onComplete` in a `useEffect` dependency array that causes an infinite loop risk on every render when a map auto-zoom completes, and three instances of `font-medium` (weight 500) that violate the project's 2-weight typography rule. The manifest icon purpose assignments are swapped from the W3C recommendation.

---

## Critical Issues

### CR-01: Race condition corrupts gradient state in `AktiiviLogo` — stale closure captures wrong `currIndex`

**File:** `app/components/AktiiviLogo.tsx:38-42`

**Issue:** The `.then()` callback captures `currIndex` from its closure at animation start. If `gradientIndex` changes again before the 0.55 s sweep animation completes, the old `.then()` still fires and calls `setPrevIndex(oldCurrIndex)`, overwriting the already-updated `prevIndex` with a stale value. This snaps the "previous" gradient back to the wrong colour the next time `gradIndex` advances in `Etusivu`. The `prevIndexRef` is written in the same callback but is never read by the render path (only `prevIndex` state is used), making the ref redundant for its stated purpose while the real state update is prone to staleness.

Concrete reproduction: `gradIndex` changes from 0→1→2 faster than 550 ms (possible on rapid sheet open/close). The first `.then()` fires and calls `setPrevIndex(1)` after the animation for 1→2 has already started, replacing the correct prevIndex(=1) mid-animation with no error.

**Fix:**
```tsx
controls.then(() => {
  // Use the ref to guard — only commit if no newer animation superseded this one
  if (prevIndexRef.current !== currIndex) {
    prevIndexRef.current = currIndex
    setPrevIndex(currIndex)
    rect.setAttribute('width', '0')
  }
})
```

Additionally, make `prevIndexRef` authoritative and derive `prevIndex` from it so the ref and state cannot desync:
```tsx
// In useEffect cleanup / completion, always write ref first, then state.
// Or: remove prevIndexRef entirely and rely on the functional updater pattern
// in setPrevIndex so the callback always reads the latest committed value.
controls.then(() => {
  setPrevIndex(prev => {
    // Only advance if we haven't already moved past this transition
    rect.setAttribute('width', '0')
    return currIndex
  })
})
```

---

## Warnings

### WR-01: `MapAutoZoom` — `onComplete` missing from `useEffect` dependency array causes stale closure

**File:** `app/components/Etusivu.tsx:82-88`

**Issue:** `onComplete` is a callback prop passed as an inline arrow function at line 442: `onComplete={() => setAutoZoomTarget(null)}`. Because the effect only lists `[map, target]`, every time the parent re-renders a new `onComplete` reference is created but the effect does not re-run. In the opposite direction, if `onComplete` identity ever matters (e.g., if it is memoized or changes), the stale closure will silently call the old version. While the current inline function is referentially new on every render, the effect also does not re-run to pick it up — meaning the `onComplete` called is always whichever one was captured at the most recent time `map` or `target` changed. The linter suppressor on line 302 (in the focusId effect) is unrelated; this function has no suppressor, so the `react-hooks/exhaustive-deps` lint rule should already be flagging it. Omitting a callback from deps is an unhandled stale-closure bug.

**Fix:**
```tsx
// Wrap onComplete in useCallback at the call site so its reference is stable:
// <MapAutoZoom target={autoZoomTarget} onComplete={useCallback(() => setAutoZoomTarget(null), [])} />
// OR add onComplete to the dep array:
}, [map, target, onComplete])
```

---

### WR-02: `supabaseUser` excluded from AI-fetch effect dependency array — wrong API branch used after sign-in/out

**File:** `app/components/Etusivu.tsx:274-289`

**Issue:** The effect at lines 260–289 branches on `supabaseUser !== null` to decide between the authenticated POST and unauthenticated GET endpoints (line 274). However, `supabaseUser` is not listed in the dependency array (line 289 only lists `[suosikitSizeAndIds, weatherKaupunki, kotikaupunki]`). If a user signs in (setting `supabaseUser`) but neither `suosikitSizeAndIds`, `weatherKaupunki`, nor `kotikaupunki` changes, the effect will not re-run and the widget will keep calling the unauthenticated endpoint even though a user is now logged in. The next weather city change will eventually trigger a re-run with the correct branch, but there is a window where personalised recommendations are silently not fetched.

The `eslint-disable-next-line react-hooks/exhaustive-deps` comment acknowledges `paikat` is intentionally excluded (with explanation), but does not mention the `supabaseUser` exclusion, suggesting it was not intentional.

**Fix:** Add `supabaseUser` to the dependency array, or note the intentional exclusion with a comment:
```tsx
}, [suosikitSizeAndIds, weatherKaupunki, kotikaupunki, supabaseUser])
```

---

### WR-03: `font-medium` (weight 500) used in three places — violates project typography rule

**File:** `app/components/Etusivu.tsx:683, 840, 963`

**Issue:** CLAUDE.md states **"2 weights only: 400 (normal) and 700 (bold). Never use 600 (semibold)."** `font-medium` computes to `font-weight: 500`, which is not in the allowed set (400 and 700). All three usages are in `Etusivu.tsx`:

- Line 683: `text-sm font-medium text-[#111111]` — AI widget text
- Line 840: `text-[#111111] text-sm font-medium underline underline-offset-2` — "Tyhjennä haku" button
- Line 963: `font-medium text-sm px-5 py-3 rounded-full` — "Näytä tiedot" link button

**Fix:** Replace `font-medium` with either `font-normal` (400) or `font-bold` (700) depending on the intended visual weight. The AI widget text at line 683 is body copy — `font-normal` is appropriate. The "Tyhjennä haku" button and "Näytä tiedot" link at 840/963 are interactive labels — `font-bold` is consistent with all other interactive labels in the component.

---

### WR-04: PWA manifest icon `purpose` values are swapped from W3C recommendation

**File:** `app/manifest.ts:13-25`

**Issue:** The 192×192 icon is assigned `purpose: 'maskable'` and the 512×512 icon is assigned `purpose: 'any'`. The W3C Web App Manifest spec and Google's PWA guidance recommend the opposite: the larger 512×512 icon should be `maskable` (it has more safe-zone margin to absorb adaptive icon cropping), and the 192×192 icon should be `any` (or both icons should carry both values as `'any maskable'`). With the current config, Android launchers that apply adaptive icon masking will crop the 192×192 icon, which is the one actually used for app icons, potentially clipping the logo. The 512×512 with `purpose: 'any'` is used for splash screens, where masking is not applied, so making it `maskable` provides no benefit there.

**Fix:**
```ts
icons: [
  {
    src: '/icon-192x192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: '/icon-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable',
  },
],
```
Or, if the 192×192 icon has proper safe-zone bleed (≥10% on all sides), use `'any maskable'` for both.

---

## Info

### IN-01: `letterPaths` array defined inside render — allocated on every paint

**File:** `app/components/AktiiviLogo.tsx:52-61`

**Issue:** `letterPaths` is a constant array of 8 string literals declared inside the component body. It is re-allocated on every render even though its contents never change. At the current render frequency this is negligible, but it is a clear candidate for hoisting.

**Fix:** Move the array outside the component function, alongside `GRADIENTS`:
```tsx
const LETTER_PATHS = [
  'M285 506 L370 356 L456 506',
  // ... rest of paths
]
```

---

### IN-02: `prevIndexRef` is written but never read — dead code

**File:** `app/components/AktiiviLogo.tsx:20, 39`

**Issue:** `prevIndexRef` is initialised at line 20 and written inside the `.then()` callback at line 39, but its value is never read anywhere in the component. Only the `prevIndex` state variable (line 21) is consumed at line 48. The ref exists as a leftover from a refactor. While harmless, it adds confusion about the component's intended state management approach (see also CR-01 for why the ref/state dual-track design is error-prone).

**Fix:** Remove `prevIndexRef` entirely, or — if the intent was to use it as a guard against stale closures (see CR-01 fix) — actually read it in the `.then()` callback.

---

### IN-03: `tietosuoja` page uses a muted-text opacity value not in the design system

**File:** `app/tietosuoja/page.tsx:33, 45, 49, 62, 65, 78, 82, 95, 105, 111`

**Issue:** All body paragraphs use `text-[rgba(17,17,17,0.65)]`. CLAUDE.md defines three foreground opacity levels: `0.45` (muted), `0.35` (disabled), and `#111111` / `0.4` (label caps in some contexts). The value `0.65` is not part of the design token set and sits between primary and muted without a defined role. It reads slightly lighter than body copy but darker than muted text, producing an in-between tone that doesn't map to any semantic role in the design system.

**Fix:** Use `text-[rgba(17,17,17,0.45)]` for supporting copy (the defined muted token) or `text-[#111111]` for primary body text, depending on the desired visual hierarchy.

---

_Reviewed: 2026-05-29_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
