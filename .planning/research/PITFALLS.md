# Domain Pitfalls — v1.5 Visual Polish & UX

**Domain:** Adding visual polish & UX improvements to a live Next.js 14 / @vis.gl/react-google-maps / Framer Motion app
**Researched:** 2026-05-31
**Scope:** Integration pitfalls specific to THIS codebase — not generic advice

---

## 1. CSS Keyframe Animations on AdvancedMarker DOM Content Cause Full Repaint on Every Frame

**What goes wrong:**
Adding CSS `animation` or `@keyframes` (e.g., a shimmer or pulse on pin icons) to elements inside `<AdvancedMarker>` content triggers repaints for every animating pin simultaneously. At 80+ markers, `gmap-pin` currently uses a one-shot `pinBounce` keyframe which is fine — it fires once, then stops. A looping animation (e.g., gradient shimmer, glint sweep) would repaint all visible pins at 60 fps.

**Why it happens in this system:**
Each `<AdvancedMarker>` wraps a real DOM node inside Google Maps' overlay layer. That layer does not establish a separate GPU compositing layer for each child — it is a flat DOM overlay. Animating `background`, `background-position`, or `box-shadow` inside it forces the browser to repaint the entire map tile region, not just the element. The existing `pinBounce` works because it uses only `transform` + `opacity` (compositor-promoted properties) and runs once.

**Consequences:**
Janky bottom sheet scroll and card list while the map is visible, especially on mid-range Android (4× CPU slowdown exposes this in under 30 seconds). The Google Maps tile renderer and the CSS animation fight for the same paint budget.

**Prevention:**
- Any looping animation on pins MUST use only `transform` and/or `opacity` — never `background`, `box-shadow`, `border-color`, or `filter`.
- Add `will-change: transform` to the animated element immediately before animation starts; remove it afterward (see Pitfall 12 for why static `will-change` is dangerous).
- Add `translate3d(0,0,0)` on the animated element to force layer promotion for the duration of the animation.
- Test with Chrome DevTools → Rendering → Paint flashing on a device-level CPU throttle (4×) before shipping.

**Phase flag:** Any phase adding looping CSS animations to map pins.

---

## 2. AdvancedMarker Key Instability Causes Marker Churn and z-index Conflicts

**What goes wrong:**
The existing cluster marker key is `'cluster-' + item.items.map(p => p.id).join('-')`. If `paikatKartalla` recomputes when `searchLaji` changes, the items array order may differ, producing a different key for the same coordinate cluster. This unmounts and remounts the `AdvancedMarker`. The remounted marker enters at default `zIndex={2}`, overriding the elevated `zIndex={20}` set for an expanded cluster. The "cluster popup" disappears mid-interaction.

**Why it happens in this system:**
`mapItems` iterates `paikatKartalla` (filtered from the stable `paikat` server prop, but re-filtered on `searchLaji`). If one venue in a two-venue same-address cluster is filtered out, the remaining single-item group gets a new key vs. the old two-item key. Critically, `expandedCluster === item.items` uses reference equality — after remount, `item.items` is a new array, so the popup state never matches and the popup never reopens.

**Consequences:**
User opens a cluster popup, changes the laji filter, cluster remounts with new key, old `expandedCluster` state holds stale reference — popup disappears silently with no animation or feedback.

**Prevention:**
- Key clusters by their coordinate bucket string (`Math.round(p.latitude * 10000) + ',' + Math.round(p.longitude * 10000)`), not by member IDs.
- Store `expandedCluster` state by the coordinate bucket key (a string), not by array reference.
- After any clustering change, verify the scenario: open a cluster popup → change laji filter → popup either stays consistent or closes cleanly with an exit animation.

**Phase flag:** Any phase touching marker clustering or adding visual changes to cluster pins.

---

## 3. @googlemaps/markerclusterer Library Conflicts with the Existing Custom Cluster System

