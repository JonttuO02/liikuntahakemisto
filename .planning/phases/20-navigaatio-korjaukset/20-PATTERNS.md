# Phase 20: Navigaatio-korjaukset - Pattern Map

**Mapped:** 2026-05-30
**Files analyzed:** 4 (modified only — no new files)
**Analogs found:** 4 / 4 (all files are self-analogs; patterns extracted from the files being modified)

---

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/components/Etusivu.tsx` | component (page shell) | event-driven + request-response | `app/components/Etusivu.tsx` itself (self-analog) | exact |
| `app/components/DiagonaalKortti.tsx` | component (card) | event-driven | `app/components/DiagonaalKortti.tsx` itself (self-analog, existing `onShowMap` prop pattern) | exact |
| `app/components/NavPill.tsx` | component (nav) | event-driven | `app/components/NavPill.tsx` itself | exact |
| `app/suosikit/SuosikitClient.tsx` | component (page client) | request-response | `app/suosikit/SuosikitClient.tsx` itself | exact |

---

## Pattern Assignments

### `app/components/Etusivu.tsx` — NAV-01 + NAV-03

**Change 1 (NAV-03): Change `sheetPhase` initial state from `'open'` to `'closed'`**

Current line 167:
```tsx
const [sheetPhase, setSheetPhase] = useState<'open' | 'sliding' | 'closed'>('open')
```
Change to:
```tsx
const [sheetPhase, setSheetPhase] = useState<'open' | 'sliding' | 'closed'>('closed')
```

**Change 2 (NAV-03): Add auto-open mount effect — insert BEFORE the existing focusId effect (line 359)**

Pattern source — existing focusId effect (lines 359–366) shows the `useEffect([], [...])` form; existing `openSearch` function (lines 229–236) shows `setSheetPhase('sliding')`:
```tsx
// Existing focusId effect (lines 359-366) — INSERT NEW EFFECT BEFORE THIS:
useEffect(() => {
  if (!focusId) return
  const id = Number(focusId)
  const target = paikat.find(p => p.id === id)
  if (!target || target.latitude == null || target.longitude == null) return
  setAutoZoomTarget({ lat: target.latitude, lng: target.longitude })
  setSheetPhase('sliding')
}, [focusId, paikat]) // eslint-disable-line react-hooks/exhaustive-deps
```

New effect to insert immediately before the focusId effect:
```tsx
// NAV-03: auto-open — starts 'closed', opens on mount unless ?id=X is present
useEffect(() => {
  if (!focusId) setSheetPhase('open')
}, []) // eslint-disable-line react-hooks/exhaustive-deps
```

**Change 3 (NAV-01): Add `searchResultsRef` and `handleCardClick` — insert after existing refs block (lines 188–195)**

Pattern source — existing `useRef` usage at lines 188–191 (`inFlight`, `debounceRef`, `pendingValittuRef`, `zoomRef`):
```tsx
// Existing refs (lines 188-191) — ADD searchResultsRef after these:
const inFlight = useRef<Set<number>>(new Set())
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
const pendingValittuRef = useRef<Liikuntapaikka | null>(null)
const zoomRef = useRef(14)
```

Add immediately after the existing refs:
```tsx
const searchResultsRef = useRef<HTMLDivElement>(null)
```

**Change 4 (NAV-01): Add `handleCardClick` function — insert after `openSearch` function (lines 229–236)**

Pattern source — existing sessionStorage pattern (lines 332–335 and 350):
```tsx
// Existing sessionStorage try/catch pattern (lines 332-335, 350):
try {
  const cached = sessionStorage.getItem(key)
  if (cached) { setAiTeksti(cached); return }
} catch {}
// ...
try { sessionStorage.setItem(key, d.text) } catch {}
```

New `handleCardClick` function to add after `openSearch`:
```tsx
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
```

**Change 5 (NAV-01): Add sessionStorage restore effect — insert as the FIRST `useEffect` in the component**

Pattern source — same sessionStorage try/catch idiom (lines 332–335), same `useEffect([], [])` mount-only form used throughout Etusivu:
```tsx
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

**Change 6 (NAV-01): Add `ref` prop to the search-results `motion.div` (line 920)**

Pattern source — Framer Motion forwards refs to underlying DOM; `motion.div` accepts `ref` natively (confirmed by existing `MapAutoZoom` ref forwarding at line 74):
```tsx
// Current motion.div (lines 920-934) — add ref prop:
<motion.div
  key="search-results"
  ref={searchResultsRef}   // ADD THIS LINE
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2 }}
  className="fixed overflow-y-auto"
  style={{ ... }}
>
```

