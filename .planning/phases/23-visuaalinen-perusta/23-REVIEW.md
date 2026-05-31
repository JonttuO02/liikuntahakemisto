---
phase: 23-visuaalinen-perusta
reviewed: 2026-06-01T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - app/layout.tsx
  - app/components/AktiiviLogo.tsx
  - app/globals.css
  - app/components/SportPin.tsx
  - app/components/Etusivu.tsx
  - lib/sportPins.ts
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 23: Code Review Report

**Reviewed:** 2026-06-01T00:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Phase 23 replaces the Inter font with Outfit in `layout.tsx`, rewrites `AktiiviLogo.tsx` with a self-contained animation loop, introduces a new `SportPin.tsx` inline map-pin component, migrates cluster-pin markup inline in `Etusivu.tsx`, adds `@keyframes spinOrbit` / `.pin-glint` to `globals.css`, and clears `lib/sportPins.ts`.

The font swap and CSS additions are clean. The main risks are a timer leak in `AktiiviLogo`, a layout-breaking coordinate resolution flaw in `SportPin`, `AktiiviLogo` being an orphaned export (no importer), and two code-quality issues in `Etusivu.tsx`.

---

## Warnings

### WR-01: `wait()` in AktiiviLogo leaves `setTimeout` running after unmount — promise never resolves but timer fires anyway

**File:** `app/components/AktiiviLogo.tsx:16-23`

**Issue:** The `wait()` helper creates a `setTimeout` but only stores its ID in a local `const id` that is immediately discarded with `void id`. When `cancelled` is set to `true` by the cleanup function the timer callback checks the flag and skips `resolve()`, so the awaited promise hangs forever — leaking the in-progress `setTimeout`. On a fast unmount/remount cycle (e.g. hot reload, StrictMode double-invoke) this leaves one dangling timer per animation cycle currently mid-wait. The comment itself admits the id is merely "cleared by cancelled flag", which is incorrect — the flag prevents resolve but does NOT call `clearTimeout`.

**Fix:**
```ts
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    let id: ReturnType<typeof setTimeout>
    id = setTimeout(() => {
      if (!cancelled) resolve()
    }, ms)
    // Register for cleanup so the timer doesn't fire after unmount
    pendingTimeout = id
  })
}
```
And in the cleanup closure: `if (pendingTimeout) clearTimeout(pendingTimeout)`.
A simpler, self-contained approach: store the single pending timeout in a variable outside `wait()` the same way `currentControls` is stored for the animate call, and clear it in the cleanup.

---

### WR-02: `SportPin` glint dot's `transform-origin` is misaligned — orbit does not rotate around the pin's visual center

**File:** `app/components/SportPin.tsx:74-78` and `app/globals.css:128`

**Issue:** The `.pin-glint` element is 4×4 px centered at the pin body's 50%/50% point (via `top:50%; left:50%; margin:-2px -2px`). Its `transform-origin` is `0px 13px`, meaning the rotation axis is 13 px below the element's own top-left corner — i.e. 13 px below the center of the pin body. The pin body is 38 px tall; its visual center is at y≈17 px from the top of the container. The glint element's top is at 50% of 38 px = 19 px. Adding 13 px gives a rotation axis at 32 px from the container top — well into the teardrop point, not the center of the white circle (y≈14 px). At 28 px wide the center of the glint element is at x=14 px; `transform-origin: 0px` places the axis at x=14 px to the left of the element's left edge. The combined result is that the orbit path is off-center relative to the white circle and clips the pin body boundary visually.

The `translateY(-13px)` in `spinOrbit` assumes the glint starts 13 px above its natural position; combined with the off-origin placement the orbit radius is effective but the center of the circle it traces is not the white circle's center.

**Fix:** Use a wrapper div positioned at the white circle center with `transform-origin: 50% 50%` on the wrapper; place the glint at a fixed offset outward:
```css
/* globals.css */
@keyframes spinOrbit {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.pin-orbit-wrapper {
  position: absolute;
  top: 14px;   /* center of the 20×20 white circle (top:4 + height/2=10) */
  left: 14px;  /* same, left:4 + 10 */
  width: 0;
  height: 0;
  transform-origin: 0 0;
  animation: spinOrbit 4s linear infinite;
  pointer-events: none;
}
.pin-glint {
  position: absolute;
  width: 4px; height: 4px;
  border-radius: 50%;
  background: rgba(255,255,255,0.9);
  box-shadow: 0 0 3px rgba(56,189,248,0.8);
  top: -2px; left: 11px;  /* 11px = desired orbit radius - 2px half-size */
}
```

