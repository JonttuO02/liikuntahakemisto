# Phase 20: Navigaatio-korjaukset - Research

**Researched:** 2026-05-30
**Domain:** Next.js 14 App Router navigation, React state persistence, Framer Motion animation sequencing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 (NAV-01):** Tekniikka: sessionStorage. Ennen navigointia /paikat/ID:lle DiagonaalKortti tallentaa koko hakutilan sessionStorageen. Etusivu lukee arvot mountissa ja palauttaa tilan.

**D-02 (NAV-01):** Mitä tallennetaan: täydellinen tila — `scrollTop` (search-results-containerin), `searchHaku`, `searchLaji`, `searchKertakaynti`, `searchAukinyt`, `searchKaupunki`, `searchOpen: true`. Suodattimet palautetaan täysin.

**D-03 (NAV-01):** Milloin tallennetaan: DiagonaalKortin `<Link>`-elementin **onClick**-handlerissa ennen navigointia. Scroll-sijainti luetaan search-results-containerin `scrollTop`-arvosta.

**D-04 (NAV-01):** Palautuslogiikka: Etusivu tarkistaa mountissa `sessionStorage`-avaimen. Jos löytyy, asettaa kaikki hakutila-statet + avaa search-overlain. Yksi `useEffect([], [])` joka lukee ja siivoaa avaimen sen jälkeen.

**D-05 (NAV-01):** sessionStorage-avain: `'etusivu-scroll-state'`. Sisältö JSON-serialisoitu.

**D-06 (NAV-03):** Alustustila muutetaan: `useState<'open'|'sliding'|'closed'>('closed')` (oli `'open'`).

**D-07 (NAV-03):** Auto-open: erillinen `useEffect` jossa deps `[]` — tarkistaa `if (!focusId) setSheetPhase('open')`. Ei setTimeout-viivettä — käynnistyy seuraavalla tikillä.

**D-08 (NAV-02 + NAV-03):** Auto-open effect tarkistaa `if (!focusId)`. Jos URL sisältää `?id=X`, auto-open ei laukaise. Kaksi erillistä effectiä, selkeä logiikka.

**D-09 (NAV-04):** Poistetaan "Haku" / Search -kohta NavPillin dropdown-listasta (`app/components/NavPill.tsx`). Linkki meni poistettuun `/?nakyma=lista`-reittiin.

**D-10 (NAV-05):** Korvataan kaikki `href="/?nakyma=lista"` viitteet `href="/"`:ksi `app/suosikit/SuosikitClient.tsx`:ssä (3 esiintymää).

### Claude's Discretion

- Tarkka sessionStorage JSON-rakenne (kertaluonteiset yksityiskohdat)
- scrollTop-containerin ref-strategia (useRef DiagonaalKortille tai parentille)
- Auto-open effectin järjestys suhteessa muihin effecteihin

### Deferred Ideas (OUT OF SCOPE)

- Hakunapin lisääminen /suosikit ja /profiili -sivujen left-toolbariin
- Scroll-sijainnin palauttaminen window.scrollY-tasolle
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NAV-01 | Käyttäjä palaa paikan profiilisivulta listaan entiseen scroll-sijaintiin | D-01 – D-05: sessionStorage pattern confirmed in codebase (AI widget already uses it); `search-results` motion.div at line 921 of Etusivu.tsx is the scroll container; DiagonaalKortti Link is the navigation trigger |
| NAV-02 | "Näytä kartalla" avaa kartan ja kohdistaa paikan koordinaatteihin; GPS ei aktivoidu; bottomsheet pysyy kiinni | Already correct per CONTEXT.md canonical refs — `/?id=${paikka.id}` in page.tsx line 91 triggers focusId effect (lines 359–366) which calls `setSheetPhase('sliding')` not 'open'; no code changes needed |
| NAV-03 | Etusivu latautuu bottomsheet kiinni, avautuu automaattisesti animoituna välittömästi | D-06/D-07/D-08: change initial useState to 'closed'; add auto-open useEffect with focusId guard; existing spring transition handles animation (damping 28, stiffness 280, delay 0.1) |
| NAV-04 | Suosikit- ja Profiili-sivujen toolbarista poistettu haku-painike | D-09: NavPill.tsx line 57-60 — single Link block `href="/?nakyma=lista"` with Search icon to remove |
| NAV-05 | TO DO -sivun "Takaisin"-nappi vie oikeaan kohteeseen (ei /?nakyma=lista) | D-10: SuosikitClient.tsx lines 73, 104, 134 — 3 href replacements confirmed |
</phase_requirements>

