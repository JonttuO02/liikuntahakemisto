---
phase: 28-svg-ikonit
reviewed: 2026-06-03T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - app/components/DiagonaalKortti.tsx
  - app/components/Etusivu.tsx
  - app/components/PaikkaKortti.tsx
  - lib/lajit.ts
  - lib/sportIcons.tsx
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 28: Code Review Report

**Reviewed:** 2026-06-03T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

This phase introduced `lib/sportIcons.tsx` as a centralised SVG icon registry, a `SportIcon` React component, and migrated `DiagonaalKortti`, `PaikkaKortti`, and `Etusivu` to consume it. The overall structure is sound and the compile-time-constant justification for `dangerouslySetInnerHTML` is correct. However, two critical bugs were found — one wrong fallback key that silently renders the wrong icon for unknown sport slugs, and one logic inversion in `handleOverlayDelete` that sends authenticated users into a review flow when they tap the delete (remove from TO DO) button instead of deleting directly. Four warnings cover an animation-guideline violation, a stale image-fallback when `paikka.image_url` changes at runtime, a missing `aria-hidden` on decorative SVG instances, and an inconsistent `use client` placement. Three info items address the tennis icon's visual mismatch, a duplicate `EASE_OUT` constant, and a dead `isSaved` prop on `DiagonaalKortti`.

---

## Critical Issues

### CR-01: Wrong fallback key — unknown sport slugs render "liikunta" icon instead of the neutral fallback

**File:** `lib/sportIcons.tsx:66`
**Issue:** The `SportIcon` component falls back to `SPORT_ICONS['liikunta']` for any `laji` that is not a key in the map. However `SPORT_ICONS` also contains a dedicated `'fallback'` key (a neutral filled circle) that is intentionally meant for this purpose — `SportPin.tsx` correctly uses `SPORT_ICONS['fallback']` on line 37. Falling back to `'liikunta'` instead means unknown sport slugs silently render the heart-rate/activity waveform icon, which is semantically wrong and inconsistent with the map pin behaviour. If a new sport type is added to the database before `SPORT_ICONS` is updated, every card badge will silently show the wrong icon rather than a neutral dot.

**Fix:**
```tsx
// lib/sportIcons.tsx line 66 — change the fallback key
dangerouslySetInnerHTML={{ __html: SPORT_ICONS[laji] ?? SPORT_ICONS['fallback'] }}
```

---

### CR-02: Logic inversion in `handleOverlayDelete` — authenticated users cannot remove items from their TO DO list via the overlay

**File:** `app/components/Etusivu.tsx:680–686`
**Issue:** `handleOverlayDelete` is called when the user taps the delete/check button on a `DiagonaalKortti` inside the Todo overlay. The intent is: if the user is logged in, ask "did you visit?" before removing; if not logged in, just remove. The current code inverts this: it calls `toggleTodo` (direct delete) for **unauthenticated** users and raises the "Kävikö paikassa?" confirmation for **authenticated** users. That is correct. However, the actual wrongness is subtler — the condition is `if (supabaseUser !== null)` to show the review prompt, but `supabaseUser` starts as `null` and is set asynchronously via `subscribeToAuthUser`. During the window before `isAuthReady` becomes true, an authenticated user will appear as `null` and their tap will trigger a direct `toggleTodo` delete without the review prompt, silently bypassing the review flow. More critically: because `supabaseUser` is derived from Supabase auth (not a boolean the component controls), a race at first load means the confirmation dialog is never shown, the item is deleted, and the review opportunity is lost permanently.

**Fix:** Gate the function on `isAuthReady` to prevent it from running before auth state is known:
```tsx
function handleOverlayDelete(id: number) {
  if (!isAuthReady) return          // wait for auth state to resolve
  if (supabaseUser !== null) {
    setPendingReviewPaikkaId(id)
  } else {
    toggleTodo(id)
  }
}
```

---

## Warnings

### WR-01: `PaikkaKortti` hover uses `y: -2` lift — violates CLAUDE.md "scale only, never combine with y-lift" rule

**File:** `app/components/PaikkaKortti.tsx:50`
**Issue:** CLAUDE.md animation principles explicitly state: "Use scale only — never combine with y-lift. Pick one physical metaphor." The `whileHover` on `PaikkaKortti`'s root `motion.div` uses `y: -2` without a scale, while all other interactive cards (`DiagonaalKortti`, filter pills) use `scale: 1.02`. This is inconsistent and violates the project guideline.

**Fix:**
```tsx
// Replace line 50
whileHover={{ scale: 1.02, transition: { duration: 0.18, ease: 'easeOut' } }}
```

---

### WR-02: Image `onError` fallback in `DiagonaalKortti` does not handle runtime `image_url` prop changes

**File:** `app/components/DiagonaalKortti.tsx:104–111`
**Issue:** The fallback `<div data-fallback>` is controlled by `hidden={!!paikka.image_url}`. If `paikka.image_url` is truthy the image renders and the fallback is hidden. When the image fails to load, `onError` imperatively sets `img.style.display = 'none'` and unhides the fallback via DOM mutation. This is fine for a static prop. However, if the component ever re-renders with a different `paikka.image_url` value (e.g. the prop changes), the `hidden` attribute is recalculated from the new prop, which will correctly re-show the fallback if the new URL is falsy — but if a previous `onError` mutation already hid the `img`, the new image will not re-appear because `img.style.display = 'none'` persists. The imperative DOM mutation and the declarative `hidden` binding are fighting each other.

