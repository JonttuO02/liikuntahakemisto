---
phase: 17-toolbar-haku-ux
reviewed: 2026-05-29T00:00:00Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - app/components/Etusivu.tsx
findings:
  critical: 2
  warning: 6
  info: 3
  total: 11
status: issues_found
---

# Phase 17: Code Review Report

**Reviewed:** 2026-05-29
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found (updated 2026-05-29 — WR-06 lisätty käyttäjäpalautteen perusteella)

## Summary

`Etusivu.tsx` is a large (962-line) client component that owns the map, bottom sheet, search overlay, and auth flow for the homepage. The new phase-17 additions introduce a top-left toolbar (search + list-toggle buttons) and a floating search overlay with filter pills.

The core logic is mostly correct, but two critical bugs were found: a memory-leak / stale-state race condition in the sign-out flow, and a debounce timer that is never cleaned up on unmount. Five warnings cover logic gaps in the search toggle, a missing `useEffect` dependency that can produce stale closures, confusing/inverted UX states, and a layout physics violation flagged by CLAUDE.md. Three info items round out unused imports and dead state.

---

## Critical Issues

### CR-01: Debounce timer leaks — `debounceRef` never cleared on unmount

**File:** `app/components/Etusivu.tsx:377-384`

**Issue:** `debounceRef.current` is set inside the `onCameraChanged` callback every time the map camera moves, but there is no cleanup returned from any `useEffect`. If the component unmounts while a 3-second timeout is still pending (e.g., user navigates away), the callback fires on the unmounted component and calls `setWeatherKaupunki`, producing a "Can't perform a React state update on an unmounted component" error in dev and a silent stale closure leak in production. There is also no cleanup in the `useEffect` that sets the interval for `isDark` (lines 213-216) — but that one does return `clearInterval`, so it is fine. The debounce never returns a cleanup.

**Fix:**
```tsx
// Add a useEffect cleanup:
useEffect(() => {
  return () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }
}, [])
```

---

### CR-02: Sign-out race — optimistic local state cleared before Supabase promise resolves

**File:** `app/components/Etusivu.tsx:528-534`

**Issue:** The sign-out button calls `.then(() => { setSupabaseUser(null); setSuosikitIds(new Set()); router.refresh() })` inline after the `signOut()` promise. However, `createBrowserSupabase()` already has a long-lived `onAuthStateChange` listener (see `supabaseSSR.ts` lines 30-38) that will also fire `_notifyListeners(null)` when the `SIGNED_OUT` event arrives, which in turn triggers the `subscribeToAuthUser` callback registered in the `useEffect` at line 219-233. That callback calls `setSuosikitIds(new Set())` and `setKotikaupunki('')` again. So the state is reset twice, which is harmless by itself.

The real bug: the `.then()` also calls `closeOverlays()` (line 534) **before** the promise resolves. The current code structure is:

```tsx
createBrowserSupabase().auth.signOut().then(() => {
  setSupabaseUser(null)
  setSuosikitIds(new Set())
  router.refresh()
})
closeOverlays()   // ← line 534, runs SYNCHRONOUSLY before signOut resolves
```

`closeOverlays()` is outside the `.then()` chain. This means the overlay closes immediately (visually correct), but `setSupabaseUser(null)` happens asynchronously. If the user taps a favorites icon in the narrow window between overlay close and signOut resolution, `supabaseUser` is still non-null and `toggleSuosikki` will attempt a Supabase write with a session that is being torn down, potentially producing a 401 or a duplicate-entry error.

**Fix:** Either move `closeOverlays()` inside the `.then()` body, or set `supabaseUser(null)` optimistically before the call:

```tsx
onClick={() => {
  setSupabaseUser(null)        // optimistic — auth listener will also fire
  setSuosikitIds(new Set())
  closeOverlays()
  createBrowserSupabase().auth.signOut().then(() => router.refresh())
}}
```

---

## Warnings

### WR-01: `toggleSearch` has inverted logic — clicking the list button when search is open closes instead of switching to list mode

**File:** `app/components/Etusivu.tsx:161-169`

**Issue:** Both toolbar buttons (Search icon and LayoutList icon) call `toggleSearch`, with `focused=true` for the search button and `focused=false` for the list button. The first line of `toggleSearch` is:

```tsx
if (searchOpen) { setSearchOpen(false); return }
```