---

## Summary

Phase 20 addresses five navigation inconsistencies in a Next.js 14 App Router + Framer Motion codebase. The changes are focused, surgical, and mostly additive — no architectural shifts are required. The riskiest change is NAV-01 (sessionStorage scroll+state persistence), which requires wiring a ref to the search-results scroll container in Etusivu.tsx and passing a callback prop down to DiagonaalKortti. The remaining four changes (NAV-02 confirmed already correct, NAV-03 useState init + one effect, NAV-04 delete one JSX block, NAV-05 three href substitutions) are straightforward.

The codebase already uses sessionStorage for AI widget caching (try/catch pattern) and the established DiagonaalKortti `onShowMap` prop demonstrates how to pass callbacks from Etusivu into that component. The Framer Motion sheet transition (`'open'` phase) already has a spring with `delay: 0.1` — changing the initial state to `'closed'` and firing `setSheetPhase('open')` on mount will produce a natural entry animation at no extra cost.

The `focusId` guard for the auto-open effect (D-08) is critical: if `?id=X` is present, the existing focusId effect at lines 359–366 handles sheet state by calling `setSheetPhase('sliding')`, and the auto-open must not override this. Two independent `useEffect([], [])` hooks with a conditional check maintain clarity.

**Primary recommendation:** Implement in task order: NAV-04 and NAV-05 first (trivial, no state interaction), then NAV-03 (sheet init), then NAV-01 (scroll restore — most code surface), confirm NAV-02 needs no changes.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Scroll position persistence | Browser / Client | — | sessionStorage is client-only; written before navigation, read on mount |
| Search state persistence | Browser / Client | — | React state in Etusivu; serialised to sessionStorage transiently |
| Bottom sheet animation sequencing | Browser / Client | — | Framer Motion springs run in browser; state machine in Etusivu |
| Map focus via URL param | Frontend Server (SSR) / Client | Browser / Client | URL param `?id=X` is read by `useSearchParams()` in Etusivu; focusId effect runs client-side |
| NavPill link removal | Browser / Client | — | Pure JSX delete in NavPill.tsx |
| Back-link href correction | Browser / Client | — | Static href props in SuosikitClient.tsx |

---

## Standard Stack

No new packages are installed for this phase. All work uses existing dependencies.

### Existing Dependencies Used

| Library | Version | Purpose in this phase |
|---------|---------|----------------------|
| Next.js | 14.2.35 | App Router, Link, useSearchParams, useRouter |
| React | ^18 | useState, useEffect, useRef |
| framer-motion | ^12.38.0 | Sheet animation (existing sheetTransition 'open' phase) |

**Installation:** None required.

---

## Package Legitimacy Audit

No new packages are being installed in this phase.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
DiagonaalKortti (card in search results)
  └─ onClick on <Link href="/paikat/ID">
        │
        ▼
  sessionStorage.setItem('etusivu-scroll-state', JSON)
        │  (writes: scrollTop + 6 search state fields)
        ▼
  Next.js navigation → /paikat/[id]/page.tsx
        │
  User presses "Takaisin hakemistoon" → Link href="/"
        │
        ▼
  Etusivu mounts
        │
  useEffect([], []) ── reads 'etusivu-scroll-state'
        │   ├─ if found: set all 6 search states
        │   │           setSearchOpen(true)
        │   │           (scroll restore after render)
        │   │           delete key
        │   └─ if not found: normal init
        ▼
  Auto-open useEffect([], [])
        ├─ if !focusId → setSheetPhase('open')   [NAV-03]
        └─ if focusId  → (focusId effect handles sliding)

URL ?id=X path (NAV-02 — already correct, no change):
  /paikat/[id] → "Näytä kartalla" → Link href="/?id=${paikka.id}"
  Etusivu: focusId effect (lines 359-366) → setAutoZoomTarget + setSheetPhase('sliding')
  MapAutoZoom animates to venue coords — GPS not involved
```

### Recommended Project Structure (no new files)

All changes are within existing files:
```
app/
├── components/
│   ├── Etusivu.tsx       ← NAV-01 (ref + restore effect + onCardClick prop)
│   │                       NAV-03 (useState init + auto-open effect)
│   ├── DiagonaalKortti.tsx ← NAV-01 (onCardClick prop + onClick on Link)
│   └── NavPill.tsx         ← NAV-04 (delete "Haku" link block)
└── suosikit/
    └── SuosikitClient.tsx  ← NAV-05 (3× href substitution)
