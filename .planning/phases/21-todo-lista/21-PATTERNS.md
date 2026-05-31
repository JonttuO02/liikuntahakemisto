# Phase 21: TO DO -lista - Pattern Map

**Mapped:** 2026-05-31
**Files analyzed:** 8 (7 in-place edits + 1 rename/rewrite)
**Analogs found:** 8 / 8

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/components/BookmarkButton.tsx` | component (client) | CRUD + optimistic | `app/components/HeartButton.tsx` | exact — same file, rename |
| `app/suosikit/SuosikitClient.tsx` | component (client) | CRUD + optimistic delete | `app/suosikit/SuosikitClient.tsx` (current) + `app/components/Etusivu.tsx` toggleSuosikki | role-match + pattern-borrow |
| `app/components/PaikkaSheet.tsx` | component (client) | request-response (sheet panel) | self — props rename only | exact |
| `app/components/NavPill.tsx` | component (client) | event-driven (auth state) | self — icon + label swap | exact |
| `app/components/NavBar.tsx` | component (client) | event-driven (auth state) | self — icon + label swap | exact |
| `app/components/Etusivu.tsx` | component (client) | CRUD + optimistic + streaming | self — var renames + prop updates | exact |
| `app/paikat/[id]/page.tsx` | page (server) | request-response | self — import rename | exact |
| `app/components/BottomNav.tsx` | component (dead file) | — | self — icon swap | exact |

---

## Pattern Assignments

### `app/components/BookmarkButton.tsx` (new file — rename of HeartButton.tsx)

**Analog:** `app/components/HeartButton.tsx` (the source file itself)

**Imports pattern** (HeartButton.tsx lines 1–8):
```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'           // → replace with: import { Bookmark, BookmarkCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createBrowserSupabase, subscribeToAuthUser } from '@/lib/supabaseSSR'
import AuthModal from './AuthModal'
```

**Props interface** (HeartButton.tsx lines 10–12):
```typescript
interface HeartButtonProps {     // → BookmarkButtonProps
  paikkaId: number
}
```

**Auth + optimistic toggle pattern** (HeartButton.tsx lines 32–63 — copy verbatim, update state name and log prefix):
```typescript
async function toggle() {
  const user = currentUser.current
  if (!user) {
    setAuthModalOpen(true)
    return
  }

  const supabase = createBrowserSupabase()
  const wasSaved = isSuosikki            // → wasSaved = isTodo
  // Optimistic update
  setIsSuosikki(!wasSaved)              // → setIsTodo(!wasSaved)

  if (wasSaved) {
    const { error } = await supabase
      .from('suosikit')
      .delete()
      .eq('user_id', user.id)
      .eq('paikka_id', paikkaId)
    if (error) {
      console.error('[HeartButton] delete error:', error)   // → '[BookmarkButton]'
      setIsSuosikki(wasSaved)                              // → setIsTodo(wasSaved)
    }
  } else {
    const { error } = await supabase
      .from('suosikit')
      .insert({ user_id: user.id, paikka_id: paikkaId })
    if (error) {
      console.error('[HeartButton] insert error:', error)  // → '[BookmarkButton]'
      setIsSuosikki(wasSaved)                             // → setIsTodo(wasSaved)
    }
  }
}
```

**Button render pattern** (HeartButton.tsx lines 67–73 — update icon and aria-labels):
```typescript
<motion.button
  whileTap={{ scale: 0.85, transition: { duration: 0.12, ease: 'easeOut' } }}
  onClick={toggle}
  className="glass-btn w-10 h-10 rounded-full flex items-center justify-center shrink-0"
  aria-label={isSuosikki ? 'Poista suosikeista' : 'Lisää suosikkeihin'}
  //         ↑ replace: isTodo ? 'Poista TO DO -listalta' : 'Lisää TO DO -listalle'