**Change 7 (NAV-01): Pass `onCardClick` prop to `<DiagonaalKortti>` (lines 981–992)**

Pattern source — existing `onShowMap` prop usage at lines 981–991 shows how Etusivu passes lambdas into DiagonaalKortti:
```tsx
// Current DiagonaalKortti usage (lines 981-991):
<DiagonaalKortti
  key={p.id}
  paikka={p}
  distanceStr={distancesMap[p.id] != null ? formatDistance(distancesMap[p.id]) : undefined}
  onShowMap={(paikka) => {
    setSearchOpen(false)
    if (paikka.latitude != null && paikka.longitude != null) {
      setAutoZoomTarget({ lat: paikka.latitude, lng: paikka.longitude })
    }
  }}
/>
```

Updated usage — add `onCardClick`:
```tsx
<DiagonaalKortti
  key={p.id}
  paikka={p}
  distanceStr={distancesMap[p.id] != null ? formatDistance(distancesMap[p.id]) : undefined}
  onShowMap={(paikka) => {
    setSearchOpen(false)
    if (paikka.latitude != null && paikka.longitude != null) {
      setAutoZoomTarget({ lat: paikka.latitude, lng: paikka.longitude })
    }
  }}
  onCardClick={handleCardClick}
/>
```

---

### `app/components/DiagonaalKortti.tsx` — NAV-01

**Change 1: Extend props interface (line 34–38)**

Current interface (lines 34–38):
```tsx
interface DiagonaalKorttiProps {
  paikka: Liikuntapaikka
  distanceStr?: string
  onShowMap?: (paikka: Liikuntapaikka) => void
}
```

Updated interface — add `onCardClick`:
```tsx
interface DiagonaalKorttiProps {
  paikka: Liikuntapaikka
  distanceStr?: string
  onShowMap?: (paikka: Liikuntapaikka) => void
  onCardClick?: () => void
}
```

**Change 2: Destructure new prop in function signature (line 40)**

Current (line 40):
```tsx
export default function DiagonaalKortti({ paikka, distanceStr, onShowMap }: DiagonaalKorttiProps) {
```

Updated:
```tsx
export default function DiagonaalKortti({ paikka, distanceStr, onShowMap, onCardClick }: DiagonaalKorttiProps) {
```

**Change 3: Add `onClick` to the `<Link>` element (line 57)**

Pattern source — existing `onShowMap` button at lines 132–139 shows `e.stopPropagation()` + `e.preventDefault()` inside a child button within the same Link scope. The `<Link>` itself (line 57) wraps the entire card and fires before navigation:

```tsx
// Current Link (line 57):
<Link href={`/paikat/${paikka.id}`} className="absolute inset-0 block">
```

Updated — add onClick:
```tsx
<Link
  href={`/paikat/${paikka.id}`}
  className="absolute inset-0 block"
  onClick={() => onCardClick?.()}
>
```

Note: `onCardClick` fires synchronously before Next.js initiates the navigation, which is what allows sessionStorage to be written before the route changes. No `preventDefault` is needed — navigation should proceed normally.

---

### `app/components/NavPill.tsx` — NAV-04

**Change: Delete the "Haku" `<Link>` block (lines 57–60)**

Current block to remove (lines 57–60):
```tsx
<Link href="/?nakyma=lista" onClick={() => setOpen(false)} className={BTN}>
  <Search className="w-3.5 h-3.5" />
  Haku
</Link>
```

After deletion, the expanded content will contain: Profiili + Suosikit + Kirjaudu (sisään / ulos). The `Search` icon import at line 6 can be removed if it is not used elsewhere in the file:
```tsx
// Line 6 — remove Search from import if unused after deletion:
import { Search, Heart, User, LogOut, MoreHorizontal, X } from 'lucide-react'
// becomes:
import { Heart, User, LogOut, MoreHorizontal, X } from 'lucide-react'
```

---

### `app/suosikit/SuosikitClient.tsx` — NAV-05

**Change: Replace 3 occurrences of `href="/?nakyma=lista"` with `href="/"`**

Occurrence 1 — line 73 (unauthenticated state "Takaisin hakemistoon"):
```tsx
// Current:
<Link
  href="/?nakyma=lista"
  className="mt-4 text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)] underline underline-offset-2"
>
  Takaisin hakemistoon
</Link>

// Updated:
<Link
  href="/"
  className="mt-4 text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)] underline underline-offset-2"
>
  Takaisin hakemistoon
</Link>
```

