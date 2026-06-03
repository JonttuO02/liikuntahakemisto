---
phase: 27-siivous-pienet-korjaukset
reviewed: 2026-06-03T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - app/components/NavBar.tsx
  - app/components/NavPill.tsx
  - app/components/PaikkaSheet.tsx
  - app/components/Etusivu.tsx
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: issues_found
---

# Phase 27: Code Review Report

**Reviewed:** 2026-06-03
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Phase 27 deleted the `/suosikit` route, removed stale nav links, stripped the
external browser link from `PaikkaSheet`, introduced `MapClusterZoom` for
cluster-click handling, and implemented the CalloutCard onClick zoom bypass
(SHEET-06). The changes are structurally sound; the review found no injection
or authentication vulnerabilities. However there are two critical bugs and four
warnings that need attention before shipping.

---

## Critical Issues

### CR-01: `MapClusterZoom` calls `onComplete` synchronously before `panTo` resolves — `clusterZoomTarget` cleared while animation is still in-flight

**File:** `app/components/Etusivu.tsx:142-153`

**Issue:** `MapClusterZoom` calls `setZoom`, then `panTo`, then immediately calls
`onCompleteRef.current()` — all in the same synchronous microtask. `onComplete`
executes `setClusterZoomTarget(null)`, which destroys the target value before the
Google Maps JS API has had a chance to complete the pan animation. The result is
a correct zoom level but a map centre that may remain at the old position, because
`panTo` is asynchronous internally.

This is structurally different from `MapAutoZoom` and `MapCityZoom`, which use
`requestAnimationFrame` + a `duration`-bounded loop and only call `onComplete`
when `t >= 1`. `MapClusterZoom` has no such guard.

In practice the visual glitch is subtle (the pan still fires), but if the
component re-renders between the `setZoom` and `panTo` calls (e.g. because the
zoom change triggers `onCameraChanged → setZoomLevel` → re-render), the `panTo`
call can be silently dropped.

**Fix:** Either mirror the animated approach used by `MapAutoZoom`:
```tsx
function MapClusterZoom({ target, onComplete }: ...) {
  const map = useMap()
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  useEffect(() => {
    if (!map || !target) return
    // panTo is asynchronous; defer onComplete until after the event loop tick
    // so the Maps SDK processes the pan before we clear the target.
    map.setZoom(target.zoom)
    map.panTo(target.center)
    const id = setTimeout(() => onCompleteRef.current(), 0)
    return () => clearTimeout(id)
  }, [map, target])
  return null
}
```
Or, if instant zoom-and-jump is the intended UX, document it explicitly and add
`map.moveCamera({ center: target.center, zoom: target.zoom })` as a single
atomic call (which is synchronous).

---

### CR-02: `handleOverlayDelete` inverts the "user is logged in" guard — unauthenticated users are routed to the prompt-to-delete code path instead of directly removing the item

**File:** `app/components/Etusivu.tsx:681-687`

**Issue:**
```ts
function handleOverlayDelete(id: number) {
  if (supabaseUser !== null) {
    setPendingReviewPaikkaId(id)   // shows "Kävikö paikassa?" confirmation
  } else {
    toggleTodo(id)                 // directly removes the item
  }
}
```
This function is wired to the `onToggleTodo` prop of `DiagonaalKortti` inside the
TO DO overlay. The intent (inferred from the review-prompting UX) is:
- **Logged-in user**: show the "Did you visit?" confirmation before removing.
- **Logged-out user**: the TO DO list is in-memory only, so just remove directly.

The logic is correct for that intent. However, `DiagonaalKortti` is also rendered
in the search results list (`!searchFocused && searchSuodatettu`) at line 1593
**without** an `onToggleTodo` prop, so `handleOverlayDelete` is never called
there — that is fine.

The bug is a semantic one: **`supabaseUser` can be stale at the moment
`handleOverlayDelete` fires.** The `supabaseUser` state is set by
`subscribeToAuthUser` inside a `useEffect`. If the auth state just changed (user
just signed out), `supabaseUser` in the closure can still be non-null for a brief
window, causing `setPendingReviewPaikkaId` to be called even though the user
is now unauthenticated. The subsequent `handleInlineReviewSubmit` guard at line
698 (`if (!supabaseUser || …) return`) will silently abort the submission — but
the user will still see the review form, fill it in, tap "Jätä arvostelu", and
receive no feedback while the operation is silently discarded.

**Fix:** Derive the check from the ref-stable auth state rather than closed-over
state, or at minimum re-check inside `handleInlineReviewSubmit` and surface an
error message when the user is no longer authenticated:
```ts
async function handleInlineReviewSubmit() {
  if (!supabaseUser || inlineRating === 0 || !reviewPaikkaId) {
    setInlineSubmitError('Kirjaudu sisään arvostellaksesi.')  // add this
    return
  }
  // ...
}
```

---

## Warnings

### WR-01: `NavPill` is still rendered on `/paikat/[id]` while `Etusivu` renders its own functionally-equivalent right-side toolbar — duplicated auth UI

**File:** `app/components/NavPill.tsx:1-109` / `app/paikat/[id]/page.tsx:45`