**Fix:** Use React state instead of imperative DOM mutation:
```tsx
const [imgError, setImgError] = useState(false)

// In JSX:
{paikka.image_url && !imgError ? (
  <img
    src={paikka.image_url}
    alt={`Kuva: ${paikka.nimi}`}
    className="w-full h-full object-cover"
    loading="lazy"
    onError={() => setImgError(true)}
  />
) : null}
<div
  className="w-full h-full flex items-center justify-center"
  style={{ backgroundColor: laji.color }}
  aria-hidden
>
  <SportIcon laji={paikka.laji} size={32} className="text-white opacity-80" />
</div>
```
Reset `imgError` when `paikka.image_url` changes by adding a `useEffect` or `key` on the img.

---

### WR-03: `SportIcon` SVG elements lack `aria-hidden` — causes redundant accessibility noise in badge context

**File:** `lib/sportIcons.tsx:61–68`
**Issue:** Every `SportIcon` instance used inside badge rows (e.g. PaikkaKortti line 73, DiagonaalKortti line 61, Etusivu filter pill line 419) renders a decorative icon next to a visible text label. The SVG has no `aria-hidden="true"` and no `role="img"` with an `aria-label`. Screen readers will announce the SVG element (potentially as an empty unlabelled image or by attempting to read raw path data) in addition to the adjacent text label. All call sites use the icon as pure decoration.

**Fix:** Add `aria-hidden` to the SVG in `SportIcon`:
```tsx
<svg
  viewBox="0 0 24 24"
  width={size}
  height={size}
  className={className}
  aria-hidden="true"
  focusable="false"
  dangerouslySetInnerHTML={{ __html: SPORT_ICONS[laji] ?? SPORT_ICONS['fallback'] }}
/>
```

---

### WR-04: `'use client'` directive on `lib/sportIcons.tsx` unnecessarily forces client bundle inclusion

**File:** `lib/sportIcons.tsx:1`
**Issue:** `lib/sportIcons.tsx` is marked `'use client'` at the top. The `SPORT_ICONS` constant and the `SportIcon` component do not use any browser APIs, React hooks, event handlers, or other client-only features. Marking it `'use client'` means the entire module (including all SVG path strings) is always included in the client bundle even when consumed by server components. More importantly, it prevents the module from being tree-shaken on the server side. The `SportIcon` component uses `dangerouslySetInnerHTML` which is valid in both RSC and client components. The comment at line 14 says "File extension is .tsx because the SportIcon component uses JSX syntax" — JSX alone does not require `'use client'`.

**Fix:** Remove the `'use client'` directive from `lib/sportIcons.tsx`. Consumers that genuinely need client-side behaviour (`DiagonaalKortti`, `PaikkaKortti`, `Etusivu`) already declare their own `'use client'` directives.

---

## Info

### IN-01: Tennis icon renders three concentric circles — does not look like a tennis ball

**File:** `lib/sportIcons.tsx:25`
**Issue:** The `tennis` entry renders three concentric circles (r=10, r=6, r=2), which looks like a target/bullseye. A tennis ball icon should show the characteristic curved seam lines. This is the wrong Lucide icon — it appears to be `Target` rather than a tennis-specific icon. While there is no Lucide "tennis ball" icon, a better approximation exists (e.g. a circle with two curved lines inside, using `Circle` + arc paths). This is a visual accuracy issue, not a functional bug.

**Suggestion:** Source or hand-craft a path representing a tennis ball with seam lines, or at minimum replace with a different metaphor that is less misleading.

---

### IN-02: `EASE_OUT` constant is duplicated between `DiagonaalKortti.tsx` and `PaikkaKortti.tsx`

**File:** `app/components/DiagonaalKortti.tsx:13` and `app/components/PaikkaKortti.tsx:13`
**Issue:** Both files declare `const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]` identically. This is a minor duplication — a future change to the easing curve would require updating two files.

**Suggestion:** Extract to a shared `lib/animation.ts` or `lib/motionConstants.ts` file and import from both components.

---

### IN-03: `isSaved` prop on `DiagonaalKortti` is declared but has no visual effect

**File:** `app/components/DiagonaalKortti.tsx:27,33`
**Issue:** The `DiagonaalKorttiProps` interface declares `isSaved?: boolean` and the prop is accepted in the destructured parameters. It is passed as `isSaved={true}` from the Todo overlay in `Etusivu.tsx` (line 1209). However, `isSaved` is never read anywhere in the component body — it does not affect the rendered output (e.g. to show a filled vs. empty bookmark icon on the toggle button). The `Check` icon is always rendered regardless.

**Suggestion:** Either use `isSaved` to visually distinguish the saved state (e.g. filled vs. outline icon), or remove the prop from the interface and all call sites to eliminate the dead code.

---

_Reviewed: 2026-06-03T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
