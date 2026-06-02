---
phase: 26-filtterit
reviewed: 2026-06-02T00:00:00Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - app/components/Etusivu.tsx
findings:
  critical: 1
  warning: 6
  info: 2
  total: 9
status: issues_found
---

# Phase 26: Code Review Report

**Reviewed:** 2026-06-02
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found

## Summary

Reviewed `app/components/Etusivu.tsx` post-Phase-26 refactor. The refactor introduced `FilterCarouselPill`, changed `searchLaji` from `string` to `string[]`, and migrated sessionStorage to `_v:2` versioning.

One critical correctness bug was found: the sport filter never matches any venue because `searchLaji` stores title-case strings from `LAJIT_FILTTERI` (e.g. `"Padel"`) while the filter comparison lowercases the DB value before checking inclusion. The remaining findings are logic errors, a dead variable, and a misleading naming issue.

---

## Critical Issues

### CR-01: Sport filter always returns zero matches — case mismatch between `searchLaji` values and filter comparison

**File:** `app/components/Etusivu.tsx:699,762`

**Issue:** `LAJIT_FILTTERI` contains title-case values: `['Kaikki', 'Padel', 'Tennis', 'Jooga', ...]`. When a user selects a sport, `onToggle` stores it verbatim into `searchLaji` — so `searchLaji` becomes e.g. `["Padel"]`.

Both filter sites then compare against `p.laji.toLowerCase()` (a DB value like `"padel"`):

```ts
// line 699 — map pins filter
searchLaji.includes(p.laji.toLowerCase())   // ["Padel"].includes("padel") → false

// line 762 — search results filter
searchLaji.includes(p.laji.toLowerCase())   // ["Padel"].includes("padel") → false
```

The result: any non-empty `searchLaji` selection causes every venue to be excluded from both the map pins and the search results list. The filter appears to "work" (pill turns black, count indicator shows as active) but silently zeroes out all results.

Note that `lajitKartalla` (used for the base map display at line 701) is built correctly with `.toLowerCase()` at construction time — that part is fine. Only `searchLaji` storage is affected.

**Fix:** Normalise to lowercase when storing into `searchLaji`. Change the `onToggle` handler at line 1419:

```ts
// Before
onToggle={(item) => setSearchLaji(prev =>
  prev.includes(item) ? prev.filter(l => l !== item) : [...prev, item]
)}

// After — normalise to lowercase on store
onToggle={(item) => {
  const key = item.toLowerCase()
  setSearchLaji(prev =>
    prev.includes(key) ? prev.filter(l => l !== key) : [...prev, key]
  )
}}
```

And correspondingly update the sessionStorage restore at line 541 (already safe since it stores whatever was in `searchLaji`, which will now be lowercase), and check that `FilterCarouselPill`'s `selected.includes(item)` comparison at line 293 still works. Since `allItems` contains title-case strings but `selected` would now hold lowercase strings, the pill's internal `isSelected` check also breaks. The cleanest fix is to normalise both the `allItems` fed to the pill and the stored values, OR change the comparison site. The simplest approach:

```ts
// In FilterCarouselPill line 293 — compare lowercased
const isSelected = selected.includes(item.toLowerCase())
```

And store lowercase in `onToggle` as shown above. This way `allItems` can stay title-case for display while `selected` is always lowercase, consistent with the filter comparisons.

---

## Warnings

### WR-01: `displayItems` declared but never referenced — dead variable

**File:** `app/components/Etusivu.tsx:250`

**Issue:** `const displayItems = selected.length > 1 ? selected : allItems` is assigned on line 250 but is never used anywhere in `FilterCarouselPill`. The `displayText` computation on lines 251-255 duplicates this logic inline. The dead variable adds noise and will trigger TypeScript/lint warnings.

**Fix:** Remove line 250.

```ts
// Remove this line entirely
const displayItems = selected.length > 1 ? selected : allItems
```

---

### WR-02: Carousel interval ignores content changes in `selected` — stale closure

**File:** `app/components/Etusivu.tsx:243-248`

**Issue:** The carousel interval effect deliberately excludes `selected` and `allItems` from its dependency array, relying only on `selected.length` and `allItems.length`. This means if `selected` changes content without changing length (e.g. user deselects "Padel" and immediately selects "Tennis" — both of length 1, so the first `useEffect` at lines 238-241 fires and resets `idx` to 0, then the interval is restarted), the interval closure captures the old `selected` value for one tick.

More critically: when `selected.length` stays the same (e.g. 2 items, user swaps one), the interval is NOT re-created because `selected.length` didn't change. The interval closure keeps the old `selected` array and cycles stale labels.

**Fix:** Include `selected` (not `selected.length`) in the carousel interval dependency, and rely on the `idx` reset effect to handle the position reset:

```ts
useEffect(() => {
  if (selected.length === 1) return
  const items = selected.length > 1 ? selected : allItems
  const id = setInterval(() => setIdx(i => (i + 1) % items.length), 2000)
  return () => clearInterval(id)
}, [selected, allItems]) // full arrays, not just lengths
```

---

### WR-03: `useEffect` with `selected.join(',')` as inline-computed dependency — fragile pattern

**File:** `app/components/Etusivu.tsx:238-241`

**Issue:** The dependency array `[selected.join(',')]` computes a derived string inline inside the dependency array. While React evaluates this correctly each render (comparing the resulting string), this pattern bypasses exhaustive-deps lint rules (the lint rule only sees a `.join` call, not a stable reference), can produce false negatives in lint, and is fragile when the array ordering is not stable (e.g., if future code produces `["Tennis","Padel"]` vs `["Padel","Tennis"]`, the join differs even though the same items are selected).