Occurrence 2 — line 103 (empty-state "Selaa hakemistoa"):
```tsx
// Current:
<Link
  href="/?nakyma=lista"
  className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-6 py-2.5 rounded-full [transition:background-color_150ms_var(--ease-out)]"
>
  Selaa hakemistoa
</Link>

// Updated:
<Link
  href="/"
  className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-6 py-2.5 rounded-full [transition:background-color_150ms_var(--ease-out)]"
>
  Selaa hakemistoa
</Link>
```

Occurrence 3 — line 133 (authenticated-state "Takaisin hakemistoon"):
```tsx
// Current:
<Link
  href="/?nakyma=lista"
  className="mt-8 inline-block text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)] underline underline-offset-2"
>
  Takaisin hakemistoon
</Link>

// Updated:
<Link
  href="/"
  className="mt-8 inline-block text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)] underline underline-offset-2"
>
  Takaisin hakemistoon
</Link>
```

---

## Shared Patterns

### sessionStorage try/catch
**Source:** `app/components/Etusivu.tsx` lines 332–335 and 350
**Apply to:** `handleCardClick` (write side) and mount restore effect (read side) in Etusivu.tsx
```tsx
// Write pattern:
try { sessionStorage.setItem(key, value) } catch {}

// Read pattern:
try {
  const raw = sessionStorage.getItem(key)
  if (!raw) return
  // ... use value
} catch {}
```

### `useEffect([], [])` mount-only hooks
**Source:** `app/components/Etusivu.tsx` — multiple instances (window resize, weather fetch, AI widget)
**Apply to:** NAV-01 restore effect + NAV-03 auto-open effect in Etusivu.tsx
```tsx
useEffect(() => {
  // runs once on mount
}, []) // eslint-disable-line react-hooks/exhaustive-deps
```
The `eslint-disable-line` comment is established project convention for intentional mount-only effects.

### Optional callback prop (nullish-safe call)
**Source:** `app/components/DiagonaalKortti.tsx` line 134 — `onShowMap?.(paikka)`
**Apply to:** `onCardClick?.()` in the Link onClick handler
```tsx
// Existing pattern:
onClick={e => { e.stopPropagation(); e.preventDefault(); onShowMap?.(paikka) }}

// New pattern follows the same nullish-safe optional-chain form:
onClick={() => onCardClick?.()}
```

### `requestAnimationFrame` for post-render DOM writes
**Source:** `app/components/Etusivu.tsx` `MapAutoZoom` component (lines 91–99) — uses `requestAnimationFrame` step loop for DOM mutations
**Apply to:** scroll restore in NAV-01 mount effect
```tsx
requestAnimationFrame(() => {
  if (searchResultsRef.current) {
    searchResultsRef.current.scrollTop = s.scrollTop
  }
})
```

---

## No Analog Found

No files in this phase lack an analog. All changes are modifications to existing files whose internal patterns directly inform the new code.

---

## NAV-02 Confirmation (no changes)

`app/paikat/[id]/page.tsx` line 91–95 already contains:
```tsx
<Link href={`/?id=${paikka.id}`} ...>
  Näytä kartalla →
</Link>
```
And `app/components/Etusivu.tsx` lines 359–366 already handle `?id=X` by calling `setAutoZoomTarget` + `setSheetPhase('sliding')` (not 'open'). No code changes are required for NAV-02.

---

## Effect Declaration Order in Etusivu.tsx (critical)

The two new NAV-01/NAV-03 effects must be placed in this order relative to existing effects:

1. **[NEW — NAV-01]** sessionStorage restore effect — `useEffect([], [])` — reads and clears `'etusivu-scroll-state'`, restores all search states
2. **[EXISTING]** window resize effect — `useEffect([], [])` at line 309
3. **[EXISTING]** weather fetch effect — `useEffect([], [])` at line 316
4. **[EXISTING]** AI widget effect — `useEffect([suosikitSizeAndIds, ...], [...])` at line 328
5. **[NEW — NAV-03]** auto-open effect — `useEffect([], [])` — `if (!focusId) setSheetPhase('open')`
6. **[EXISTING]** focusId effect — `useEffect([focusId, paikat], [...])` at line 359 — handles `?id=X` case

The NAV-03 auto-open effect (5) MUST be placed before the focusId effect (6). The `if (!focusId)` guard makes effect ordering safe regardless of React's batching behavior.

---

## Metadata

**Analog search scope:** `app/components/`, `app/suosikit/`
**Files read:** 4 source files + CONTEXT.md + RESEARCH.md
**Pattern extraction date:** 2026-05-30
