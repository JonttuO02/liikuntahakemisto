---
phase: 34-onboarding-velhou
reviewed: 2026-06-10T12:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - app/components/PaikkaSheet.tsx
  - app/business/onboarding/StepEsikatselu.tsx
findings:
  critical: 1
  warning: 2
  info: 1
  total: 4
status: issues_found
---

# Phase 34-10: Code Review Report (Gap Closure — ONBOARD-07 PaikkaSheet Preview)

**Reviewed:** 2026-06-10T12:00:00Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Two files were reviewed as part of plan 34-10, which adds `preview` mode to `PaikkaSheet` and wires it into `StepEsikatselu`. The core preview gating (Supabase skip, position:relative, drag disable, pill/close hide) is structurally sound. However, four defects were found: one critical framer-motion `layoutId` conflict that will produce a visible animation regression in Etusivu whenever both trees are mounted simultaneously, one warning for a bookmark button that fires a real state mutation in preview context, one warning for a scroll container that becomes a no-op in preview mode (the inner `div` has `height:100%` but the outer `motion.div` is `height:auto`), and one info item for a dead import.

---

## Critical Issues

### CR-01: `layoutId="vc-{id}"` fires in preview context — corrupts the shared Etusivu layout animation

**File:** `app/components/PaikkaSheet.tsx:59`

**Issue:** `PaikkaSheet` unconditionally declares `layoutId={`vc-${paikka.id}`}` on the root `motion.div`. In Etusivu, this same `layoutId` is also declared on the callout card `motion.div` inside `<LayoutGroup>` (Etusivu.tsx:1111). Framer-motion resolves `layoutId` globally across the entire React tree unless scoped to an explicit `LayoutGroup`. When `StepEsikatselu` mounts the preview sheet — even in a completely separate route — framer-motion registers a second element with the same `layoutId` string. If a user has Etusivu open in one browser tab and the onboarding wizard open in another, the shared layout context does not apply. However, within a single-page session (the user navigates Etusivu → `/business/onboarding` without a full reload), framer-motion retains layout IDs in memory between route renders. The preview sheet's `motion.div` will attempt to animate from the last known position of the Etusivu callout card with the same venue ID — producing an unwanted cross-route fly-in animation. This is a regression against the Etusivu sheet open/close experience: when the user returns to the map, the callout card may animate from the wrong origin because the layout state was last set by the preview render.

The fix is to suppress `layoutId` in preview mode:

**Fix:**
```tsx
layoutId={preview ? undefined : `vc-${paikka.id}`}
```

---

## Warnings

### WR-01: Bookmark (todo) button fires `onToggleTodo` in preview — mutates real application state

**File:** `app/components/PaikkaSheet.tsx:94`

**Issue:** The bookmark button is not gated by `preview`. In `StepEsikatselu`, `onToggleTodo` is passed as `() => {}` (a no-op), so the mutation is silenced in the current caller. However, the prop is typed as `(id: number) => void` with no default value — any future caller that passes a real `onToggleTodo` into preview mode will trigger real favorites mutations when a business owner clicks the bookmark icon while reviewing their own listing preview. This is a latent correctness defect: the button is visible, interactive, and not labelled as disabled, so it creates a false affordance. In the current call site, the no-op prevents data mutation but still fires a state change in the parent if the parent ever replaces `() => {}` with the real handler.

The bookmark button should be hidden or disabled in preview mode, consistent with how the close button and drag pill are already hidden:

**Fix:**
```tsx
{!preview && (
  <motion.button
    whileTap={{ scale: 0.85, transition: { duration: 0.12 } }}
    onClick={() => onToggleTodo(paikka.id)}
    aria-label={todo ? tKortti('removeFromTodo') : tKortti('addToTodo')}
    className="glass-btn w-8 h-8 rounded-full flex items-center justify-center"
  >
    {todo
      ? <BookmarkCheck className={cn('w-4 h-4 fill-[#111111] text-[#111111]')} />
      : <Bookmark className={cn('w-4 h-4 text-[rgba(17,17,17,0.35)]')} />
    }
  </motion.button>
)}
```

---

### WR-02: Scrollable inner div is broken in preview mode — `height: '100%'` on a child of `height: 'auto'` parent

**File:** `app/components/PaikkaSheet.tsx:83`

**Issue:** In preview mode the outer `motion.div` has `height: 'auto'` (line 64). The inner scrollable `<div ref={scrollRef}>` has `style={{ height: '100%' }}` (line 83). A child element with `height: 100%` inside a parent with `height: auto` resolves to `height: 0` in CSS (the parent has no definite height to reference). The result is that the inner div collapses to zero height and its `overflow-y-auto` class has nothing to scroll — all content is fully visible because the overflow container is not constraining anything. The `maxHeight: '600px'` on the outer div clips visually, but the scroll mechanism is non-functional.

This is a silent visual defect: content that overflows 600px will be clipped by the outer `overflow: hidden` with no way for the user to scroll to it in the preview context.

**Fix:** Give the inner div an explicit `height` that matches the outer container in preview mode:

```tsx
<div
  ref={scrollRef}
  className="overflow-y-auto"
  style={preview ? { height: '100%', maxHeight: '600px' } : { height: '100%' }}
>
```

And update the outer `motion.div` preview style to use a definite height:

```tsx
style={preview ? {
  position: 'relative',
  height: '600px',   // definite height so children can inherit via %
  overflow: 'hidden',
  borderRadius: '1rem',
} : { ... }}
```

---

## Info

### IN-01: `onClose` optional default and `preview` prop make the `onClose={() => {}}` in `StepEsikatselu` redundant

**File:** `app/business/onboarding/StepEsikatselu.tsx:108`

**Issue:** `PaikkaSheet` now declares `onClose = () => {}` as a default parameter (PaikkaSheet.tsx:25), making `onClose` optional in the `Props` interface (line 20: `onClose?: () => void`). The explicit `onClose={() => {}}` passed at `StepEsikatselu.tsx:108` is therefore a no-op duplicate — it passes the same value as the default. This is not a bug, but it is dead code that will silently go stale if the default ever changes.

**Fix:** Remove `onClose={() => {}}` from the `StepEsikatselu` call site since the default already provides it:

```tsx
<PaikkaSheet paikka={draftAsPaikka} preview={true} todo={false} onToggleTodo={() => {}} />
```

---

_Reviewed: 2026-06-10T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