**What goes wrong:**
`@googlemaps/markerclusterer` v2.6.2 is in `package.json` but is not used — the app implements same-address clustering manually in the `mapItems` useMemo. If a phase adds `MarkerClusterer` from this library on top of the existing `<AdvancedMarker>` rendering, every venue appears twice: once from the library's cluster renderer and once from the React-managed markers, because `mapItems` still produces markers for all venues.

**Why it happens in this system:**
The custom clustering in `mapItems` outputs `{ type: 'single' | 'cluster' }` items and renders all of them as `<AdvancedMarker>` elements in JSX. `MarkerClusterer` takes an array of `google.maps.marker.AdvancedMarkerElement` imperative instances — it does not know about React-managed markers already on the map. You cannot layer the two systems.

**Consequences:**
Double markers at every location, broken click handlers (both systems respond), potential memory leak if the `MarkerClusterer` object is not destroyed on unmount via `clusterer.setMap(null)`.

**Prevention:**
- If adding `MarkerClusterer`, completely replace `mapItems` and all `<AdvancedMarker>` JSX rendering. Do not layer on top.
- The lower-risk alternative: extend `clusterPinUrl()` in `lib/sportPins.ts` to accept a gradient or richer SVG — zero library conflict, same visual improvement.
- If the library is used, the cleanup effect MUST call `clusterer.clearMarkers(); clusterer.setMap(null)` on unmount.

**Phase flag:** MAP clustering phases. Decide at phase start: library or extend custom. Never mix.

---

## 4. Framer Motion `layoutId` Loses Snapshot When Source Unmounts Before Target Mounts

**What goes wrong:**
`layoutId="vc-{p.id}"` connects `CalloutCard` (inside `AdvancedMarker`) to `PaikkaSheet` (fixed overlay). When the user taps a callout card and the map simultaneously re-renders (zoom crosses the `< 16` threshold), `AnimatePresence` may unmount the callout card's `motion.div` before `PaikkaSheet` has mounted. Framer Motion loses the source element's position snapshot and the expand animation starts from `{x:0, y:0}` (top-left viewport) instead of the card's map location.

**Why it happens in this system:**
`nearestCardId` re-evaluates on every `onCameraChanged` event (lines 500–511 in Etusivu.tsx). If the user taps while panning, `nearestCardId` can change between tap-start and React commit. The `key="card"` element exits via `AnimatePresence initial={false}`, and the entering `PaikkaSheet` finds no matching mounted `layoutId` to animate from.

The existing mitigation (the `zoomRef.current` vs `zoomLevel` state debounce at line 562–564) prevents unnecessary `nearestCardId` thrashing during zoom, but only at the threshold — a fast tap during normal pan can still trigger this.

**Consequences:**
Sheet slides in from top-left on fast taps during map pan. Intermittent — only reproduces on slow devices or while map is moving at tap time.

**Prevention:**
- Do not break the existing `zoomRef`/`zoomLevel` debounce pattern when adding new animated elements.
- If expanding CalloutCard's animation in v1.5, add a ref to capture `getBoundingClientRect()` on tap and use it as the `initial` position if `layoutId` snapshot is unavailable.
- The `pendingValittuRef` pattern (already in use for deferred setValittu after auto-zoom) is the correct mental model — extend it rather than adding new competing state paths.

**Phase flag:** Any phase that adds new `layoutId` connections or changes zoom-threshold logic.

---

## 5. Converting /suosikit to an Overlay Breaks Deep Links, PWA History, and Supabase Auth Redirects

