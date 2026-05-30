---
phase: 20-navigaatio-korjaukset
reviewed: 2026-05-30T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - app/components/NavPill.tsx
  - app/suosikit/SuosikitClient.tsx
  - app/components/Etusivu.tsx
  - app/components/DiagonaalKortti.tsx
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
status: fixed
fixed_at: 2026-05-30T14:30:00Z
---

# Phase 20: Code Review Report

**Reviewed:** 2026-05-30T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Four files reviewed: `NavPill.tsx` (auth-aware pill menu), `SuosikitClient.tsx` (favourites page), `Etusivu.tsx` (main map/search view), and `DiagonaalKortti.tsx` (search result card). The implementation is functional at a surface level, but several correctness and security defects were found.

The most serious issues are: (1) sign-out in `NavPill` is fire-and-forget — errors are silently swallowed and the router is never refreshed, unlike the identical action in `Etusivu` which calls `router.refresh()`; (2) `SuosikitClient` subscribes to auth and calls `loadFavorites` inside the effect, but if `loadFavorites` resolves **after** the component unmounts (or after the user logs out while the request is in flight) it will call `setPaikat` on a stale/unmounted component and can re-show stale data; (3) the `sessionStorage.getItem('etusivu-scroll-state')` restore in `Etusivu` calls `JSON.parse` on unvalidated external input inside a try/catch that swallows the error silently — if an attacker or buggy code injects a crafted string with prototype-polluting properties the code accepts it without sanitisation.

Additional warnings include: a `layout` animation used on the bottom sheet in `Etusivu` (contradicted by CLAUDE.md rule "No `layout` animations unless absolutely required"), a `setTimeout` race in the right-toolbar open logic, missing `aria-label` on the "Auki nyt" filter button, and an open-status `'unknown'`/`'no-data'` branch that `DiagonaalKortti` handles inconsistently with `PaikkaSheet`.

---

## Critical Issues

### CR-01: NavPill sign-out ignores errors and skips router refresh

**File:** `app/components/NavPill.tsx:19-23`
**Issue:** `handleSignOut` sets local state optimistically, then calls `createBrowserSupabase().auth.signOut()` with no `await`, no `.catch()`, and no `router.refresh()`. If `signOut` fails (network error, already-expired session) the UI shows "logged out" but the Supabase session cookie is still live. A subsequent navigation or server action that reads the session will see the user as authenticated. `Etusivu` (line 768–771) performs the same action correctly: it awaits the promise and calls `router.refresh()`.

**Fix:**
```tsx
// NavPill.tsx — import useRouter and await signOut
import { useRouter } from 'next/navigation'

// inside component:
const router = useRouter()

async function handleSignOut() {
  setUser(null)
  setOpen(false)
  try {
    await createBrowserSupabase().auth.signOut()
  } finally {
    router.refresh()
  }
}
```

---

### CR-02: SuosikitClient — stale setState after unmount / concurrent auth events

**File:** `app/suosikit/SuosikitClient.tsx:22-46`
**Issue:** `loadFavorites` is an inner async function that calls `setPaikat` and `setFavLoading`. It is invoked inside the `subscribeToAuthUser` callback but is not cancelled when the component unmounts or when a second auth event fires before the first Supabase query resolves. Two concrete failure modes:

1. User opens the page while loading → navigates away before the query resolves → `setPaikat` fires on the unmounted component (React will warn in dev; in prod it's a state update on a garbage-collected fiber).
2. The auth subscription fires twice in quick succession (e.g. token refresh immediately after mount) → two overlapping `loadFavorites` calls → the second `setFavLoading(false)` may arrive before the first, leaving `favLoading` permanently false while the first call's `setPaikat` sets stale data.

**Fix:** Use an AbortController or a cancellation flag:
```tsx
useEffect(() => {
  let cancelled = false
  const supabase = createBrowserSupabase()

  async function loadFavorites(userId: string) {
    if (cancelled) return
    setFavLoading(true)
    const { data, error } = await supabase
      .from('suosikit')
      .select('paikka_id, liikuntapaikat(*)')
      .eq('user_id', userId)
    if (cancelled) return   // guard after await
    if (!error && data) {
      const rows = data as unknown as SuosikkiRow[]
      const places = rows
        .map(row => row.liikuntapaikat)
        .filter((p): p is Liikuntapaikka => p !== null)
      setPaikat(places)
    }
    setFavLoading(false)
  }

  const unsub = subscribeToAuthUser((user) => {
    if (user) {
      setAuthState('authenticated')
      loadFavorites(user.id)
    } else {
      setAuthState('unauthenticated')
      setPaikat([])
    }
  })

  return () => { cancelled = true; unsub() }
}, [])
```

---

### CR-03: Etusivu — unvalidated JSON from sessionStorage parsed without schema check

**File:** `app/components/Etusivu.tsx:289-308`
**Issue:** On mount the component reads `etusivu-scroll-state` from `sessionStorage` and calls `JSON.parse` on the raw string. The parsed object `s` is then immediately destructured and spread into React state setters with no validation of shape or types. Although `sessionStorage` is same-origin, an XSS payload from any other component on the domain (including third-party scripts, injected ads, or a future vulnerability) could write a crafted key and have the parsed value call state setters with unexpected types — e.g. setting `searchHaku` to an object would cause a crash on `.toLowerCase()` inside `searchSuodatettu`. In addition, the `catch {}` block silently swallows any parse error or downstream crash, making debugging impossible.

The key collision risk is real: `handleCardClick` writes the same key at line 244 inside a `try {}` with empty catch — any other code on the same origin sharing the key name `etusivu-scroll-state` would corrupt state silently.

**Fix:** Validate the parsed value before use and log errors:
```tsx
try {
  const raw = sessionStorage.getItem('etusivu-scroll-state')
  if (!raw) return
  sessionStorage.removeItem('etusivu-scroll-state')
  const s = JSON.parse(raw)
  if (typeof s !== 'object' || s === null) return
  if (typeof s.searchHaku === 'string') setSearchHaku(s.searchHaku)
  if (typeof s.searchLaji === 'string') setSearchLaji(s.searchLaji)
  if (typeof s.searchKertakaynti === 'boolean') setSearchKertakaynti(s.searchKertakaynti)
  if (typeof s.searchAukinyt === 'boolean') setSearchAukinyt(s.searchAukinyt)
  if (typeof s.searchKaupunki === 'string') setSearchKaupunki(s.searchKaupunki)
  if (s.searchOpen === true) setSearchOpen(true)
  if (typeof s.scrollTop === 'number' && s.scrollTop > 0) {
    requestAnimationFrame(() => {
      if (searchResultsRef.current) {
        searchResultsRef.current.scrollTop = s.scrollTop
      }
    })
  }
} catch (err) {
  console.warn('[Etusivu] Failed to restore scroll state', err)
}
```

---

## Warnings

### WR-01: Etusivu uses `motion.div` with animated `left`/`right` on the bottom sheet (forbidden layout animation pattern)

**File:** `app/components/Etusivu.tsx:811-825`
**Issue:** The bottom sheet `<motion.div>` animates `left`, `right`, `y`, and `borderRadius` simultaneously using the top-level `animate` prop with `layout`-style positional properties (lines 816–817). `left` and `right` are CSS layout properties; animating them triggers reflow on every frame. CLAUDE.md explicitly states: "No `layout` animations unless absolutely required — they cause reflow jank." The `layout` prop is not set, but animating `left`/`right` causes the same reflow. The pill-to-sheet transition is the UX centrepiece of this phase and will produce visible jank on low-end devices.

**Fix:** Replace `left`/`right` animation with `scaleX` + `translateX` or use `width` + a centred anchor so only the compositor is engaged. Alternatively, accept the reflow for the sheet phase transition only and add a comment documenting why.

---

### WR-02: setTimeout race condition when opening right toolbar after search close

**File:** `app/components/Etusivu.tsx:795-800`
**Issue:** When the user taps the right toolbar button while search is open, the code calls `setSearchOpen(false)` and then `setTimeout(() => setRightOpen(true), 180)`. If the user taps the button again within 180 ms (e.g., accidental double-tap, fast interaction) `setRightOpen(true)` will fire from the stale closure, opening the menu even after the second tap was intended to close it. The timer is also never cleared: if the component unmounts during the 180 ms window (navigation) the callback fires on the unmounted component.

**Fix:**
```tsx
const rightOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

// In the onClick handler:
if (searchOpen) {
  setSearchOpen(false)
  if (rightOpenTimerRef.current) clearTimeout(rightOpenTimerRef.current)
  rightOpenTimerRef.current = setTimeout(() => setRightOpen(true), 180)
} else {
  setRightOpen(r => !r)
}

// In cleanup effect:
useEffect(() => {
  return () => {
    if (rightOpenTimerRef.current) clearTimeout(rightOpenTimerRef.current)
  }
}, [])
```

---

### WR-03: DiagonaalKortti — `<Link>` wraps the entire card but a `<button>` sits inside it

**File:** `app/components/DiagonaalKortti.tsx:58-141`
**Issue:** The interactive structure is:
```
<motion.div>
  <div class="absolute inset-0 rounded-2xl overflow-hidden">
    <Link href="/paikat/..." class="absolute inset-0 block">  ← fills card
      ... content ...
    </Link>
    <button>...</button>   ← MapPin button at z-20, inside the <Link>'s ancestor div
  </div>
</motion.div>
```
The `<button>` (MapPin "Näytä kartalla") is a sibling of `<Link>` inside the containing `<div>`, not a descendant of `<Link>`. This is correct for HTML validity (no interactive descendant inside `<a>`). However, the `<Link>` uses `class="absolute inset-0 block"` which fills the card entirely, placing the clickable area over the `<button>`. The button uses `e.stopPropagation()` and `e.preventDefault()` to intercept the event, but because the `<Link>` is positioned **above** the button in DOM paint order (`z-20` on button vs no explicit z on Link, which is inside the `overflow-hidden` parent), the button at `z-20` can be occluded by the full-cover Link on some pointer interactions. This is a latent touch-area bug — on mobile the button may be unreachable.

**Fix:** Give the full-cover `<Link>` an explicit `z-10` and verify the button's `z-20` renders correctly above it in the stacking context. Add a test to confirm the `MapPin` button is tappable when `image_url` is set.

---

### WR-04: NavPill — "Profiili" and "Suosikit" links are always visible regardless of auth state

**File:** `app/components/NavPill.tsx:57-64`
**Issue:** The expanded pill always shows "Profiili" and "Suosikit" links, even when `user` is null (unauthenticated). Tapping "Suosikit" as a logged-out user lands on `SuosikitClient` which shows a login prompt — this is handled, but "Profiili" (`/profiili`) has no equivalent guest guard and its behaviour for unauthenticated users is not visible in the reviewed files. If `/profiili` does not handle the unauthenticated case it will expose an unprotected page. Etusivu's equivalent right-toolbar (lines 748–763) shows both links unconditionally as well, confirming this is a cross-cutting pattern rather than a one-off.

**Fix:** Either hide "Profiili"/"Suosikit" for unauthenticated users (replace with a single "Kirjaudu" call-to-action) or verify that `/profiili` has an auth guard. If the auth guard exists, add a code comment linking to it.

---

### WR-05: Etusivu — `focusId` effect eslint-disable suppresses a legitimate stale-closure bug

**File:** `app/components/Etusivu.tsx:396-403`
**Issue:**
```tsx
useEffect(() => {
  if (!focusId) return
  const id = Number(focusId)
  const target = paikat.find(p => p.id === id)
  ...
}, [focusId, paikat]) // eslint-disable-line react-hooks/exhaustive-deps
```
`paikat` is listed in the dep array but the `eslint-disable` comment is placed on the same line, which suppresses all exhaustive-deps warnings for this hook — including any future additions. More importantly, `setAutoZoomTarget` and `setSheetPhase` are used inside the effect without being in the dependency array. Because both are stable `useState` setters this is safe in practice, but the disable comment hides this analysis from the linter for all future edits to this hook. The same pattern appears at line 308.

**Fix:** Remove the trailing `eslint-disable-line` comment and instead list only the truly intentional omissions via an inline `// eslint-disable-next-line react-hooks/exhaustive-deps` on the line before the dep array with an explanatory comment, or restructure to use `useCallback`/`useRef` to make the deps explicit.

---

## Info

### IN-01: Duplicate `useEffect` for `isDark` initialisation

**File:** `app/components/Etusivu.tsx:317-322`
**Issue:** Two separate `useEffect` hooks are used — one to initialise `isDark` on mount (line 317) and one to set up a 60-second interval (lines 319–322). These can be merged into a single effect, which avoids a redundant `isNightHour()` call on mount (the interval tick at minute 0 would be skipped otherwise).

**Fix:**
```tsx
useEffect(() => {
  setIsDark(isNightHour())
  const id = setInterval(() => setIsDark(isNightHour()), 60_000)
  return () => clearInterval(id)
}, [])
```

---

### IN-02: DiagonaalKortti — `openStatus.status === 'unknown'` not rendered

**File:** `app/components/DiagonaalKortti.tsx:77-84`
**Issue:** The component renders a "Suljettu" label only for `status === 'closed'` and "Auki" for `status === 'open'`. A third value (`'no-data'`, as returned by `getOpenStatus` when `aukioloajat` is null/empty) produces no output — this is intentional. However `PaikkaSheet` (line 120) only shows the open status row when `status !== 'no-data'`, while `DiagonaalKortti` silently skips it too. If `getOpenStatus` ever returns additional statuses (e.g. `'unknown'`) both components would silently swallow them. A fallback case or type assertion would make the exhaustiveness explicit.

**Fix:** Add a TypeScript union type to `getOpenStatus`'s return or add an `else` branch in `DiagonaalKortti` that renders nothing explicitly (to communicate intent to future readers).

---

### IN-03: `handleCardClick` empty catch swallows sessionStorage errors silently

**File:** `app/components/Etusivu.tsx:231-245`
**Issue:** The `try {}` block around `sessionStorage.setItem` uses an empty `catch {}`. While sessionStorage can legitimately fail (private browsing quota, full storage), swallowing the error silently means the scroll-restore feature fails without any indication. Matches the pattern flagged in CR-03 but at lower severity because this is write-only.

**Fix:**
```tsx
try {
  sessionStorage.setItem('etusivu-scroll-state', JSON.stringify(state))
} catch {
  // sessionStorage unavailable (private browsing or quota exceeded) — restore will be skipped
}
```
Add the comment so future readers know the empty catch is intentional.

---

_Reviewed: 2026-05-30T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