>
  <Heart className={cn('w-5 h-5', isSuosikki ? 'fill-[#111111] text-[#111111]' : 'text-[rgba(17,17,17,0.35)]')} />
  {/* Replace Heart with:
    {isTodo
      ? <BookmarkCheck className={cn('w-5 h-5 fill-[#111111] text-[#111111]')} />
      : <Bookmark className={cn('w-5 h-5 text-[rgba(17,17,17,0.35)]')} />
    }
  */}
</motion.button>
```

**AuthModal onSuccess pattern** (HeartButton.tsx lines 78–87 — copy verbatim):
```typescript
onSuccess={async () => {
  setAuthModalOpen(false)
  const supabase = createBrowserSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { error } = await supabase.from('suosikit').insert({ user_id: user.id, paikka_id: paikkaId })
    if (!error) setIsSuosikki(true)   // → setIsTodo(true)
  }
}}
```

---

### `app/suosikit/SuosikitClient.tsx` (full replacement)

**Analog (data fetch + auth state machine):** `app/suosikit/SuosikitClient.tsx` (current, lines 1–52)

**Imports pattern** (current SuosikitClient.tsx lines 1–8 — update icons, add motion and DiagonaalKortti):
```typescript
'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'    // → import { Bookmark, BookmarkCheck } from 'lucide-react'
import Link from 'next/link'
import AuthModal from '@/app/components/AuthModal'
import { createBrowserSupabase, subscribeToAuthUser } from '@/lib/supabaseSSR'
import type { Liikuntapaikka } from '@/lib/types'
// Add:
// import { motion } from 'framer-motion'
// import DiagonaalKortti from '@/app/components/DiagonaalKortti'
```

**Auth state machine + data fetch** (current SuosikitClient.tsx lines 10–52 — copy verbatim, add userId capture):
```typescript
type AuthState = 'loading' | 'unauthenticated' | 'authenticated'
type SuosikkiRow = { liikuntapaikat: Liikuntapaikka | null }

export default function SuosikitClient() {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [paikat, setPaikat] = useState<Liikuntapaikka[]>([])
  const [favLoading, setFavLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)    // ADD: needed for removeTodo

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
      if (cancelled) return
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
        setUserId(user.id)            // ADD: capture userId for removeTodo
        loadFavorites(user.id)
      } else {
        setAuthState('unauthenticated')
        setUserId(null)               // ADD
        setPaikat([])
      }
    })

    return () => { cancelled = true; unsub() }
  }, [])
```

**Optimistic delete pattern** (analog: Etusivu.tsx lines 255–293 — simplified to delete-only):
```typescript
  async function removeTodo(paikkaId: number) {
    if (!userId) return                    // guard: Pitfall 4 from RESEARCH.md
    const previous = paikat
    // Optimistic remove
    setPaikat(prev => prev.filter(p => p.id !== paikkaId))

    const supabase = createBrowserSupabase()
    const { error } = await supabase
      .from('suosikit')
      .delete()
      .eq('user_id', userId)
      .eq('paikka_id', paikkaId)

    if (error) {
      console.error('[SuosikitClient] delete error:', error)
      setPaikat(previous)                  // rollback
    }
  }