**What goes wrong:**
If `/suosikit` is replaced by an in-page overlay toggled by a toolbar button, three things break:
1. **Auth email confirmation:** Supabase `redirectTo` defaults to `window.location.origin`. A user who clicks the email confirmation link while the overlay is open (with `window.history.pushState('/suosikit', ...)`) lands on a 404 if the route no longer exists.
2. **PWA back button:** If the overlay uses `router.push('/suosikit')` to add a history entry, the PWA installed to homescreen tracks this. `router.back()` navigates to the map but the bottom sheet state is lost. If a `pushState` approach is used instead, Serwist's precache strategy won't serve it correctly offline.
3. **Existing links:** The current `Etusivu.tsx` toolbar has `href="/suosikit"` (line 805). `SuosikitClient.tsx` and `PaikkaSheet.tsx` also reference this route. Removing the route without updating all call sites produces broken links that Next.js silently lets through (no compile-time route checking).

**Why it happens in this system:**
`/suosikit/page.tsx` exists as a real Next.js route. Serwist precaches it (static shell, no dynamic data). Three separate files link to `/suosikit`. The auth subscription in `SuosikitClient.tsx` (the `subscribeToAuthUser` effect) is already duplicated in `Etusivu.tsx` — moving the UI to an overlay reuses the Etusivu subscription but the `/suosikit` route must remain valid.

**Consequences:**
Auth email confirmations fail for users who are on the overlay. PWA users get 404 on re-launch if last URL was `/suosikit`. Back-button exits the app.

**Prevention:**
- Keep `/suosikit/page.tsx` as a real Next.js route. Either render the overlay content there as a full page, or have the page `redirect('/?overlay=todo')` and handle `?overlay=todo` in Etusivu's mount effect (the scroll-restore effect at line 299 is the right pattern to extend).
- Do NOT delete `/suosikit/page.tsx` without a redirect.
- Update Serwist precache config if the URL pattern changes.
- Search for all `href="/suosikit"` and `router.push('/suosikit')` occurrences before shipping — there are at least 3 (Etusivu toolbar, SuosikitClient back link, NavPill if present).

**Phase flag:** Any phase converting /suosikit to an overlay or adding a dedicated TO DO panel button.

---

## 6. Logo API Calls — CORS Block on Client, Rate Limit Exhaustion on Card List Render

**What goes wrong:**
Most logo APIs (Clearbit, Brandfetch, Logo.dev) block client-side requests from unknown referers via CORS. Even when CORS passes, free-tier rate limits (Clearbit: 1 req/sec; Logo.dev: ~100 req/day free tier) are exhausted immediately when the card list renders 50+ venues. Google's referrer policy strips the `Referer` header on cross-origin requests, causing Clearbit's domain-matched free endpoint to return 404s.

**Why it happens in this system:**
`searchSuodatettu.map()` in Etusivu.tsx renders up to 80+ `DiagonaalKortti` cards simultaneously. If each card fires a logo fetch in `useEffect`, all requests fire in the same render cycle. There is no debounce or rate-limiting in the current card rendering path.

**Consequences:**
80+ simultaneous 404s in the network tab on every page load. Rate limits exhausted within seconds. Broken `<img>` elements visible to users. On revisit the same day, every card shows a broken logo.

**Prevention:**
- All logo fetches MUST go through a Next.js Route Handler (`/api/logo?domain=X`) that calls the logo API server-side with proper `Authorization` headers, caches results in a `Map<string, Buffer|string>` in module scope (process lifetime = warm lambda), and returns a `data:` URI or a redirect to the CDN URL.
- Always render the sport-color fallback (`laji.color` + Lucide icon) as the initial state. Replace only when the logo fetch succeeds — never show a broken `<img>`.
- Rate-limit the route handler: if the same domain was requested in the last 60 seconds, return cached result without calling upstream.
- For venues without a `website` field in Supabase, skip the API call entirely.
- Cap the number of concurrent logo fetches per page load (e.g., `IntersectionObserver`-based lazy loading — only fetch logos for cards currently in the viewport).

**Phase flag:** Logo API spike phase. Must be prototyped server-side before wiring to the card list.

---

## 7. Font Swap Causes CLS in the Bottom Sheet and AI Widget