```

### Pattern 1: sessionStorage Scroll + State Persistence

**What:** Serialize all relevant UI state to sessionStorage before navigating away; read and restore on re-mount; delete key after reading to prevent stale restoration on subsequent visits.

**When to use:** SPA-style "back" navigation where React state is lost on unmount (Next.js App Router soft navigation preserves scroll only at page level, not within overflow containers).

**Example (write side — DiagonaalKortti):**
```tsx
// Source: existing sessionStorage pattern in Etusivu.tsx lines 333-350 (AI widget cache)
// Adapted for scroll state:

// In Etusivu.tsx, create ref and pass callback:
const searchResultsRef = useRef<HTMLDivElement>(null)

function handleCardClick() {
  try {
    const scrollTop = searchResultsRef.current?.scrollTop ?? 0
    const state = {
      scrollTop,
      searchHaku,
      searchLaji,
      searchKertakaynti,
      searchAukinyt,
      searchKaupunki,
      searchOpen: true,
    }
    sessionStorage.setItem('etusivu-scroll-state', JSON.stringify(state))
  } catch {}
}

// Pass to DiagonaalKortti:
<DiagonaalKortti
  key={p.id}
  paikka={p}
  distanceStr={...}
  onShowMap={...}
  onCardClick={handleCardClick}   // NEW prop
/>
```

**Example (restore side — Etusivu mount effect):**
```tsx
// Source: [ASSUMED] — React useEffect mount pattern + existing sessionStorage pattern
useEffect(() => {
  try {
    const raw = sessionStorage.getItem('etusivu-scroll-state')
    if (!raw) return
    sessionStorage.removeItem('etusivu-scroll-state')
    const s = JSON.parse(raw)
    setSearchHaku(s.searchHaku ?? '')
    setSearchLaji(s.searchLaji ?? 'Kaikki')
    setSearchKertakaynti(s.searchKertakaynti ?? false)
    setSearchAukinyt(s.searchAukinyt ?? false)
    setSearchKaupunki(s.searchKaupunki ?? 'Kaikki')
    if (s.searchOpen) setSearchOpen(true)
    // Defer scroll restore until after React has rendered the list
    if (s.scrollTop) {
      requestAnimationFrame(() => {
        if (searchResultsRef.current) {
          searchResultsRef.current.scrollTop = s.scrollTop
        }
      })
    }
  } catch {}
}, []) // eslint-disable-line react-hooks/exhaustive-deps
```

**Example (DiagonaalKortti onClick on Link):**
```tsx
// Source: existing HeartButton stopPropagation pattern in DiagonaalKortti.tsx
// The Link wraps the entire card — onClick fires before navigation:

interface DiagonaalKorttiProps {
  paikka: Liikuntapaikka
  distanceStr?: string
  onShowMap?: (paikka: Liikuntapaikka) => void
  onCardClick?: () => void   // NEW
}

// In JSX:
<Link href={`/paikat/${paikka.id}`} className="absolute inset-0 block"
  onClick={() => onCardClick?.()}>
```

### Pattern 2: Bottom Sheet Auto-Open on Mount

**What:** Initialize sheet as closed so the page loads with map fully visible, then immediately trigger open animation via a mount-only effect.

**When to use:** When the sheet should appear to "slide up" on first load rather than being pre-rendered open.

**Example:**
```tsx
// Source: existing Etusivu.tsx sheetPhase state machine

// BEFORE (line 168):
const [sheetPhase, setSheetPhase] = useState<'open' | 'sliding' | 'closed'>('open')

// AFTER:
const [sheetPhase, setSheetPhase] = useState<'open' | 'sliding' | 'closed'>('closed')

// NEW effect — runs after focusId is available from useSearchParams:
useEffect(() => {
  if (!focusId) setSheetPhase('open')
}, []) // eslint-disable-line react-hooks/exhaustive-deps
// Note: focusId from useSearchParams is stable on mount; the if(!focusId) check
// correctly handles the ?id=X case without adding focusId to deps.
```

**Critical interaction:** The existing focusId effect at lines 359-366 calls `setSheetPhase('sliding')`. React processes `useEffect` hooks in declaration order on mount. Place the auto-open effect BEFORE the focusId effect to ensure predictable sequencing — but because both fire synchronously in the same render cycle and React batches state updates, the last setter wins. The safe approach is to guard with `if (!focusId)` in the auto-open effect, so when `?id=X` is present, auto-open never calls `setSheetPhase('open')`.

### Pattern 3: Ref on motion.div scroll container

**What:** The search-results scroll container is a `motion.div` (line 921 in Etusivu.tsx). Adding a `useRef<HTMLDivElement>` and attaching it via `ref` prop works normally — Framer Motion forwards refs to the underlying DOM element.

**Example:**
```tsx
// motion.div accepts ref directly (Framer Motion ref-forwarding):
<motion.div
  key="search-results"
  ref={searchResultsRef}   // ADD THIS
  ...other props