```

**Unauthenticated empty state** (current SuosikitClient.tsx lines 59–89 — update icon and text):
```typescript
  if (authState === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 pb-16">
        <div className="glass w-16 h-16 rounded-2xl flex items-center justify-center mb-5">
          <Heart className="w-7 h-7 text-[rgba(17,17,17,0.35)]" />
          {/* → <Bookmark className="w-7 h-7 text-[rgba(17,17,17,0.35)]" /> */}
        </div>
        <h1 className="font-serif text-2xl font-bold text-[#111111] mb-2 text-center">
          Suosikit vaativat kirjautumisen
          {/* → TO DO -lista vaatii kirjautumisen */}
        </h1>
        <p className="text-[rgba(17,17,17,0.45)] text-center mb-8 max-w-xs text-sm">
          Tallenna liikuntapaikkoja suosikeiksi ja löydä ne helposti uudelleen.
          {/* → Tallenna liikuntapaikkoja TO DO -listallesi. */}
        </p>
        <button
          onClick={() => setAuthModalOpen(true)}
          className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-6 py-2.5 rounded-full [transition:background-color_150ms_var(--ease-out)]"
        >
          Kirjaudu sisään
        </button>
        {/* Keep: Takaisin-link + AuthModal */}
```

**Authenticated empty state** (current SuosikitClient.tsx lines 96–116 — update icon and text):
```typescript
  if (paikat.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 pb-16">
        <div className="glass w-16 h-16 rounded-2xl flex items-center justify-center mb-5">
          <Heart className="w-7 h-7 text-[rgba(17,17,17,0.35)]" />
          {/* → <Bookmark className="w-7 h-7 text-[rgba(17,17,17,0.35)]" /> */}
        </div>
        <h1 className="font-serif text-2xl font-bold text-[#111111] mb-2 text-center">
          Ei vielä suosikkeja
          {/* → Ei vielä TO DO -paikkoja */}
        </h1>
        <p className="text-[rgba(17,17,17,0.45)] text-center mb-8 max-w-xs text-sm">
          Selaa hakemistoa ja lisää sydämellä.
          {/* → Selaa hakemistoa ja lisää kirjanmerkillä. */}
        </p>
        <Link href="/" className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-6 py-2.5 rounded-full [transition:background-color_150ms_var(--ease-out)]">
          Selaa hakemistoa
        </Link>
      </div>
    )
  }
```

**Authenticated + data list** (replaces current SuosikitClient.tsx lines 118–144 — use DiagonaalKortti + remove button per D-07/D-08/D-09):
```typescript
  return (
    <div className="min-h-screen bg-white px-4 py-8 max-w-2xl mx-auto">
      <h1 className="font-serif text-2xl font-bold text-[#111111] mb-6">
        TO DO -lista   {/* was: Suosikit */}
      </h1>
      <ul className="flex flex-col gap-3">
        {paikat.map(p => (
          <li key={p.id} className="flex flex-row items-start gap-2">
            <div className="flex-1 min-w-0">
              {/* min-w-0 prevents flex overflow — Pitfall 3 from RESEARCH.md */}
              <DiagonaalKortti paikka={p} />
              {/* onShowMap intentionally omitted — D-10 */}
            </div>
            <motion.button
              whileTap={{ scale: 0.85, transition: { duration: 0.12, ease: 'easeOut' } }}
              onClick={() => removeTodo(p.id)}
              className="glass-btn w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-2"
              aria-label="Poista TO DO -listalta"
            >
              <BookmarkCheck className="w-4 h-4 fill-[#111111] text-[#111111]" />
            </motion.button>
          </li>
        ))}
      </ul>
      <Link
        href="/"
        className="mt-8 inline-block text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)] underline underline-offset-2"
      >
        Takaisin hakemistoon
      </Link>
    </div>
  )