**What goes wrong:**
If a new display font is added (or Inter/Playfair Display is replaced) without using `next/font`, the browser loads the fallback system font first, then swaps when the web font arrives. The AI widget text (`text-sm`) and PaikkaSheet heading (`font-serif text-2xl font-bold`) re-layout after the swap because font metrics differ. The bottom sheet pill relies on `HANDLE_H = 44` as a constant — if sheet handle text changes font and gains height, the pill-to-sheet spring animation overshoots and lands at the wrong y position.

**Why it happens in this system:**
`app/layout.tsx` uses `next/font/google` in `variable` mode — both `--font-sans` and `--font-serif` are CSS custom properties. This is the correct pattern and eliminates FOUT. However, if a phase adds a font via `@import` in `globals.css` or a `<link>` tag in `layout.tsx`, it bypasses `next/font`'s size-adjust optimization and reintroduces CLS.

**Consequences:**
AKTIIVI logo, AI widget text, and sheet headings jump visually on first load. Google PageSpeed Insights and Core Web Vitals flag the CLS regression.

**Prevention:**
- All font additions MUST use `next/font/google` in `app/layout.tsx`. No CSS `@import`, no `<link rel="stylesheet">` for fonts.
- When changing `font-serif` (Playfair Display), update the `size-adjust` in the `next/font` config to match the new font's cap-height ratio.
- Never add `style={{ fontFamily: '...' }}` referencing a font not loaded through `next/font`.
- Verify Lighthouse CLS score (target < 0.1) before shipping any font change.

**Phase flag:** Font redesign / bottom sheet logo area redesign phase.

---

## 8. AktiiviLogo Gradient Animation Desynchronizes When `gradientIndex` Changes Faster Than the Wipe Duration

**What goes wrong:**
`AktiiviLogo.tsx` runs a Framer Motion imperative `animate(rect, { width: 1672 }, { duration: 0.55 })` on `currIndex` change. The `useEffect` cleanup calls `controls.cancel()`. If `gradientIndex` increments again before 550ms elapses, `cancel()` fires mid-animation, then the new animation starts from whatever `width` the `<rect>` had at cancellation — not from `0`. The `setPrevIndex(currIndex)` call inside `.then()` never runs for cancelled animations, so `prevIndex` desynchronizes from `currIndex`. The gradient wipe then reveals the wrong "previous" color layer.

**Why it happens in this system:**
The `Karuselli` interval (4000ms) is safe. The risk activates if any v1.5 feature auto-cycles the `gradientIndex` prop on a tighter interval, or if the parent re-renders rapidly due to a related state update (e.g., sheet open/close triggering a re-render of the parent that holds `gradientIndex` state).

**Consequences:**
SVG shows a partial wipe frozen at cancellation width, with wrong gradient on the "previous" layer. Silent visual corruption — no error thrown.

**Prevention:**
- Reset `rect.setAttribute('width', '0')` in the cleanup (`return () => { controls.cancel(); rectRef.current?.setAttribute('width', '0') }`), not only in `.then()`.
- Ensure the minimum interval between `gradientIndex` changes is > 650ms (animation 550ms + React commit overhead).
- Do not use `setInterval` intervals shorter than 800ms for cycling the logo gradient.
- The `if (currIndex === prevIndex) return` guard (line 25 in AktiiviLogo.tsx) prevents unnecessary animation on same-index renders — do not remove it.

**Phase flag:** Any phase adding auto-cycling of the logo gradient or "sport highlight" timers.

---

## 9. Framer Motion AnimatePresence on the DiagonaalKortti Card List Blocks Interaction for 200ms+ on Every Filter Change

**What goes wrong:**
The current `searchSuodatettu.map(p => <DiagonaalKortti key={p.id} .../>)` renders cards without `AnimatePresence`. If `AnimatePresence` is added to animate cards out on filter change, all exiting cards remain in the DOM until their `exit` animation completes. With 50 cards exiting simultaneously at `duration: 0.2`, the filter pills and search input are unresponsive for 200–400ms after every filter tap on a mid-range device.