>
```

### Anti-Patterns to Avoid

- **setTimeout for scroll restore:** Using `setTimeout(fn, 0)` instead of `requestAnimationFrame` can fire before React has rendered the list and the container has its content height. Use `requestAnimationFrame` for post-render DOM operations.
- **focusId in auto-open deps array:** Adding `focusId` to `useEffect([], [focusId])` would re-fire on every URL param change, not just mount. Keep deps `[]`.
- **Mutating sessionStorage without try/catch:** Private/incognito mode can throw `SecurityError` on `sessionStorage.setItem`. Always wrap in try/catch (established pattern at lines 333-335 and 350 of Etusivu.tsx).
- **Restoring scroll before searchOpen state is applied:** React state updates from the restore effect batch together, but `requestAnimationFrame` defers the scroll assignment until after the batch re-render, which is the correct order.
- **Passing `searchResultsRef` to DiagonaalKortti:** Do not pass the ref down to the card. Instead, have Etusivu read `searchResultsRef.current.scrollTop` inside `handleCardClick` and pass only the serialized value. This keeps the ref ownership at Etusivu level.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scroll position persistence across navigation | Custom URL-based scroll state | sessionStorage (decided D-01) | Clean, client-only, no URL pollution, already used in codebase |
| Sheet animation | Custom CSS keyframes | Existing Framer Motion sheetTransition spring | Already configured: damping 28, stiffness 280, delay 0.1 for 'open' phase |
| Deferred DOM operation after render | setTimeout | requestAnimationFrame | RAF fires after paint, guarantees DOM is ready |

---

## Runtime State Inventory

This is not a rename/refactor/migration phase. Omitted.

---

## Common Pitfalls

### Pitfall 1: Auto-open fires when ?id=X is in URL

**What goes wrong:** If `setSheetPhase('open')` fires unconditionally on mount, it overrides the focusId effect's `setSheetPhase('sliding')`, leaving the sheet open and blocking the map when a venue is being focused.

**Why it happens:** Both effects run on mount. Without a guard, the auto-open effect always wins because React batches and applies state updates from all mount effects together — the last one called determines final state, and effect order matters.

**How to avoid:** `if (!focusId) setSheetPhase('open')` in the auto-open effect. `focusId` is derived from `useSearchParams()` synchronously on mount; its value is stable during this effect. [ASSUMED] — React 18 effect ordering is deterministic (declaration order) but batching means the safe approach is the conditional guard.

**Warning signs:** Map appears covered by open sheet immediately when navigating to `/?id=X`; auto-zoom doesn't execute because sheet is open (`gestureHandling === 'none'` blocks map interaction when `sheetPhase === 'open'`).

### Pitfall 2: Scroll position restores before list is rendered

**What goes wrong:** Setting `searchResultsRef.current.scrollTop` synchronously in the restore effect runs before React re-renders with the restored `searchOpen` state, so the container has zero height and the assignment is lost.

**Why it happens:** State setters (`setSearchOpen(true)`, etc.) are asynchronous — React schedules a re-render, but it hasn't happened yet when the rest of the same synchronous effect body runs.

**How to avoid:** Use `requestAnimationFrame(() => { container.scrollTop = s.scrollTop })` to defer the assignment until after the re-render paint.

**Warning signs:** Page scrolls to top even though sessionStorage key was found and parsed; scrollTop value is correct in console but container shows position 0.

### Pitfall 3: sessionStorage key not cleaned up

**What goes wrong:** If the key is not deleted after restore, every subsequent visit to Etusivu (including intentional fresh loads) will snap back to the previous scroll position.

**Why it happens:** sessionStorage persists for the tab's lifetime. Without cleanup, the key remains and triggers restore every mount.

**How to avoid:** Call `sessionStorage.removeItem('etusivu-scroll-state')` immediately after reading, before setting any state. D-04 mandates this.

**Warning signs:** User navigates directly to `/` (not via back button) and unexpectedly sees a filtered/scrolled list with the search overlay open.

### Pitfall 4: motion.div ref returns null during SSR

**What goes wrong:** `searchResultsRef.current` is null during the server render pass. Any code that dereferences it synchronously at module load will throw.

**Why it happens:** `useRef` starts as null; the DOM node is only attached after mount.

**How to avoid:** All ref access happens inside `useEffect` (mount) or event handlers — never at render time. This is already the correct pattern in the codebase (`onCompleteRef`, `pendingValittuRef` — all accessed inside effects or callbacks).

**Warning signs:** Build error or runtime null pointer in `handleCardClick` or restore effect.

### Pitfall 5: gestureHandling blocks map when sheet is closed at init

**What goes wrong:** The map's `gestureHandling` prop is `'none'` when `sheetPhase === 'open'` (line 473: `gestureHandling={sheetPhase === 'open' ? 'none' : 'greedy'}`). If the initial state is `'closed'` and the auto-open effect runs successfully, there's a brief frame where the sheet is 'open' and gestureHandling flips to 'none'. This is correct behavior — but if the sheet fails to open, the user would have a map locked with no sheet.

**Why it happens:** State machine intermediate state.

**How to avoid:** No special action needed — if the auto-open effect fires successfully (which it will on every mount with valid JS), the transition is imperceptibly fast (next tick). This is noted for awareness only.

---

## Code Examples

### Verified Patterns from Existing Codebase

**sessionStorage with try/catch (source: Etusivu.tsx lines 333-335, 350):**
```tsx
// [VERIFIED: codebase grep] — already in use for AI widget cache
try {
  const cached = sessionStorage.getItem(key)
  if (cached) { setAiTeksti(cached); return }
} catch {}
// ...
try { sessionStorage.setItem(key, d.text) } catch {}
```

**onClick stopPropagation inside Link (source: DiagonaalKortti.tsx lines 132-138):**
```tsx
// [VERIFIED: codebase] — HeartButton's "Näytä kartalla" button uses e.stopPropagation()
// to prevent the enclosing Link from also navigating:
<button
  onClick={e => { e.stopPropagation(); e.preventDefault(); onShowMap?.(paikka) }}
  ...