```

---

### `app/components/PaikkaSheet.tsx` (props rename only)

**Analog:** self — in-place edit

**Props interface** (PaikkaSheet.tsx lines 17–23):
```typescript
interface Props {
  paikka: Liikuntapaikka
  suosikki: boolean          // → todo: boolean
  distanceKm?: number
  onClose: () => void
  onToggleSuosikki: (id: number) => void  // → onToggleTodo: (id: number) => void
}
```

**Function signature** (PaikkaSheet.tsx line 25):
```typescript
export default function PaikkaSheet({ paikka, suosikki, distanceKm, onClose, onToggleSuosikki }: Props) {
// →                                  { paikka, todo,     distanceKm, onClose, onToggleTodo     }: Props)
```

**Toggle button** (PaikkaSheet.tsx lines 89–95):
```typescript
<motion.button
  whileTap={{ scale: 0.85, transition: { duration: 0.12 } }}
  onClick={() => onToggleSuosikki(paikka.id)}    // → onToggleTodo(paikka.id)
  className="glass-btn w-8 h-8 rounded-full flex items-center justify-center"
>
  <Heart className={cn('w-4 h-4', suosikki ? 'fill-[#111111] text-[#111111]' : 'text-[rgba(17,17,17,0.35)]')} />
  {/* Replace Heart with:
    {todo
      ? <BookmarkCheck className={cn('w-4 h-4 fill-[#111111] text-[#111111]')} />
      : <Bookmark className={cn('w-4 h-4 text-[rgba(17,17,17,0.35)]')} />
    }
  */}
</motion.button>
```

**Import line** (PaikkaSheet.tsx line 4 — remove Heart, add Bookmark icons):
```typescript
import { X, MapPin, Phone, ExternalLink, Clock, CircleDollarSign, Info, Heart } from 'lucide-react'
// → import { X, MapPin, Phone, ExternalLink, Clock, CircleDollarSign, Info, Bookmark, BookmarkCheck } from 'lucide-react'
```

---

### `app/components/NavPill.tsx` (icon + label swap)

**Analog:** self — in-place edit

**Import line** (NavPill.tsx line 7 — swap Heart for Bookmark):
```typescript
import { Heart, User, LogOut, MoreHorizontal, X } from 'lucide-react'
// → import { Bookmark, User, LogOut, MoreHorizontal, X } from 'lucide-react'
```

**Suosikit link** (NavPill.tsx lines 70–73):
```typescript
<Link href="/suosikit" onClick={() => setOpen(false)} className={BTN}>
  <Heart className="w-3.5 h-3.5" />    // → <Bookmark className="w-3.5 h-3.5" />
  Suosikit                              // → TO DO
</Link>
```

Note: the `{user && (...)}` guard on line 64 stays — only authenticated users see the link.

---

### `app/components/NavBar.tsx` (icon + label swap — do NOT change Haku link)

**Analog:** self — in-place edit

**Import line** (NavBar.tsx line 5 — swap Heart for Bookmark):
```typescript
import { Menu, X, Search, Heart, User, LogOut } from 'lucide-react'
// → import { Menu, X, Search, Bookmark, User, LogOut } from 'lucide-react'
```

**Suosikit link** (NavBar.tsx lines 89–96 — update icon and label only):
```typescript
<Link
  href="/suosikit"
  onClick={() => setOpen(false)}
  className="flex items-center gap-1.5 px-3 h-8 rounded-full glass-btn text-sm font-bold text-[rgba(17,17,17,0.55)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
>
  <Heart className="w-3.5 h-3.5" />   // → <Bookmark className="w-3.5 h-3.5" />
  Suosikit                             // → TO DO
</Link>
```

**Do NOT touch** (NavBar.tsx lines 81–88 — Haku link, locked by D-14):
```typescript
<Link
  href="/?nakyma=lista"
  onClick={() => setOpen(false)}
  className="flex items-center gap-1.5 px-3 h-8 rounded-full glass-btn text-sm font-bold text-[rgba(17,17,17,0.55)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
>
  <Search className="w-3.5 h-3.5" />
  Haku
</Link>
```

---

### `app/components/Etusivu.tsx` (var renames + PaikkaSheet prop update)

**Analog:** self — in-place edit

**Import line** (Etusivu.tsx line 7 — remove Heart, add Bookmark):
```typescript
import { Moon, Sun, Locate, Search, Heart, MoreHorizontal, LogOut, User, LayoutList } from 'lucide-react'
// → import { Moon, Sun, Locate, Search, Bookmark, MoreHorizontal, LogOut, User, LayoutList } from 'lucide-react'
```

**State declaration** (Etusivu.tsx line 171):
```typescript
const [suosikitIds, setSuosikitIds] = useState<Set<number>>(new Set())
// → const [todoIds, setTodoIds] = useState<Set<number>>(new Set())
```

**Toggle function** (Etusivu.tsx lines 255–293 — rename function and all internal references):
```typescript
async function toggleSuosikki(id: number) {   // → toggleTodo
  if (inFlight.current.has(id)) return
  inFlight.current.add(id)
  const user = supabaseUser
  if (!user) {
    inFlight.current.delete(id)
    setPendingFavoriteId(id)
    setAuthModalOpen(true)
    return
  }
  const supabase = createBrowserSupabase()
  try {
    const isCurrentlySaved = suosikitIds.has(id)   // → todoIds.has(id)
    setSuosikitIds(prev => {                         // → setTodoIds
      const next = new Set(prev)
      if (isCurrentlySaved) next.delete(id)
      else next.add(id)
      return next
    })
    if (isCurrentlySaved) {
      const { error } = await supabase.from('suosikit').delete().eq('user_id', user.id).eq('paikka_id', id)
      if (error) {
        console.error('[toggleSuosikki] delete error:', error)   // → '[toggleTodo]'
        setSuosikitIds(prev => { const next = new Set(prev); next.add(id); return next })   // → setTodoIds
      }
    } else {
      const { error } = await supabase.from('suosikit').insert({ user_id: user.id, paikka_id: id })
      if (error) {
        console.error('[toggleSuosikki] insert error:', error)   // → '[toggleTodo]'
        setSuosikitIds(prev => { const next = new Set(prev); next.delete(id); return next })   // → setTodoIds
      }
    }
  } finally {
    inFlight.current.delete(id)
  }
}
```

**useMemo + AI fetch** (Etusivu.tsx lines 379–399 — rename vars, keep payload key `suosikit`):
```typescript
const suosikitSizeAndIds = useMemo(                          // → todoSizeAndIds (local rename only)
  () => Array.from(suosikitIds).sort((a, b) => a - b).join(','),   // → todoIds
  [suosikitIds]                                              // → [todoIds]
)

// Inside useEffect:
const suosikkiNimet = Array.from(suosikitIds)               // → todoNimet = Array.from(todoIds)
  .slice(0, 10)
  .map(id => paikat.find(p => p.id === id)?.nimi)
  .filter(Boolean) as string[]

// payload key stays as 'suosikit' — Pattern 4 from RESEARCH.md (internal API, non-user-visible):
body: JSON.stringify({ suosikit: suosikkiNimet, ... })      // → suosikit: todoNimet (key unchanged)
```

**PaikkaSheet call site** (Etusivu.tsx lines 1124–1130):
```typescript
<PaikkaSheet
  paikka={valittu}
  suosikki={suosikitIds.has(valittu.id)}    // → todo={todoIds.has(valittu.id)}
  distanceKm={distancesMap[valittu.id]}
  onClose={() => setValittu(null)}
  onToggleSuosikki={toggleSuosikki}         // → onToggleTodo={toggleTodo}
/>
```

**AuthModal onSuccess** (Etusivu.tsx lines 1109–1111):
```typescript
onSuccess={id => {
  if (id) toggleSuosikki(id)    // → toggleTodo(id)
  setAuthModalOpen(false)
}}
```

---

### `app/paikat/[id]/page.tsx` (import rename only)

**Analog:** self — single line edit

**Line 11** (current):
```typescript
import HeartButton from '@/app/components/HeartButton'
// → import BookmarkButton from '@/app/components/BookmarkButton'
```

**Line 69** (usage):
```tsx
<HeartButton paikkaId={paikka.id} />
// → <BookmarkButton paikkaId={paikka.id} />
```

No other changes needed in this file.

---

### `app/components/BottomNav.tsx` (dead file — icon swap for consistency)

Not read in detail — dead file with no importers per CLAUDE.md. Update is non-blocking.
Replace any `Heart` import and usage with `Bookmark`. Pattern is same as NavBar/NavPill edits above.

---

## Shared Patterns

### Icon state convention
**Source:** RESEARCH.md Pattern 2 + HeartButton.tsx lines 73/94
**Apply to:** BookmarkButton.tsx, PaikkaSheet.tsx, SuosikitClient.tsx (remove button is always filled)
```typescript
// Empty / not saved state:
<Bookmark className="w-5 h-5 text-[rgba(17,17,17,0.35)]" />

// Filled / saved state:
<BookmarkCheck className="w-5 h-5 fill-[#111111] text-[#111111]" />
// CRITICAL: fill- class is required alongside text- class — BookmarkCheck
// renders as outline-only with text- alone (Pitfall 5 from RESEARCH.md)

// Smaller variant (w-4 h-4) used in PaikkaSheet and SuosikitClient remove button:
<BookmarkCheck className="w-4 h-4 fill-[#111111] text-[#111111]" />
<Bookmark className="w-4 h-4 text-[rgba(17,17,17,0.35)]" />
```

### Optimistic update + rollback
**Source:** `app/components/HeartButton.tsx` lines 32–63, `app/components/Etusivu.tsx` lines 255–293
**Apply to:** BookmarkButton.tsx (toggle), SuosikitClient.tsx (remove)
```typescript
// Pattern: capture current state → optimistic update → async op → rollback on error
const wasSaved = isTodo
setIsTodo(!wasSaved)
const { error } = await supabase.from('suosikit').delete()...
if (error) setIsTodo(wasSaved)   // rollback
```

### Icon button class (small)
**Source:** `app/components/PaikkaSheet.tsx` line 92, `app/components/HeartButton.tsx` line 70
**Apply to:** SuosikitClient.tsx remove button
```typescript
className="glass-btn w-8 h-8 rounded-full flex items-center justify-center shrink-0"
// For mt-2 top offset on remove button: append mt-2
```

### motion.button tap animation
**Source:** `app/components/HeartButton.tsx` line 68
**Apply to:** BookmarkButton.tsx, PaikkaSheet.tsx toggle, SuosikitClient.tsx remove button
```typescript
whileTap={{ scale: 0.85, transition: { duration: 0.12, ease: 'easeOut' } }}
```

### Auth state machine (subscribeToAuthUser)
**Source:** `app/suosikit/SuosikitClient.tsx` lines 41–51
**Apply to:** SuosikitClient.tsx replacement (copy verbatim — add `setUserId` capture)
```typescript
const unsub = subscribeToAuthUser((user) => {
  if (user) {
    setAuthState('authenticated')
    setUserId(user.id)          // ADD: not in current version
    loadFavorites(user.id)
  } else {
    setAuthState('unauthenticated')
    setUserId(null)             // ADD
    setPaikat([])
  }
})
return () => { cancelled = true; unsub() }
```

### DiagonaalKortti flex-1 wrapper
**Source:** RESEARCH.md Pitfall 3 + D-08 decision
**Apply to:** SuosikitClient.tsx list items
```typescript
<div className="flex-1 min-w-0">
  <DiagonaalKortti paikka={p} />
  {/* onShowMap intentionally omitted per D-10 */}
</div>
```

---

## DiagonaalKortti Interface (verified — onShowMap is optional)

`app/components/DiagonaalKortti.tsx` lines 34–39:
```typescript
interface DiagonaalKorttiProps {
  paikka: Liikuntapaikka
  distanceStr?: string
  onShowMap?: (paikka: Liikuntapaikka) => void   // optional — omit on TO DO page
  onCardClick?: () => void
}
```

The pin button render at DiagonaalKortti.tsx line 134 is guarded by `hasCoords && onShowMap?.()` — omitting `onShowMap` means the button simply never calls back. The button renders but is inert. If the pin button appearing at all is undesirable, note that `onShowMap?.(paikka)` will no-op when undefined, but the button itself renders whenever `hasCoords` is true regardless of `onShowMap`. This is acceptable per D-10 (the decision says "pin button does not appear" — but the actual code shows it renders when `hasCoords` is true; the click does nothing without `onShowMap`). Executor should verify whether to pass a no-op or accept the harmless render.

---

## No Analog Found

None. All 8 files have direct analogs (all are edits to existing files).

---

## Metadata

**Analog search scope:** `app/components/`, `app/suosikit/`, `app/paikat/[id]/`
**Files read:** 8 source files
**Pattern extraction date:** 2026-05-31
**Key constraint:** Supabase table `suosikit` and URL `/suosikit` are NOT renamed (D-01). All changes are presentation-layer only.