**Why it happens in this system:**
Framer Motion keeps exiting elements mounted and pointer-event-blocking until the exit animation finishes. The search results `<div>` is `overflow-y-auto` and re-renders on every `searchHaku` keystroke. Wrapping a large list in `AnimatePresence` causes React to keep 50+ exiting DOM nodes alive per render cycle. At 4× CPU slowdown, this is a 300–500ms freeze per filter change.

**Consequences:**
Filter pills feel broken immediately after being tapped — the next tap is unregistered because the click target is obscured by an exiting (still-rendered) card at `z-index` overlapping the pills.

**Prevention:**
- For list items that re-sort/re-filter on user input, do NOT wrap the `map()` in `AnimatePresence`. Use `variants` on the container with `staggerChildren` for enter-only animations (cards animate in, but never animate out on filter change).
- If exit animations are required for a specific phase, use `AnimatePresence mode="popLayout"` (available in Framer Motion v10+, this project uses v12). `popLayout` removes exiting elements from layout flow immediately while animating only `opacity`, eliminating the click-blocking problem.
- Limit exit `duration` to 0.1 at most if `popLayout` is not used.
- The existing pattern (no AnimatePresence on the card list, only `diagonaalKorttiVariants` for entry) is intentional — do not add exit animations without testing at 80+ cards with CPU throttle.

**Phase flag:** Any phase adding enter/exit animations to the DiagonaalKortti card list.

---

## 10. Filter State Removal Breaks sessionStorage Scroll Restoration Mid-Session

**What goes wrong:**
`handleCardClick()` in Etusivu.tsx saves `{ searchHaku, searchLaji, searchKertakaynti, searchAukinyt, searchKaupunki, scrollTop, searchOpen }` as unversioned JSON in sessionStorage. The restore effect reads all keys back. If v1.5 removes a filter key (e.g., `searchAukinyt` is merged into another filter, or `searchKertakaynti` is renamed), the restore effect will attempt to set state for a key that no longer exists. TypeScript does not catch this at compile time because the stored value is parsed from JSON as `unknown` and checked with `typeof s.searchAukinyt === 'boolean'` — but the setter `setSearchAukinyt` may no longer exist.

**Why it happens in this system:**
The scroll state JSON is unversioned. Mobile users keep browser tabs open for days — a v1.5 deploy mid-session means the stored state uses v1.4 key names while the new code expects v1.5 key names. The `typeof` guards prevent crashes but silently leave filter state in an inconsistent "active but invisible" condition.

**Consequences:**
Filter is active (venues are filtered) but there's no visual indicator (pill not rendered). User sees fewer venues with no explanation. The only fix is a hard browser refresh.

**Prevention:**
- Add a version field: save `{ _v: 2, searchHaku, ... }`. In the restore effect, bail out if `s._v !== CURRENT_SCROLL_STATE_VERSION` (increment when any key is added/removed).
- When removing a filter key, add it to a legacy key blocklist in the restore effect.
- Update the `isFilterActive` expression (line 526 in Etusivu.tsx) to not reference removed keys — the TypeScript compiler will catch this if the state variable is deleted, but it will not catch references inside the sessionStorage restore JSON parsing block.

**Phase flag:** Any phase that changes the filter key set.

---

## 11. `clip-path: path()` in CalloutCard Breaks on Safari 15 / iOS 15

**What goes wrong:**
`CalloutCard` uses `clip-path: path('M 10,0 ...')` computed by a `ResizeObserver`. The `path()` function inside `clip-path` is not supported on Safari < 16 (iOS 15, released Sep 2021, still in use on iPhone 6s/7 which cannot upgrade past iOS 15). On these browsers, the callout card renders as an unclipped rectangle — the speech-bubble pointing tail disappears and the card overlaps the pin awkwardly.