>
```

**focusId effect (source: Etusivu.tsx lines 359-366):**
```tsx
// [VERIFIED: codebase] — existing, no changes needed for NAV-02
useEffect(() => {
  if (!focusId) return
  const id = Number(focusId)
  const target = paikat.find(p => p.id === id)
  if (!target || target.latitude == null || target.longitude == null) return
  setAutoZoomTarget({ lat: target.latitude, lng: target.longitude })
  setSheetPhase('sliding')
}, [focusId, paikat])
```

**"Näytä kartalla" link in paikat/[id]/page.tsx (source: line 90-95):**
```tsx
// [VERIFIED: codebase] — already uses /?id=${paikka.id}, no change needed for NAV-02
<Link href={`/?id=${paikka.id}`} ...>
  Näytä kartalla →
</Link>
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `sheetPhase` init `'open'` | `sheetPhase` init `'closed'` + mount effect | Sheet enters via animation instead of being pre-rendered open |
| `href="/?nakyma=lista"` in NavPill | `href` removed entirely (link deleted) | Eliminates dead route reference |
| `href="/?nakyma=lista"` in SuosikitClient | `href="/"` | Back button reaches valid homepage |

**Deprecated/outdated in this codebase:**
- `/?nakyma=lista`: dead parameter since v1.1 refactor; not handled by any route or component in `app/page.tsx`. All 7 remaining occurrences in the codebase are stale references.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | React processes multiple `useEffect([], [])` in declaration order on mount | Common Pitfalls / Pitfall 1 | Low — React 18 docs confirm this; order matters for batched state, guard makes it irrelevant |
| A2 | `requestAnimationFrame` fires after React's synchronous state-update re-render paint | Common Pitfalls / Pitfall 2 | Medium — in React 18 concurrent mode rAF timing vs. commit phase is subtler; `useLayoutEffect` would be more deterministic but may cause SSR warnings for the scroll assignment |
| A3 | Framer Motion `motion.div` forwards ref to underlying DOM node (no special `forwardRef` needed from caller) | Architecture Patterns / Pattern 3 | Low — Framer Motion has forwarded refs to DOM since v4; the codebase is on v12 |

**If A2 is wrong:** Use `useLayoutEffect` for the scroll restore call (runs synchronously after DOM mutation before paint), guarded by `typeof window !== 'undefined'` to avoid SSR errors. The simpler `requestAnimationFrame` approach should work in practice for Next.js 14 App Router with standard rendering.