This means if search is already open, clicking the list button simply closes the search overlay rather than switching to a "browse without focus" state. The `searchFocused` state is never updated in that branch. The intent (based on the button's `aria-label="Näytä lista"`) appears to be toggling between a focused-input mode and a filtered-list-browse mode, but when the panel is already open the distinction is lost. A user who opened search via the Search icon and then clicks the List icon expects to switch — instead the overlay vanishes entirely.

**Fix:** Separate the two code paths:

```tsx
function openSearch(focused: boolean) {
  closeOverlays()
  setValittu(null)
  setSearchHaku('')
  setSearchFocused(focused)
  if (sheetPhase === 'open') setSheetPhase('sliding')
  setSearchOpen(true)
}

// Search button
onClick={() => searchOpen ? setSearchFocused(true) : openSearch(true)}
// List button  
onClick={() => searchOpen ? setSearchFocused(false) : openSearch(false)}
```

---

### WR-02: `MapAutoZoom` missing `onComplete` in `useEffect` dependency array — ESLint suppression hides stale closure risk

**File:** `app/components/Etusivu.tsx:79-88`

**Issue:**

```tsx
function MapAutoZoom({ target, onComplete }: { ... }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !target) return
    map.panTo(target)
    map.setZoom(16)
    onComplete()
  }, [map, target])   // ← onComplete missing
```

`onComplete` (the `() => setAutoZoomTarget(null)` callback) is omitted from the dependency array. There is no ESLint suppression comment here, meaning exhaustive-deps would warn. If `onComplete` ever changes identity between renders (it does — it is an arrow function defined inline at the call-site, line 429), the effect captures a stale closure. In the current call-site `onComplete` is a stable inline arrow, so it is unlikely to cause a real bug today, but it is structurally fragile — any refactor that memoizes or lifts the callback could break zoom-target clearing.

**Fix:**
```tsx
useEffect(() => {
  if (!map || !target) return
  map.panTo(target)
  map.setZoom(16)
  onComplete()
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [map, target, onComplete])
```
Or wrap the call-site callback in `useCallback`.

---

### WR-03: Search overlay `zIndex: 61` is below the main sheet (`zIndex: 60`) only by 1 — no breathing room; selected-venue sheet at `zIndex: 70` can obscure search results but search close button is inaccessible

**File:** `app/components/Etusivu.tsx:716-718` and `app/components/Etusivu.tsx:829`

**Issue:** When a venue (`valittu`) is selected from the search results, the venue detail sheet renders at `zIndex: 70`. The search overlay sits at `zIndex: 61`. The `AnimatePresence` for `valittu` does not close the search overlay (`setSearchOpen(false)` is not called when `setValittu` is called). This means the search results are alive but hidden under the venue sheet. When the user dismisses the venue sheet (swipe down or X), the search results reappear — this may be intentional — but there is no affordance for it. More critically, the `anyOverlayOpen` backdrop at `zIndex: 63` (line 443) covers the search results at `zIndex: 61`, so if `rightOpen` is true while search is open, the backdrop swallows taps intended for the search input.

**Fix:** Either close search when a venue is selected, or raise the search overlay's z-index above the backdrop:

```tsx
// Option A: close search on venue select
onClick={e => { e.stopPropagation(); setValittu(p); setSearchOpen(false) }}

// Option B: raise search results above backdrop
style={{ ... zIndex: 65 }}
```

---

### WR-04: `suosikitSizeAndIds` used as AI cache key suffix but only encodes count when size > 0 — cache key collides across different favourite sets of the same size

**File:** `app/components/Etusivu.tsx:249-252` and `254-257`

**Issue:**

```tsx
const suosikitSizeAndIds = useMemo(
  () => Array.from(suosikitIds).sort((a, b) => a - b).join(','),
  [suosikitIds]
)
```

The `useMemo` correctly serialises the full sorted ID list. However the cache key uses:

```tsx
const key = 'saasuositus-' + new Date().toISOString().slice(0, 10)
  + '-' + weatherKaupunki
  + (suosikitIds.size > 0 ? '-' + suosikitIds.size : '')
```

The key suffix is only `suosikitIds.size` (the count), not the sorted IDs themselves. Two different favourite sets of equal size (e.g., IDs `[1,2]` vs. `[3,4]`) produce the same cache key and the second fetch returns the cached text that was personalised for the first set. The personalised AI recommendation is therefore wrong for the second user profile encountered in the same browser session.

**Fix:** Use `suosikitSizeAndIds` in the cache key:

```tsx
const key = 'saasuositus-' + new Date().toISOString().slice(0, 10)
  + '-' + weatherKaupunki
  + (suosikitIds.size > 0 ? '-' + suosikitSizeAndIds : '')
```

---

### WR-05: `layout` animation on the right toolbar — violates CLAUDE.md animation rules

**File:** `app/components/Etusivu.tsx:493-497`

**Issue:** The right toolbar wrapper uses:

```tsx
<motion.div
  layout
  transition={{ layout: { type: 'spring', damping: 30, stiffness: 350 } }}
  className="glass rounded-full flex items-center overflow-hidden"
```

CLAUDE.md animation rules state: "No `layout` animations unless absolutely required — they cause reflow jank." The `layout` prop here triggers a layout measurement on every open/close of the right panel, which forces a reflow of the surrounding fixed-position toolbar. On low-end devices this produces a visible jank frame as the pill resizes. The same effect can be achieved without `layout` by animating `width` or using `AnimatePresence` with a fixed-width inner container.

**Fix:** Replace `layout` with an explicit `max-width` transition or remove it and use `overflow: hidden` with an `AnimatePresence` fade, which is already present for the inner content.

---

### WR-06: Hakupainike avaa myös listan — `searchFocused` ei ohjaa overlayn sisältöä

**File:** `app/components/Etusivu.tsx` (hakuoverlay JSX + `searchFocused`-tila)

**Issue:** Search-painike kutsuu `toggleSearch(true)` ja LayoutList-painike kutsuu `toggleSearch(false)`. Molemmissa tapauksissa sama `searchOpen`-tila asettuu trueksi ja overlay renderöidään identtisenä sisältönä — sekä hakupalkki + filtterit **että** paikkakortit näkyvät kummassakin moodissa. `searchFocused`-tila (true/false) ohjaa ainoastaan `autoFocus`-attribuuttia haun `<input>`-elementissä, ei ollenkaan sitä mitä overlayssa näytetään.

Vaatimus SC-1 edellyttää: hakupainike avaa hakukentän ja filtterit. SC-3 edellyttää: lista-painike ei laukaise hakua tai filttereitä. Nykyinen toteutus rikkoo kummankin: käyttäjä joka haluaa hakea voi nähdä listanäkymän samanaikaisesti, eikä painikkeilla ole visuaalisesti erottuvaa toimintaa.

**Fix:** Käytä `searchFocused`-tilaa conditionally renderöimään overlayn sisältö kahdessa moodissa:

```tsx
{/* Search-moodi: hakupalkki + filtterit, EI listakortteja */}
{searchOpen && searchFocused && (
  <>
    <input autoFocus ... />
    <FilterPills ... />
  </>
)}

{/* Lista-moodi: kortit + filtterit, hakupalkki ilman autoFocusta */}
{searchOpen && !searchFocused && (
  <>
    <input autoFocus={false} ... />
    <FilterPills ... />
    <CardList ... />
  </>
)}
```

Tai yhdistettynä yhdellä ehdolla:

```tsx
{/* Kortit näytetään vain lista-moodissa */}
{searchOpen && !searchFocused && <CardList ... />}
```

Hakupalkki ja filtterit näytetään aina kun `searchOpen`, mutta paikkakortit vain kun `!searchFocused`. Tällöin Search-painike → pelkkä haku+filtteri; LayoutList-painike → lista + mahdollisuus hakea.

---

## Info

### IN-01: Unused import — `Moon` and `Sun` are imported from `lucide-react` twice (split across two import lines)

**File:** `app/components/Etusivu.tsx:7` and `app/components/Etusivu.tsx:10`

**Issue:** Line 7 imports `Moon, Sun` from `lucide-react`. Line 10 imports `Dumbbell, Waves, Leaf, Building2, Zap, Target, Activity` from the same package. Two separate imports from the same module are a minor code-quality issue and can confuse tree-shaking analysis. They should be merged into one import statement.

**Fix:**
```tsx
import {
  X, MapPin, Moon, Sun, Locate, Search, Heart, MoreHorizontal,
  LogOut, User, LayoutList, Dumbbell, Waves, Leaf, Building2,
  Zap, Target, Activity,
} from 'lucide-react'
```

---

### IN-02: `searchFocused` state is set but has no effect once search is open — it only controls `autoFocus` on mount

**File:** `app/components/Etusivu.tsx:121` and `695`

**Issue:** `searchFocused` controls the `autoFocus` prop of the search `<input>`. `autoFocus` on a React input is only applied on the element's first mount. Once the search overlay is open, changing `searchFocused` (e.g., by clicking the list-toggle button) does not re-focus or un-focus the input — the `autoFocus` prop has no effect after initial render. The state exists to distinguish "opened for text search" from "opened for filter browsing", but in practice only the initial `autoFocus` is driven by it; the rest of the "mode" distinction is never used in any conditional render.

**Fix:** Either remove `searchFocused` and use a `inputRef.focus()` call directly, or use it consistently to conditionally render a visually distinct state.

---

### IN-03: Magic number `104` and `64` for search bar positioning are not documented

**File:** `app/components/Etusivu.tsx:683-686`

**Issue:** The search input bar is positioned with `left: 104` and `right: 64`. These values correspond to the left toolbar width (40px button + 40px button + divider, contained in 104px) and the right toolbar width (40px + padding = ~64px), but this is not documented. If either toolbar width changes, these magic numbers silently break the layout.

**Fix:** Define named constants at the top of the file:

```tsx
const TOOLBAR_LEFT_W  = 104  // left pill: search + divider + list buttons
const TOOLBAR_RIGHT_W = 64   // right pill: MoreHorizontal button + padding
```

And reference them in the style object.

---

_Reviewed: 2026-05-29_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
