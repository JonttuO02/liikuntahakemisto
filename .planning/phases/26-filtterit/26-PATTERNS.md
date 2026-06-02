# Phase 26: Filtterit - Pattern Map

**Mapped:** 2026-06-02
**Files analyzed:** 3 (Etusivu.tsx, lib/lajit.ts, lib/cityFilter.ts)
**Analogs found:** 3 / 3

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/components/Etusivu.tsx` | component (blast-radius) | event-driven, CRUD | `app/components/Etusivu.tsx` itself (existing code) | exact — in-place refactor |
| `lib/lajit.ts` | config/utility | transform | `lib/lajit.ts` itself | exact — read-only, no changes needed |
| `lib/cityFilter.ts` | utility | transform | `lib/cityFilter.ts` itself | exact — read-only, no changes needed |

---

## Pattern Assignments

### `app/components/Etusivu.tsx` — Filter state declarations (lines 253–256)

These four lines are the **current filter state**. D-08 removes `searchKertakaynti` and `searchAukinyt` entirely. D-09 changes `searchLaji` from `string` to `string[]`.

**Current state to replace** (lines 253–256):
```tsx
const [searchLaji, setSearchLaji]           = useState('Kaikki')
const [searchAukinyt, setSearchAukinyt]     = useState(false)
const [searchKertakaynti, setSearchKertakaynti] = useState(false)
const [searchKaupunki, setSearchKaupunki]   = useState('Kaikki')
```

**Replace with** (D-05, D-08, D-09):
```tsx
const [searchLaji, setSearchLaji]           = useState<string[]>([])
const [searchKaupunki, setSearchKaupunki]   = useState('Kaikki')
```

---

### `app/components/Etusivu.tsx` — handleCardClick / sessionStorage save (lines 337–351)

**Current save pattern** (lines 337–351):
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

**Replace with** (D-10: add `_v: 2`, D-08: remove kertakaynti/aukinyt, D-09: searchLaji is now string[]):
```tsx
function handleCardClick() {
  try {
    const scrollTop = searchResultsRef.current?.scrollTop ?? 0
    const state = {
      _v: 2,
      scrollTop,
      searchHaku,
      searchLaji,       // string[]
      searchKaupunki,
      searchOpen: true,
    }
    sessionStorage.setItem('etusivu-scroll-state', JSON.stringify(state))
  } catch {}
}
```

---

### `app/components/Etusivu.tsx` — sessionStorage restore (lines 444–473)

**Current restore pattern** (lines 444–473):
```tsx
useEffect(() => {
  try {
    const raw = sessionStorage.getItem('etusivu-scroll-state')
    if (!raw) return
    sessionStorage.removeItem('etusivu-scroll-state')
    if (focusId) return
    const s = JSON.parse(raw)
    if (typeof s !== 'object' || s === null) return
    if (typeof s.searchHaku === 'string') setSearchHaku(s.searchHaku)
    if (typeof s.searchLaji === 'string') setSearchLaji(s.searchLaji)
    if (typeof s.searchKertakaynti === 'boolean') setSearchKertakaynti(s.searchKertakaynti)
    if (typeof s.searchAukinyt === 'boolean') setSearchAukinyt(s.searchAukinyt)
    if (typeof s.searchKaupunki === 'string') setSearchKaupunki(s.searchKaupunki)
    if (s.searchOpen === true) {
      suppressAutoOpenRef.current = true
      setSheetVisible(true)
      setSearchOpen(true)
    }
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
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

**Replace with** (D-11: reject `_v !== 2`; D-12/D-13: searchLaji as `string[]`; D-08: remove kertakaynti/aukinyt lines):
```tsx
useEffect(() => {
  try {
    const raw = sessionStorage.getItem('etusivu-scroll-state')
    if (!raw) return
    sessionStorage.removeItem('etusivu-scroll-state')
    if (focusId) return
    const s = JSON.parse(raw)
    if (typeof s !== 'object' || s === null) return
    // D-11: if version mismatch, discard entire state — prevents dead filters from old sessions
    if (s._v !== 2) return
    if (typeof s.searchHaku === 'string') setSearchHaku(s.searchHaku)
    if (Array.isArray(s.searchLaji)) setSearchLaji(s.searchLaji)
    if (typeof s.searchKaupunki === 'string') setSearchKaupunki(s.searchKaupunki)
    if (s.searchOpen === true) {
      suppressAutoOpenRef.current = true
      setSheetVisible(true)
      setSearchOpen(true)
    }
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
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

---

### `app/components/Etusivu.tsx` — searchSuodatettu filter logic (lines 673–684)

**Current filter logic** (lines 673–684):
```tsx
const searchSuodatettu = useMemo(() =>
  paikat.filter(p => {
    const matchesLaji        = searchLaji === 'Kaikki' || p.laji.toLowerCase() === searchLaji.toLowerCase()
    const q                  = searchHaku.toLowerCase()
    const matchesHaku        = !searchHaku || p.nimi.toLowerCase().includes(q) || p.kuvaus?.toLowerCase().includes(q) || p.osoite?.toLowerCase().includes(q)
    const matchesKertakaynti = !searchKertakaynti || !isMembershipOnly(p)
    const matchesAuki        = !searchAukinyt || getOpenStatus(p.aukioloajat).status !== 'closed'
    const matchesKaupunki    = searchKaupunki === 'Kaikki' || p.kaupunki === searchKaupunki
    return matchesLaji && matchesHaku && matchesKertakaynti && matchesAuki && matchesKaupunki
  }),
  [paikat, searchLaji, searchHaku, searchKertakaynti, searchAukinyt, searchKaupunki]
)
```

**Replace with** (D-06: multi-select laji; D-08: remove kertakaynti/aukinyt):
```tsx
const searchSuodatettu = useMemo(() =>
  paikat.filter(p => {
    const matchesLaji     = searchLaji.length === 0 || searchLaji.includes(p.laji.toLowerCase())
    const q               = searchHaku.toLowerCase()
    const matchesHaku     = !searchHaku || p.nimi.toLowerCase().includes(q) || p.kuvaus?.toLowerCase().includes(q) || p.osoite?.toLowerCase().includes(q)
    const matchesKaupunki = searchKaupunki === 'Kaikki' || p.kaupunki === searchKaupunki
    return matchesLaji && matchesHaku && matchesKaupunki
  }),
  [paikat, searchLaji, searchHaku, searchKaupunki]
)
```

---

### `app/components/Etusivu.tsx` — isFilterActive (line 686)

**Current** (line 686):
```tsx
const isFilterActive = searchLaji !== 'Kaikki' || searchKertakaynti || searchAukinyt || searchKaupunki !== 'Kaikki'
```

**Replace with** (D-07):
```tsx
const isFilterActive = searchLaji.length > 0 || searchKaupunki !== 'Kaikki'
```

---

### `app/components/Etusivu.tsx` — "Tyhjennä haku" reset button (lines 1382–1388)

**Current reset** (lines 1382–1388):
```tsx
onClick={() => {
  setSearchHaku('')
  setSearchLaji('Kaikki')
  setSearchKertakaynti(false)
  setSearchAukinyt(false)
  setSearchKaupunki('Kaikki')
}}
```

**Replace with** (D-08/D-09):
```tsx
onClick={() => {
  setSearchHaku('')
  setSearchLaji([])
  setSearchKaupunki('Kaikki')
}}
```

---

### `app/components/Etusivu.tsx` — Filter row JSX (lines 1318–1357) — full replacement

**Current filter row** (lines 1318–1357):
```tsx
<div className="flex items-center gap-2 flex-wrap mb-3">
  {kaupungit.length > 2 && (
    <select
      value={searchKaupunki}
      onChange={e => setSearchKaupunki(e.target.value)}
      aria-label="Suodata kaupungin mukaan"
      className="glass h-8 rounded-full px-3 text-xs font-bold text-[#111111] border-0 outline-none cursor-pointer"
    >
      {kaupungit.map(k => <option key={k} value={k}>{k}</option>)}
    </select>
  )}
  <select
    value={searchLaji}
    onChange={e => setSearchLaji(e.target.value)}
    aria-label="Suodata lajin mukaan"
    className="glass h-8 rounded-full px-3 text-xs font-bold text-[#111111] border-0 outline-none cursor-pointer"
  >
    {LAJIT_FILTTERI.map(l => <option key={l} value={l}>{l}</option>)}
  </select>
  <motion.button
    onClick={() => setSearchKertakaynti(v => !v)}
    whileTap={{ scale: 0.96, transition: { duration: 0.1 } }}
    className={`h-8 px-3 rounded-full text-xs font-bold [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)] ${searchKertakaynti ? 'bg-[#111111] text-white' : 'glass text-[rgba(17,17,17,0.45)] hover:text-[#111111]'}`}
    aria-label={searchKertakaynti ? 'Poista kertakäynti-suodatin' : 'Näytä vain kertakäynnin mahdollistavat paikat'}
  >
    Kertakäynti OK
  </motion.button>
  <motion.button
    onClick={() => setSearchAukinyt(v => !v)}
    whileTap={{ scale: 0.96, transition: { duration: 0.1 } }}
    className={`h-8 px-3 rounded-full text-xs font-bold [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)]
      ${searchAukinyt ? 'bg-[#111111] text-white' : 'glass text-[rgba(17,17,17,0.6)] hover:text-[#111111]'}`}
  >
    Auki nyt
  </motion.button>
  <span className="text-xs text-[rgba(17,17,17,0.4)] tabular-nums ml-auto">
    {searchSuodatettu.length} paikkaa
  </span>
</div>
```

**Replace with** two carousel pills — pattern below.

---

## Shared Patterns

### Carousel pattern (ambient setInterval + AnimatePresence opacity crossfade)

**Source:** `app/components/Etusivu.tsx` lines 141–144 (CalloutCard `useEffect`) + lines 183–213 (AnimatePresence render)

This is the canonical interval+crossfade blueprint for the new filter pills. The new pills differ only in what they display and what happens on tap.

**Interval pattern** (from CalloutCard, lines 141–144):
```tsx
useEffect(() => {
  const id = setInterval(() => setShowName(v => !v), 2000)
  return () => clearInterval(id)
}, [])
```

**Generalized carousel state for a pill** (from CONTEXT.md §Established Patterns):
```tsx
const [idx, setIdx] = useState(0)
useEffect(() => {
  // Pause when exactly 1 item selected (D-03)
  if (selected.length === 1) return
  const items = selected.length > 1 ? selected : allItems
  const id = setInterval(() => setIdx(i => (i + 1) % items.length), 2000)
  return () => clearInterval(id)
}, [selected.length, allItems.length])
```

**AnimatePresence crossfade render** (from CalloutCard, lines 183–213):
```tsx
<AnimatePresence mode="wait">
  {showName ? (
    <motion.div
      key="name"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* content A */}
    </motion.div>
  ) : (
    <motion.div
      key="sport"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* content B */}
    </motion.div>
  )}
</AnimatePresence>
```

**For the filter pill carousel**, use `key={idx}` (not a boolean toggle):
```tsx
<AnimatePresence mode="wait">
  <motion.span
    key={idx}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    className="pointer-events-none"
  >
    {displayItems[idx % displayItems.length]}
  </motion.span>
</AnimatePresence>
```

---

### Pill active/inactive styling

**Source:** `app/components/Etusivu.tsx` lines 1338–1353 (existing filter buttons)

Active state: `bg-[#111111] text-white`
Inactive state: `glass text-[rgba(17,17,17,0.45)] hover:text-[#111111]`
Tap feedback: `whileTap={{ scale: 0.96, transition: { duration: 0.1 } }}`
Transition: `[transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)]`
Height/padding: `h-8 px-3 rounded-full text-xs font-bold`

For **selected chip** inside the expanded dropdown list (D-04):
- Selected chip: `bg-[#111111] text-white rounded-full px-3 py-1 text-xs font-bold`
- Unselected chip: `glass rounded-full px-3 py-1 text-xs font-bold text-[rgba(17,17,17,0.45)]`

---

### glass utility

**Source:** `app/globals.css` lines 26–36

Always apply `.glass` via the CSS class — never replicate inline. The pill shape is `glass rounded-full`.

---

### LAJIT_FILTTERI — data source for laji carousel

**Source:** `lib/lajit.ts` line 33

```ts
export const LAJIT_FILTTERI = ['Kaikki', 'Padel', 'Tennis', 'Jooga', 'Kuntosali', 'Uinti', 'Kiipeily', 'Jääkiekko', 'Liikuntahalli']
```

For the carousel ambient mode (0 selections): use `LAJIT_FILTTERI.filter(l => l !== 'Kaikki')` — 8 items cycling every 2 s.

---

### deriveKaupungit — data source for kaupunki carousel

**Source:** `lib/cityFilter.ts` lines 12–31

```ts
export function deriveKaupungit(
  paikat: Array<Pick<Liikuntapaikka, 'kaupunki'>>
): string[] {
  // returns ['Kaikki', ...sorted unique cities]
}
```

For the carousel ambient mode: `deriveKaupungit(paikat).filter(k => k !== 'Kaikki')`.
Guard: only render kaupunki pill when `kaupungit.length > 2` (existing threshold at line 1320 — preserve this).

---

### Framer Motion imports already present

**Source:** `app/components/Etusivu.tsx` line 6

```tsx
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
```

No new imports needed for the carousel pills — `motion` and `AnimatePresence` are already imported.

---

## No Analog Found

None. All new patterns have direct analogs in the existing codebase.

---

## Metadata

**Analog search scope:** `app/components/Etusivu.tsx`, `app/components/Karuselli.tsx`, `lib/lajit.ts`, `lib/cityFilter.ts`, `app/globals.css`
**Files scanned:** 5
**Pattern extraction date:** 2026-06-02