---

## Open Questions

1. **Should scroll restoration also handle `sheetPhase`?**
   - What we know: D-02 stores `searchOpen: true` and D-04 sets `setSearchOpen(true)`. The sheet state itself is not stored.
   - What's unclear: Should the sheet be `'open'` or `'sliding'` when returning to the list? If `searchOpen: true` is restored, the user sees the search overlay — which is the scrollable list view. The sheet being open or closed behind the overlay may not matter visually.
   - Recommendation: Do not store `sheetPhase` in sessionStorage. The auto-open effect (D-07) will set `sheetPhase('open')` normally on mount, and then `openSearch(false)` or the restored `searchOpen: true` state will do the right thing. No extra action needed.

2. **Is `requestAnimationFrame` sufficient for scroll restore timing or should `useLayoutEffect` be used?**
   - What we know: sessionStorage restore runs in `useEffect([], [])`. State updates batch and re-render. rAF fires after paint.
   - What's unclear: In React 18 concurrent mode with `Suspense`, the timing between `useEffect` completion and browser paint is less predictable than in legacy mode.
   - Recommendation: Use `requestAnimationFrame` as the primary approach (simpler, no SSR concern). If testing reveals the container scrollTop resets to 0 after the rAF fires (possible if a subsequent render overrides it), escalate to `useLayoutEffect` with an SSR guard. [ASSUMED]

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code/config changes within the existing codebase. No external tools, runtimes, databases, or CLI utilities beyond the existing Next.js dev server are required.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Not detected — no jest.config, vitest.config, or test directories found |
| Config file | none |
| Quick run command | `npm run build` (type-check + lint) |
| Full suite command | `npm run build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NAV-01 | Scroll + state restored when returning from profile page | manual | — | N/A |
| NAV-02 | "Näytä kartalla" focuses map, no GPS, sheet stays closed | manual | — | N/A |
| NAV-03 | Sheet starts closed, animates open on load | manual | — | N/A |
| NAV-04 | No Haku link in NavPill dropdown | manual-visual | — | N/A |
| NAV-05 | SuosikitClient back links go to `/` | manual + build | `npm run build` (type-check hrefs) | N/A |

### Sampling Rate

- **Per task commit:** `npm run build` — TypeScript type-check catches prop interface mismatches
- **Per wave merge:** `npm run build` + manual walkthrough in browser
- **Phase gate:** Build green + manual verification of all 5 NAV requirements

### Wave 0 Gaps

No automated test infrastructure needed — all validation is manual + type-check.

---

## Security Domain

This phase makes no changes to authentication, data persistence, API routes, or user input handling. The only storage used is sessionStorage (client-only, tab-scoped, no server involvement). No ASVS categories apply.

The sessionStorage key `'etusivu-scroll-state'` stores only UI state (scroll position + filter selections) — no PII, no credentials. Clearing the key on read (D-04) prevents accumulation.

---

## Sources

### Primary (HIGH confidence)

- Codebase: `app/components/Etusivu.tsx` — sheetPhase state machine, focusId effect, sessionStorage pattern, search state variables, motion.div search-results container
- Codebase: `app/components/DiagonaalKortti.tsx` — Link structure, onShowMap prop pattern, HeartButton onClick stopPropagation precedent
- Codebase: `app/components/NavPill.tsx` — "Haku" link location (line 57-60)
- Codebase: `app/suosikit/SuosikitClient.tsx` — 3× `href="/?nakyma=lista"` at lines 73, 104, 134
- Codebase: `app/paikat/[id]/page.tsx` — "Näytä kartalla" link (line 90-95) — confirmed already correct
- `.planning/phases/20-navigaatio-korjaukset/20-CONTEXT.md` — all locked decisions D-01 through D-10

### Secondary (MEDIUM confidence)

- `package.json` — confirmed Next.js 14.2.35, React ^18, framer-motion ^12.38.0

### Tertiary (LOW confidence)

- None — all claims are grounded in direct codebase inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all changes use existing dependencies, confirmed in package.json
- Architecture: HIGH — direct codebase inspection; all integration points verified by reading source
- Pitfalls: MEDIUM/HIGH — pitfalls 1, 3, 4 verified by reading code; pitfall 2 has [ASSUMED] timing claim
- NAV-02 status: HIGH — "Näytä kartalla" link and focusId effect both verified correct, no change required

**Research date:** 2026-05-30
**Valid until:** 2026-06-30 (stable stack; no external dependencies)
