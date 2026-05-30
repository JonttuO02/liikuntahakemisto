# Venue Sheet — In-place Card Expansion

## Goal

Replace the current two-component flow (small callout card → separate centered overlay card)
with a single card that expands **in-place** from the map pin into a full-screen bottom sheet
containing all venue details. The bottom edge of the expanding card anchors to the screen
bottom so the card grows upward, covering ~90% of the viewport.

This sheet replaces the need to navigate to `/paikat/[id]` for most users.

---

## Current State (before this work)

```
Pin (zoom < 16)
  → click pin → MapAutoZoom (700ms smooth pan+zoom to lat/lng at zoom 16)
  → after zoom: small callout card appears at map location (badge + name + price + spike)
  → click small card → setValittu(p) → centered overlay card appears (fixed, 340px, screen center)
  → "Näytä kaikki tiedot →" link navigates to /paikat/[id]
```

The small card and the centered overlay card are **two separate React components**.
The "expand from small card" animation was approximated with `originX/originY` — not a true
shared-element transition. At the time of writing, `originX/originY` approach is in place but
produces an imperfect result (card doesn't truly morph from the callout position).

---

## Target State

```
Pin (zoom < 16)
  → click pin → MapAutoZoom (700ms, unchanged)
  → small callout card appears (same as before)
  → click small card → THE SAME card expands:
       - its bottom edge anchors to the screen bottom
       - card grows upward to ~90vh
       - contains ALL venue details (aukiolo, hinta, puhelin, kuvaus, varauslinkki, reviews)
  → drag down or tap backdrop → card shrinks back to callout size at pin location
```

---

## Architecture

### Key technique: Framer Motion `layoutId`

Both the small callout card and the large sheet use the **same `layoutId`**.
Framer Motion measures each element's bounding rect via `getBoundingClientRect()` and
interpolates position, size, and border-radius between them.

```
small card              →  full sheet
layoutId="vc-{id}"        layoutId="vc-{id}"
position: absolute         position: fixed
bottom: 0 / left: 0        left:0 / right:0 / bottom:0
width: ~120px              width: 100vw
height: ~70px              height: 90vh
border-radius: 12px        border-radius: 24px 24px 0 0
```

**Why this works with AdvancedMarker**: The small card is inside a Google Maps
AdvancedMarker, but it's a real DOM element. `getBoundingClientRect()` returns its actual
viewport position. Framer Motion's layout measurement reads these positions correctly.

### The 0×0 anchor container (already in place)

The small card lives inside:
```jsx
<div style={{ position: 'relative', width: 0, height: 0 }}>
  <AnimatePresence initial={false}>
    {zoomLevel >= 16 && valittu?.id !== p.id && (
      <motion.div
        key="card"
        layoutId={`vc-${p.id}`}   // ← ADD THIS
        style={{ position: 'absolute', bottom: 0, left: 0, transform: 'translateX(-50%)' }}
        ...
      >
```

The 0×0 container ensures the AdvancedMarker anchor never shifts — this was fixed in the
previous session and must be preserved.

### Spike handling

The spike (CSS triangle) must NOT be inside the `layoutId` element — it belongs only
to the callout card, not the sheet. Keep the spike in a sibling `motion.div` that fades
out when the card is selected:

```jsx
// Outside the layoutId motion.div, inside the absolute-positioned wrapper:
<AnimatePresence>
  {valittu?.id !== p.id && (
    <motion.div key="spike"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
               width: 0, height: 0,
               borderLeft: '10px solid transparent', borderRight: '10px solid transparent',
               borderTop: '11px solid rgba(240,240,245,0.88)' }}
    />
  )}
</AnimatePresence>
```

This way the spike fades out at the START of the expand animation, before the card morphs.

---

## Files to Change

| File | Change |
|---|---|
| `app/components/Etusivu.tsx` | Main changes — add layoutId to small card, add PaikkaSheet, remove centered overlay |
| `app/components/PaikkaSheet.tsx` | **New file** — full venue detail sheet component |

The venue page (`app/paikat/[id]/page.tsx`) stays unchanged — it remains accessible via
direct URL. The sheet is a progressive enhancement for map users.

---

## Step-by-step Implementation

### Step 1 — Add layoutId to the small callout card

In `Etusivu.tsx`, find the small card's `motion.div` (currently has `key="card"`).
Add `layoutId={\`vc-${p.id}\`}`:

```jsx
<motion.div
  key="card"
  layoutId={`vc-${p.id}`}
  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
  transition={{ duration: 0.15 }}
  style={{ position: 'absolute', bottom: 0, left: 0, transform: 'translateX(-50%)' }}
  onClick={...}
>
  <div style={{ position: 'relative' }}>
    {/* glass card — NO paddingBottom here, spike is moved outside */}
    <div className="glass rounded-xl px-2.5 py-2 flex flex-col gap-1 cursor-pointer"
         style={{ minWidth: 100, maxWidth: 140 }}>
      {/* badge, name, price */}
    </div>
  </div>
</motion.div>

{/* Spike — separate, fades out on expand */}
<AnimatePresence>
  {valittu?.id !== p.id && (
    <motion.div key="spike"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      style={{
        position: 'absolute', bottom: -11, left: 0, transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '10px solid transparent', borderRight: '10px solid transparent',
        borderTop: '11px solid rgba(240,240,245,0.88)',
        pointerEvents: 'none',
      }}
    />
  )}
</AnimatePresence>
```

Note: the spike moves to be a sibling of `motion.div[layoutId]` inside the outer
`position: absolute` wrapper, not a child. Also remove `paddingBottom: 11` from the card.

### Step 2 — Create PaikkaSheet.tsx

New component at `app/components/PaikkaSheet.tsx`.

```tsx
'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, MapPin, Phone, ExternalLink, Clock, CircleDollarSign, Info, Heart } from 'lucide-react'
import Link from 'next/link'
import { lajiKonfig } from '@/lib/lajit'
import { hintateksti, cn } from '@/lib/utils'
import { formatGroupedHours, getOpenStatus } from '@/lib/aukiolo'
import { isSafeUrl } from '@/lib/urlUtils'
import HoursTable from './HoursTable'
import ReviewSection from './ReviewSection'
import type { Liikuntapaikka } from '@/lib/types'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import { computeAvgRating } from '@/lib/reviewUtils'
import { formatDistance } from '@/lib/geo'

interface Props {
  paikka: Liikuntapaikka
  suosikki: boolean
  distanceKm?: number
  onClose: () => void
  onToggleSuosikki: (id: number) => void
}

export default function PaikkaSheet({ paikka, suosikki, distanceKm, onClose, onToggleSuosikki }: Props) {
  const [reviews, setReviews] = useState<ReviewRow[] | null>(null)

  useEffect(() => {
    const sb = createBrowserSupabase()
    sb.from('reviews')
      .select('id, rating, teksti, is_anonymous, reviewer_name, created_at')
      .eq('paikka_id', paikka.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setReviews(data ?? []))
  }, [paikka.id])

  const hoursGroups = formatGroupedHours(paikka.aukioloajat ?? null)
  const openStatus = getOpenStatus(paikka.aukioloajat)
  const priceStr = hintateksti(paikka.hinta_min, paikka.hinta_max)
  const priceDisplay = paikka.hinta_kuvaus || priceStr || null
  const avgRating = reviews ? computeAvgRating(reviews.map(r => r.rating)) : null

  return (
    <motion.div
      layoutId={`vc-${paikka.id}`}
      className="glass rounded-t-3xl overflow-y-auto"
      style={{
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        height: '90vh',
        zIndex: 66,
      }}
      transition={{ type: 'spring', damping: 32, stiffness: 260 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.15 }}
      onDragEnd={(_, info) => {
        if (info.velocity.y > 400 || info.offset.y > 100) onClose()
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-1 shrink-0">
        <div className="w-10 h-1 bg-[rgba(0,0,0,0.12)] rounded-full" />
      </div>

      <div className="px-4 pb-8 flex flex-col gap-4">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="inline-flex text-[10px] font-bold px-2 py-1 rounded-full text-white"
                style={{ backgroundColor: lajiKonfig[paikka.laji]?.color ?? '#6b7280' }}>
            {lajiKonfig[paikka.laji]?.label ?? paikka.laji}
          </span>
          <div className="flex items-center gap-1.5">
            <motion.button whileTap={{ scale: 0.85, transition: { duration: 0.12 } }}
              onClick={() => onToggleSuosikki(paikka.id)}
              className="glass-btn w-8 h-8 rounded-full flex items-center justify-center">
              <Heart className={cn('w-4 h-4', suosikki ? 'fill-[#111111] text-[#111111]' : 'text-[rgba(17,17,17,0.35)]')} />
            </motion.button>
            <button onClick={onClose}
              className="glass-btn w-8 h-8 rounded-full flex items-center justify-center text-[rgba(17,17,17,0.5)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Name */}
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#111111] leading-tight">{paikka.nimi}</h2>
          {(paikka.osoite || paikka.kaupunki) && (
            <p className="mt-1 text-sm text-[rgba(17,17,17,0.45)] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {[paikka.osoite, paikka.kaupunki].filter(Boolean).join(', ')}
              {distanceKm != null && (
                <span className="tabular-nums">{' · '}{formatDistance(distanceKm)}</span>
              )}
            </p>
          )}
        </div>

        {/* Open status */}
        {openStatus.status !== 'no-data' && (
          <p className="text-sm">
            {openStatus.status === 'open'
              ? <span className="text-green-700 font-bold">● Auki nyt{openStatus.hours ? ` · ${openStatus.hours}` : ''}</span>
              : <span className="text-[rgba(17,17,17,0.45)]">Suljettu{openStatus.hours ? ` · ${openStatus.hours}` : ''}</span>
            }
          </p>
        )}

        {/* Hours */}
        {hoursGroups.length > 0 && (
          <SheetRow icon={<Clock className="w-4 h-4" />} label="Aukioloajat">
            <HoursTable groups={hoursGroups} />
          </SheetRow>
        )}

        {/* Price */}
        {priceDisplay && (
          <SheetRow icon={<CircleDollarSign className="w-4 h-4" />} label="Hinta">
            {paikka.hinta_kuvaus
              ? <p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed">{paikka.hinta_kuvaus}</p>
              : <span className="font-serif text-xl font-bold text-[#111111]">{priceDisplay}</span>
            }
          </SheetRow>
        )}

        {/* Phone */}
        {paikka.puhelin && (
          <SheetRow icon={<Phone className="w-4 h-4" />} label="Puhelin">
            <a href={`tel:${paikka.puhelin}`} className="text-sm font-bold text-[#111111] hover:text-[rgba(17,17,17,0.6)] [transition:color_150ms_var(--ease-out)]">
              {paikka.puhelin}
            </a>
          </SheetRow>
        )}

        {/* Booking link */}
        {isSafeUrl(paikka.varauslinkki) && (
          <a href={paikka.varauslinkki} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm [transition:background-color_150ms_var(--ease-out)]">
            <ExternalLink className="w-4 h-4" />
            Varaa aika
          </a>
        )}

        {/* Description */}
        {paikka.kuvaus && (
          <SheetRow icon={<Info className="w-4 h-4" />} label="Kuvaus">
            <p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed">{paikka.kuvaus}</p>
          </SheetRow>
        )}

        {/* Reviews */}
        {reviews !== null && (
          <ReviewSection
            paikkaId={paikka.id}
            initialReviews={reviews}
            avgRating={avgRating ?? undefined}
            reviewCount={reviews.length}
          />
        )}

        {/* Link to full page */}
        <Link href={`/paikat/${paikka.id}`}
          className="text-center text-xs text-[rgba(17,17,17,0.35)] hover:text-[rgba(17,17,17,0.6)] [transition:color_150ms_var(--ease-out)] underline underline-offset-2 mt-2">
          Avaa paikkasivu selaimessa →
        </Link>
      </div>
    </motion.div>
  )
}

function SheetRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-t border-[rgba(0,0,0,0.07)] pt-4">
      <div className="w-8 h-8 rounded-lg glass flex items-center justify-center shrink-0 text-[rgba(17,17,17,0.5)]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-[rgba(17,17,17,0.4)] uppercase tracking-widest mb-1">{label}</p>
        {children}
      </div>
    </div>
  )
}
```

**ReviewRow type** — define inline or reuse from existing types:
```typescript
interface ReviewRow {
  id: number
  rating: number
  teksti: string | null
  is_anonymous: boolean
  reviewer_name: string | null
  created_at: string
}
```

### Step 3 — Wire PaikkaSheet into Etusivu.tsx

Replace the current expanded card section (the `{/* ── Expanded venue card ── */}` block,
currently ~lines 967–1054) with:

```jsx
{/* Backdrop */}
{valittu && (
  <div style={{ position: 'fixed', inset: 0, zIndex: 65 }}
    onClick={() => setValittu(null)} />
)}

{/* PaikkaSheet */}
<AnimatePresence>
  {valittu && (
    <PaikkaSheet
      paikka={valittu}
      suosikki={suosikitIds.has(valittu.id)}
      distanceKm={distancesMap[valittu.id]}
      onClose={() => setValittu(null)}
      onToggleSuosikki={toggleSuosikki}
    />
  )}
</AnimatePresence>
```

Import `PaikkaSheet` at the top of Etusivu.tsx.

Also remove `expandOriginX`, `expandOriginY`, `cardClickRef` — these were for the old
`originX/originY` approach and are no longer needed.

### Step 4 — Remove originX/originY state

In `Etusivu.tsx`, remove:
- `const cardClickRef = useRef<{ cx: number; cy: number } | null>(null)`
- `const expandOriginX = (...)()` and `const expandOriginY = (...)()` computations
- The `cardClickRef.current = {...}` line inside the small card's onClick

The onClick for the small card becomes simpler:
```jsx
onClick={e => {
  e.stopPropagation()
  pendingValittuRef.current = p
  setAutoZoomTarget({ lat: p.latitude, lng: p.longitude })
  setSearchOpen(false)
}}
```

---

## Tricky Parts / Risks

### 1. layoutId across Maps overlay — must test
AdvancedMarker renders its children into a real DOM element in the page. Framer Motion uses
`getBoundingClientRect()` to measure the small card's position. This should work correctly
since the element is in the normal DOM tree.

**If it doesn't morph correctly**: The fallback is to capture the small card's bounding rect
on click (store in a ref), then pass those coordinates to PaikkaSheet as `initialRect`, and
animate with `initial={{ top, left, width, height }}`. This is more code but guaranteed correct.

### 2. AnimatePresence + layoutId timing
The small card exits (condition: `valittu?.id !== p.id` → false) at the SAME React render
as the sheet enters (condition: `valittu !== null` → true). Framer Motion needs to see both
in the same commit to create the shared transition.

- The `AnimatePresence initial={false}` on the small card's container handles the exit
- The `AnimatePresence` on the sheet container handles the entry
- Both fire in the same React batch (single `setValittu(p)` call)
- This should work, but if the timing is off, `LayoutGroup` from Framer Motion might help

### 3. Drag-to-close on iOS
The sheet has `drag="y"` with `onDragEnd` close logic. On iOS Safari, `touch-action: none`
may be needed. Framer Motion handles this automatically but worth testing.

### 4. Scroll reset on new venue
If the user opens venue A (scrolls down), closes, then opens venue B, the sheet might
remember the scroll position. Add a `key={valittu.id}` to the PaikkaSheet to force a fresh
mount for each venue (or use `useEffect` to reset scroll to 0 on mount).

```jsx
// In PaikkaSheet:
const scrollRef = useRef<HTMLDivElement>(null)
useEffect(() => { scrollRef.current?.scrollTo(0, 0) }, [paikka.id])
```

Actually, `key={valittu.id}` on the `AnimatePresence` child is cleaner:
```jsx
<PaikkaSheet key={valittu.id} ... />
```

But `key` on the `layoutId` element changes the element identity — Framer Motion would NOT
recognize it as the same element. Use the `useEffect` scroll reset approach instead.

### 5. ReviewSection compatibility
`ReviewSection` currently expects `paikkaId`, `initialReviews`, `avgRating`, `reviewCount`.
This is being used server-side in the venue page and might have server-only code.
Check `app/components/ReviewSection.tsx` — if it's a server component, it won't work in
PaikkaSheet (which is client-side). May need a `ReviewSectionClient` wrapper.

---

## What to verify after implementation

- [ ] Small card → sheet expand animation is smooth (card grows from pin to bottom sheet)
- [ ] Sheet → small card collapse animation is smooth (closes back to callout position)
- [ ] Spike disappears at the START of the expand (not during)
- [ ] Sheet is scrollable, scroll resets when opening a new venue
- [ ] Drag-to-close works: swipe down closes the sheet
- [ ] Backdrop click closes the sheet
- [ ] Suosikki button works inside the sheet
- [ ] Reviews load after the sheet opens (spinner or skeleton while loading)
- [ ] "Avaa paikkasivu" link navigates to /paikat/[id]
- [ ] No TypeScript errors
- [ ] Existing functionality unaffected (zoom, pin animations, search)