**Issue:** `NavPill` is imported and rendered on the venue profile page
(`/paikat/[id]/page.tsx:45`). `NavPill` shows "Profiili" and "Kirjaudu ulos" /
"Kirjaudu" inside an expanding pill. `Etusivu.tsx` independently implements its
own version of the same expanding pill (the right-side toolbar, lines 1275–1356).
The two implementations diverge: `NavPill` calls `router.refresh()` after
sign-out; the `Etusivu` toolbar does not. If the Phase 27 goal was to retire
`NavPill` in favour of the Etusivu toolbar, it was only done for the map view —
`/paikat/[id]` still renders `NavPill`.

This is not a crash, but the duplication means auth-handling bugs must be fixed
in two places. Additionally `NavPill` still contains a `/profiili` link (line 65)
which is fine for now, but if `/profiili` is ever removed, this link will silently
404.

**Fix:** If `NavPill` is intended to survive for static pages (`/tietosuoja`,
`/paikat/[id]`), add a comment to that effect in the component and to CLAUDE.md.
If it is intended to be superseded, replace its usage in `/paikat/[id]/page.tsx`
with the equivalent toolbar or a slimmed-down component.

---

### WR-02: `NavBar` is rendered on no page — it is imported only by `NavBarServer` which itself is imported nowhere in the active codebase

**File:** `app/components/NavBar.tsx:1-127`

**Issue:** Searching the `app/` tree for `NavBarServer` yields zero page
imports — it is only defined in `NavBarServer.tsx`. `NavBar.tsx` exports a
component that is likewise unreachable from any rendered route. Both files
contain live logic (auth subscription, sign-out), take up bundle weight, and will
silently diverge from `NavPill` as the codebase evolves. CLAUDE.md already marks
`BottomNav.tsx` as a dead file; `NavBar.tsx` and `NavBarServer.tsx` are in the
same state.

**Fix:** Either import `NavBarServer` on a page that needs it, or explicitly
tombstone the files (matching the `BottomNav` pattern in CLAUDE.md) so future
reviewers know not to touch them.

---

### WR-03: `PaikkaSheet` review fetch ignores errors — silent data loss on network failure

**File:** `app/components/PaikkaSheet.tsx:33-40`

**Issue:**
```ts
sb.from('reviews')
  .select(...)
  .eq('paikka_id', paikka.id)
  .order(...)
  .then(({ data }) => setReviews(data ?? []))
```
The `error` field is destructured away. If the query fails (RLS rejection, network
error, quota), `data` will be `null` and `setReviews([])` fires — the sheet
silently displays "Ei arvosteluja" instead of a network-error state. The user
cannot tell whether there are truly no reviews or whether the fetch failed.

This is a regression risk: if Supabase anon-key RLS is tightened in a future
phase, reviews will silently disappear without any error surfacing.

**Fix:**
```ts
.then(({ data, error }) => {
  if (error) console.error('[PaikkaSheet] reviews fetch error:', error)
  setReviews(data ?? [])
})
```
At minimum log the error so it shows up in monitoring. Optionally surface a small
error message to the user.

---

### WR-04: `CalloutCard` onClick branch at line 1052 checks `zoomRef.current >= 16` but the card is only rendered when `zoomLevel >= 16 && nearestCardId === p.id` — the `else` branch (zoom-in path) is dead code

**File:** `app/components/Etusivu.tsx:1047-1063`

**Issue:**
```tsx
{zoomLevel >= 16 && nearestCardId === p.id && valittu?.id !== p.id && (
  <motion.div
    onClick={e => {
      e.stopPropagation()
      setSearchOpen(false)
      if (zoomRef.current >= 16) {           // always true here
        setValittu(p)
      } else {
        pendingValittuRef.current = p        // unreachable
        setAutoZoomTarget(...)
      }
    }}>
```
The outer render condition already guarantees `zoomLevel >= 16`. `zoomRef.current`
is kept in sync with `zoomLevel` via `onCameraChanged`. The `else` branch —
intended for the case where the user somehow clicks the card while zoomed out —
can never execute. This is not a crash, but it is dead code that creates a
false impression that the card can appear below zoom 16, and it leaves the
`pendingValittuRef` logic as a maintenance landmine.

**Fix:** Remove the conditional and keep only `setValittu(p)`:
```tsx
onClick={e => {
  e.stopPropagation()
  setSearchOpen(false)
  setValittu(p)
}}
```

---

## Info

### IN-01: Stale `console.error` calls in `toggleTodo` diverge from the project's no-`console.log` convention

**File:** `app/components/Etusivu.tsx:665, 672`

**Issue:** `console.error('[toggleTodo] delete error:', error)` and the matching
insert error line are the only `console.*` calls remaining in the reviewed files.
They are useful for debugging but should be noted; they are not removed by the
phase and will appear in production browser consoles.

**Fix:** Replace with a silent rollback or wire to a proper error boundary /
toast notification system when one is added. For now, at minimum, scope them
behind `process.env.NODE_ENV !== 'production'` if prod console noise is a
concern.

---

### IN-02: `BottomNav.tsx` still references the deleted `/suosikit` route (line 40)

**File:** `app/components/BottomNav.tsx:40`

**Issue:** `BottomNav` is documented as a dead file in CLAUDE.md ("not imported
anywhere") so the stale link cannot cause a live 404. However the href
`/suosikit` was the route deleted in Phase 27. If `BottomNav` is ever revived,
it will immediately produce broken navigation. This was presumably missed because
the file was not in scope for this phase.

**Fix:** Either delete `BottomNav.tsx` entirely (it is dead code by CLAUDE.md
definition) or update the href to `/?nakyma=lista` or remove the Suosikit tab.

---

_Reviewed: 2026-06-03_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