**Fix:** Compute the join outside the effect and memoize it, or replace the pattern with a properly listed dependency. Since the intent is "reset to 0 when selection identity changes", use the same lowercase-normalised array reference:

```ts
const selectedKey = useMemo(() => [...selected].sort().join(','), [selected])

useEffect(() => {
  setIdx(0)
}, [selectedKey])
```

---

### WR-04: Redundant `sessionStorage.removeItem` call after key already removed

**File:** `app/components/Etusivu.tsx:534,539`

**Issue:** The scroll-restore effect removes the sessionStorage key unconditionally at line 534:
```ts
sessionStorage.removeItem('etusivu-scroll-state')  // line 534
```
Then at line 539, after parsing and checking the version, it calls `removeItem` again on the same key:
```ts
if (s._v !== 2) { sessionStorage.removeItem('etusivu-scroll-state'); return }  // line 539
```
By line 539 the key no longer exists, so this call is a no-op. This indicates a logic error in reasoning: the developer removed the key first and then tried to remove it again on the version-mismatch path. The key removal at line 534 is the correct unconditional remove (read-once-and-clear pattern), and the second removal at line 539 should be deleted.

**Fix:** Remove the redundant call at line 539:

```ts
// Before
if (s._v !== 2) { sessionStorage.removeItem('etusivu-scroll-state'); return }

// After
if (s._v !== 2) { return }
```

---

### WR-05: Weather temperature display mismatches `weatherKaupunki` when map pans outside Tampere

**File:** `app/components/Etusivu.tsx:617-621`

**Issue:** The weather fetch is triggered once on mount (line 616-621) with hardcoded Tampere coordinates (`latitude=61.4978&longitude=23.7610`). However, `weatherKaupunki` state is updated dynamically as the user pans the map (line 818), and the UI displays the temperature alongside `weatherKaupunki`:

```tsx
// line 1279-1281
{saa.temp}°{' '}<span className="font-normal text-[rgba(17,17,17,0.45)]">{weatherKaupunki}</span>
```

This produces e.g. "12° Pirkkala" where 12° is actually Tampere's temperature — potentially several degrees off and misleading.

**Fix:** Re-fetch weather when `weatherKaupunki` changes. This requires mapping city names to coordinates or using the map center directly. The minimal fix is to move the weather fetch into the existing `onCameraChanged` debounce or into its own effect keyed on `weatherKaupunki`. Since `open-meteo` is called via direct fetch (no key), there is no rate-limiting concern for debounced calls.

```ts
useEffect(() => {
  // Could use a lookup table from lib/constants for known kaupunki coords
  fetch(`/api/weather?kaupunki=${encodeURIComponent(weatherKaupunki)}`)
    .then(r => r.json())
    .then(d => setSaa({ temp: Math.round(d.current.temperature_2m), code: d.current.weather_code }))
    .catch(() => {})
}, [weatherKaupunki])
```

At minimum, document the limitation with a comment if fixing it is out of scope for this phase.

---

### WR-06: `handleOverlayDelete` function name misleads — it does not always delete

**File:** `app/components/Etusivu.tsx:480-486`

**Issue:** `handleOverlayDelete` is the `onToggleTodo` callback for `DiagonaalKortti` inside the TodoOverlay. Its name says "delete" but its actual logic is:
- When logged in: show a "did you visit?" review prompt (no deletion yet)
- When not logged in: call `toggleTodo` (which is a save/unsave toggle, not a delete)

The name misleads future maintainers into thinking a delete always occurs. Additionally, the not-logged-in branch is effectively unreachable in normal usage — `todoPaikat` is derived from `todoIds`, which is only populated from Supabase for authenticated users. An unauthenticated user has an empty `todoIds`, so `todoPaikat` is always empty and this code path would never render.

**Fix:** Rename to `handleTodoItemAction` or `handleTodoCardToggle`, and add a comment explaining the expected auth invariant:

```ts
// Called from DiagonaalKortti inside TodoOverlay.
// In practice supabaseUser is always set here (todoIds is only populated for auth'd users).
function handleTodoItemAction(id: number) {
  if (supabaseUser !== null) {
    setPendingReviewPaikkaId(id)
  } else {
    toggleTodo(id) // fallback: handles auth gate internally
  }
}
```

---

## Info

### IN-01: Redundant `Math.round` in `getClusters` call — zoom is already integer

**File:** `app/components/Etusivu.tsx:724`

**Issue:** `sc.getClusters(bounds, Math.round(zoomLevel))` applies `Math.round` to `zoomLevel`, but `zoomLevel` is always set via `setZoomLevel(Math.round(newZoom))` (line 811). The value is already an integer by construction.

**Fix:** Remove the redundant `Math.round`:
```ts
const mapItems = useMemo(
  () => (bounds ? sc.getClusters(bounds, zoomLevel) : []),
  [sc, bounds, zoomLevel]
)
```

---

### IN-02: `distancesMap` uses numeric keys on a `Record<string, number>` — index type mismatch

**File:** `app/components/Etusivu.tsx:737-745`

**Issue:** `distancesMap` is typed as `Record<string, number>` (line 737) but is indexed with `p.id` (a `number`) throughout (e.g. lines 1433, 1488). JavaScript coerces numeric keys to strings, so runtime behavior is correct, but the TypeScript type annotation `Record<string, number>` invites `distancesMap[someString]` without a type error. The more precise type is `Record<number, number>` or `Partial<Record<number, number>>`.

**Fix:**
```ts
const distancesMap = useMemo<Record<number, number>>(() => {
  ...
}, [coords, paikat])
```

---

_Reviewed: 2026-06-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