---

### WR-03: `AktiiviLogo` is exported but never imported — dead component ships in the bundle

**File:** `app/components/AktiiviLogo.tsx:6`

**Issue:** A full-text codebase search finds zero import statements for `AktiiviLogo`. `NavBar.tsx` imports `ActaLogo` (the previous logo component). The `app/layout.tsx` does not import it. The component is compiled and tree-shaken at build time but the file still represents dead code from the phase's stated goal (logo redesign). If this is intentional scaffolding for a later wave, it should be noted; if it was meant to replace `ActaLogo` in `NavBar.tsx` that replacement was not applied.

**Fix:** Either wire `AktiiviLogo` into `NavBar.tsx` (replacing the `ActaLogo` import) as presumably intended by the phase plan, or delete the file. Leaving a non-imported component creates confusion about the active logo component.

---

### WR-04: Inline cluster pin in `Etusivu.tsx` duplicates `SportPin` structure — divergence will occur silently

**File:** `app/components/Etusivu.tsx:628-641`

**Issue:** The cluster pin (lines 628–641) manually recreates the teardrop body, white circle, and `.pin-glint` divs with identical inline styles rather than composing via `SportPin`. The two implementations are currently pixel-identical but are now two separate code paths. Any future change to the pin geometry (border-radius ratio, gradient stop, circle size) must be applied in both places; the compiler will not catch divergence. This is exactly the pattern the migration to `SportPin` was meant to eliminate.

**Fix:** Extract a shared `PinShell` component (or accept a `count` prop on `SportPin`) so the cluster and single-venue paths share one implementation:
```tsx
// Option A: add optional prop to SportPin
interface SportPinProps {
  laji?: string       // undefined → show count badge instead of icon
  count?: number
  animDelay?: number
}
```

---

## Info

### IN-01: `wait()` promise never rejects on cancellation — `runLoop` goroutine cannot be truly aborted

**File:** `app/components/AktiiviLogo.tsx:16-23`

**Issue:** When `cancelled = true`, the pending `wait()` call's promise never settles (neither resolves nor rejects). The `async runLoop` function is awaiting it; the while-loop body is suspended with no way to exit until the timer fires. For a 3-second pause (`wait(3000)`) the loop goroutine lingers up to 3 s after unmount before it checks `cancelled` and exits. While not a memory leak per se (the promise and callback are GC'd eventually), it is unexpected behavior: the cleanup function sets `cancelled = true` and cancels `currentControls`, giving the appearance of an immediate teardown when teardown is actually deferred by up to 3 seconds.

**Fix:** Use `AbortController` or a reject-on-cancel pattern so `await wait(3000)` returns immediately:
```ts
function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => { clearTimeout(id); reject(new DOMException('Aborted', 'AbortError')) })
  })
}
// In runLoop: wrap await calls in try/catch for AbortError
```

---

### IN-02: `letterPaths` defined inside the component body — reallocated on every render

**File:** `app/components/AktiiviLogo.tsx:63-72`

**Issue:** `letterPaths` is an array of 8 string literals declared inside the function body. It is recreated on every render. Because React reconciles the `<path>` elements by `key={i}` and the values are identical, there is no visible bug, but the allocation is needless. Move the array to module scope.

**Fix:**
```ts
// Outside component
const LETTER_PATHS = [
  'M285 506 L370 356 L456 506',
  // ...
]
```

---

### IN-03: `font-weight: 600` used in `.pin-label` CSS — violates the "2 weights only" design rule

**File:** `app/globals.css:106`

**Issue:** `.pin-label` sets `font-weight: 600` (semibold). CLAUDE.md design guidelines state "2 weights only: 400 (normal) and 700 (bold). Never use 600 (semibold)." This rule was not introduced by Phase 23 (`.pin-label` predates it) but the phase added content to this file and did not correct the existing violation. The label text is small enough (11 px) that 600 vs 700 is imperceptible, but it contradicts the explicit constraint.

**Fix:** Change `font-weight: 600` to `font-weight: 700` at line 106 in `globals.css`.

---

_Reviewed: 2026-06-01T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