**Why it happens in this system:**
The existing code has a partial fallback: `borderRadius: clipPath ? 0 : 10` — but this only covers the "clip path not computed yet" case (before the `ResizeObserver` fires). It does NOT cover the "browser doesn't support `path()` at all" case. `clipPath` will be set to a non-empty string even on Safari 15, because the JS runs fine — it's only the CSS property that is ignored.

**Consequences:**
No crash, but visual regression on ~3–5% of iOS users (iOS 15 market share remains non-trivial, 2026). The card shape breaks specifically when the v1.5 "larger callout cards" requirement expands the card height.

**Prevention:**
- Add a `CSS.supports('clip-path', 'path("M0,0")')` check in the `useLayoutEffect`. If unsupported, set `clipPath` to `''` and rely on the `borderRadius: 10` fallback.
- The existing conditional `borderRadius: clipPath ? 0 : 10` then handles both "not computed yet" AND "not supported" correctly with no additional code.
- Do not replace `clip-path: path()` with a CSS `::after` triangle (border-trick) — the current clip approach is tighter against the pin anchor and the fallback rectangle is acceptable.

**Phase flag:** Callout card redesign / expansion phase in v1.5.

---

## 12. Static `will-change: transform` on `.gmap-pin` Exhausts GPU Memory on Android

**What goes wrong:**
Adding `will-change: transform` globally to `.gmap-pin` in `globals.css` (a common "performance optimization" suggestion) promotes every pin to a separate GPU compositing layer. With 80+ pins visible, this exhausts the compositing layer budget on low-end Android devices (2–3 GB RAM). The entire Google Maps tile layer stutters because the compositor is managing too many layers.

**Why it happens in this system:**
`will-change: transform` must be added immediately before an animation starts and removed when it ends — not held permanently. Adding it statically to a CSS class applied to all 80+ markers simultaneously means all pins are promoted at all times, even when no animation is running.

**Consequences:**
Visible stutter when panning the map after the pin layer GPU memory exceeds the compositing budget. Chrome DevTools → Layers panel shows 80+ compositor layers. Removing `will-change` restores normal performance immediately.

**Prevention:**
- Do NOT add `will-change: transform` to `.gmap-pin` in `globals.css`.
- If a hover or active animation requires GPU promotion, use a JavaScript approach: add `style.willChange = 'transform'` on `mouseenter`/`touchstart` and remove it on `mouseleave`/`touchend`.
- The existing `pinBounce` keyframe (one-shot, `animation-fill-mode: both`) does not need `will-change` — browsers handle single-fire animations efficiently without explicit promotion hints.

**Phase flag:** Any phase adding looping or hover animations to map pins.

---

## Phase-Specific Warning Summary

| Phase Topic | Pitfall # | Mitigation |
|---|---|---|
| Marker gradient / shimmer / glint animation | 1, 12 | transform/opacity only; no static will-change in CSS |
| Cluster library integration | 3 | Replace mapItems fully OR extend custom clusterPinUrl only — never mix |
| CalloutCard expansion / redesign | 4, 11 | Keep zoomRef debounce; add CSS.supports fallback for Safari 15 |
| TO DO overlay (replacing /suosikit page) | 5 | Keep /suosikit route; use ?overlay=todo param pattern |
| Logo API spike | 6 | Server-side route handler with module-scope cache; sport-color fallback default |
| Font redesign / logo area redesign | 7 | next/font only; no @import in CSS; verify Lighthouse CLS < 0.1 |
| AktiiviLogo gradient cycling | 8 | Reset rect.width in cancel cleanup; min 800ms between index changes |
| Filter key removal | 10 | Version the sessionStorage scroll state; update isFilterActive |
| AnimatePresence on DiagonaalKortti list | 9 | mode="popLayout" or entry-only animations; test at 80+ cards with CPU throttle |
| AdvancedMarker key changes | 2 | Key clusters by coordinate bucket string, not member IDs |
