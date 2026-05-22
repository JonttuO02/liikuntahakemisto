# Phase 6: UI Polish & Data Foundation — Pattern Map

**Mapped:** 2026-05-22
**Files analyzed:** 8 (3 new, 5 edited)
**Analogs found:** 6 / 8 (2 helper files have no analog — pure logic, TDD)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/tietosuoja/page.tsx` | page (server component) | static render | `app/paikat/[id]/page.tsx` | role-match (same server-component page shell, no data fetch) |
| `app/components/PaikkaKortti.tsx` | component (client) | transform/display | self (existing file to edit) | exact |
| `app/components/LiikuntapaikatLista.tsx` | component (client) | CRUD/filter | self (existing file to edit) | exact |
| `app/components/Etusivu.tsx` | component (client) | event-driven + display | self (existing file to edit) | exact |
| `app/paikat/[id]/page.tsx` | page (server component) | request-response | self (existing file to edit) | exact |
| `app/page.tsx` | page (server component) | request-response | self (existing file to edit) | exact |
| `lib/priceUtils.ts` + `lib/priceUtils.test.ts` | helper (pure logic) | transform | n/a — no analog | no analog (TDD — created in Plan 04) |
| `lib/cityFilter.ts` + `lib/cityFilter.test.ts` | helper (pure logic) | transform | n/a — no analog | no analog (TDD — created in Plan 04) |

## No Analog Found

### `lib/priceUtils.ts` / `lib/priceUtils.test.ts`

Pure business logic helper. No existing codebase file serves the same role (price heuristic extraction). Created from scratch in Plan 04 under TDD. The executor should write the test first (`isMembershipOnly` function), then the implementation. No structural pattern to follow — it is a plain TypeScript function in the `lib/` directory matching `vitest.config.ts`'s `include: ['lib/**/*.test.ts']` scope.

### `lib/cityFilter.ts` / `lib/cityFilter.test.ts`

Pure utility helper for deriving a sorted unique city list. No existing codebase file serves the same role. Created from scratch in Plan 04 under TDD. Same TDD pattern as `lib/priceUtils.ts` — test first, then implementation. Function signature: `deriveKaupungit(paikat: Array<Pick<Liikuntapaikka,'kaupunki'>>): string[]`.

---

## Pattern Assignments

### `app/tietosuoja/page.tsx` (NEW — page, static render)

**Analog:** `app/paikat/[id]/page.tsx`

**Imports pattern** (lines 1–9 of analog):
```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Phone, MapPin, CircleDollarSign, Info, ChevronLeft, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
```
For `tietosuoja/page.tsx`, NO `supabase` import, NO `'use client'` — pure server component with no data fetching. Import only `Link` from `next/link` and `ChevronLeft` from `lucide-react` for the back link (optional).

**Page shell pattern** (lines 29–33 of analog):
```tsx
export default async function PaikkaPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-white border-b border-[rgba(0,0,0,0.07)]">
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-8">
```
For `tietosuoja/page.tsx`: use `max-w-2xl mx-auto px-4 pt-10 pb-16` content container; no hero section with border-b needed — plain white bg throughout. Function signature: `export default function TietosuojaPage()` (not async, no params).

**Hero heading pattern** (lines 50–51 of analog — font-serif display heading):
```tsx
<h1 className="mt-3 font-serif text-3xl sm:text-4xl font-bold text-[#111111] leading-tight tracking-tight">
  {paikka.nimi}
</h1>
```
For `tietosuoja/page.tsx`: `<h1 className="font-serif text-3xl font-bold text-[#111111]">Tietosuojaseloste</h1>`.

**Section heading pattern** (lines 67–75 of analog — glass card with p-6 sm:p-8 internal spacing):
```tsx
<div className="glass rounded-2xl overflow-hidden">
  <div className="p-6 sm:p-8 flex flex-col gap-5">
```
For `tietosuoja/page.tsx`: prose sections use plain `<h2>` + `<p>` tags, no glass card needed. Section headings: `<h2 className="text-sm font-bold text-[#111111] uppercase tracking-widest mt-8 mb-2">`. Body text: `<p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed">`.

**No analog pattern** for GDPR prose content — author manually per D-01 through D-05 locked decisions. Six sections in order: rekisterinpitäjä, mitä tietoja kerätään, evästeet ja selaintallennus, käyttäjän oikeudet, yhteydenotot, muutokset.

---

### `app/components/PaikkaKortti.tsx` (EDIT — component, transform/display)

**Analog:** self — current file `app/components/PaikkaKortti.tsx`

**Full current file read:** lines 1–152 (153 lines total, read in one pass).

**Imports pattern** (lines 1–10 — no changes needed):
```tsx
'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { MapPin, Dumbbell, Waves, Leaf, Building2, Zap, Target, Activity } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { lajiKonfig } from '@/lib/lajit'
import { hintateksti } from '@/lib/utils'
import { getOpenStatus } from '@/lib/aukiolo'
import type { Liikuntapaikka } from '@/lib/types'
```

**Badge row pattern** (lines 56–70 — target for ADS-02 Sponsoroitu badge addition):
```tsx
{/* Badge with sport icon + optional drop-in badge */}
<div className="flex items-center gap-2 flex-wrap">
  <span
    className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full text-white"
    style={{ backgroundColor: laji.color }}
  >
    <Icon className="w-3 h-3" />
    {laji.label}
  </span>
  {hasDropIn && (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-[rgba(17,17,17,0.06)] text-[rgba(17,17,17,0.55)]">
      Kertakäynti OK
    </span>
  )}
</div>
```
After the `Kertakäynti OK` badge add (per D-08):
```tsx
{paikka.featured && (
  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
    Sponsoroitu
  </span>
)}
```

**Current price logic** (lines 42–44 — replace per D-10 to D-14):
```tsx
const hasDropIn   = paikka.hinta_kuvaus?.toLowerCase().includes('kertakäynti') ?? false
const hintaTeksti = hintateksti(paikka.hinta_min, paikka.hinta_max)
const priceToShow = paikka.hinta_kuvaus || (hintaTeksti !== '' ? hintaTeksti : null)
```
New logic (per D-11, D-12, D-13 from CONTEXT.md):
```tsx
const hasDropIn       = paikka.hinta_kuvaus?.toLowerCase().includes('kertakäynti') ?? false
const hintaTeksti     = hintateksti(paikka.hinta_min, paikka.hinta_max)
const isMembershipOnly =
  !!paikka.hinta_kuvaus?.toLowerCase().includes('jäsenyys') &&
  paikka.hinta_min == null && paikka.hinta_max == null
const priceLines      = paikka.hinta_kuvaus?.includes('\n')
  ? paikka.hinta_kuvaus.split('\n')
  : null
```

**Price display block — new position 4** (currently in bottom row lines 135–140; move to between open status and address):
```tsx
{/* Price — position 4 (after open status, before address) */}
<div>
  {isMembershipOnly ? (
    <span className="text-sm text-[rgba(17,17,17,0.5)]">vain jäsenyys</span>
  ) : priceLines ? (
    <span className="text-sm font-bold text-[#111111] tabular-nums">
      {priceLines.map((line, i) => <span key={i} className="block">{line}</span>)}
    </span>
  ) : paikka.hinta_kuvaus || hintaTeksti ? (
    <span className="text-sm font-bold text-[#111111] tabular-nums">
      {paikka.hinta_kuvaus || hintaTeksti}
    </span>
  ) : (
    <span className="text-xs text-[rgba(17,17,17,0.35)]">Lisätään pian</span>
  )}
</div>
```

**Bottom row pattern** (lines 112–148 — target for UI-07 CTA change and price removal):
```tsx
{/* Bottom row */}
<div className="mt-auto flex items-center justify-between gap-3 pt-2.5 border-t border-[rgba(0,0,0,0.07)]">
  {paikka.varauslinkki ? (
    <motion.a
      href={paikka.varauslinkki}
      target="_blank"
      rel="noopener noreferrer"
      whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
      className="bg-[#111111] hover:bg-[#333333] text-white text-sm font-semibold py-2 px-4 rounded-full [transition:background-color_150ms_var(--ease-out)]"
    >
      Varaa aika →
    </motion.a>
  ) : (
    <motion.div whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}>
      <Link
        href={`/paikat/${paikka.id}`}
        className="border border-[rgba(0,0,0,0.12)] text-[rgba(17,17,17,0.6)] hover:text-[#111111] hover:border-[rgba(0,0,0,0.25)] text-sm font-medium py-2 px-4 rounded-full [transition:color_150ms_var(--ease-out),border-color_150ms_var(--ease-out)]"
      >
        Näytä tiedot
      </Link>
    </motion.div>
  )}

  <div className="flex flex-col items-end gap-0.5 shrink-0">
    {priceToShow ? (
      <span className="text-sm font-bold text-[#111111] tabular-nums">{priceToShow}</span>
    ) : (
      <span className="text-xs text-[rgba(17,17,17,0.35)]">Lisätään pian</span>
    )}
    {distanceStr && (
      <span className="text-xs text-[rgba(17,17,17,0.4)] tabular-nums flex items-center gap-0.5">
        <MapPin className="w-3 h-3 shrink-0" />
        {distanceStr}
      </span>
    )}
  </div>
</div>
```
After UI-07 (D-15): replace the entire conditional CTA block with always-shown "Näytä tiedot". Remove the price `<div>` from the bottom row (price moved to position 4 above). Keep distance string on right. New bottom row:
```tsx
<div className="mt-auto flex items-center justify-between gap-3 pt-2.5 border-t border-[rgba(0,0,0,0.07)]">
  <motion.div whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}>
    <Link
      href={`/paikat/${paikka.id}`}
      className="border border-[rgba(0,0,0,0.12)] text-[rgba(17,17,17,0.6)] hover:text-[#111111] hover:border-[rgba(0,0,0,0.25)] text-sm font-medium py-2 px-4 rounded-full [transition:color_150ms_var(--ease-out),border-color_150ms_var(--ease-out)]"
    >
      Näytä tiedot
    </Link>
  </motion.div>
  {distanceStr && (
    <span className="text-xs text-[rgba(17,17,17,0.4)] tabular-nums flex items-center gap-0.5 shrink-0">
      <MapPin className="w-3 h-3 shrink-0" />
      {distanceStr}
    </span>
  )}
</div>
```

**New card section order** after all edits (D-10):
1. Badge row (sport pill + Kertakäynti OK + Sponsoroitu)
2. Venue name link
3. Open status
4. **Price block** (new position — was in bottom row)
5. Address
6. Description
7. Bottom row (CTA "Näytä tiedot" + distance)

---

### `app/components/LiikuntapaikatLista.tsx` (EDIT — component, CRUD/filter)

**Analog:** self — current file `app/components/LiikuntapaikatLista.tsx`

**Full current file read:** lines 1–226 (226 lines total, read in one pass).

**State pattern** (lines 31–34 — copy for city filter state per D-20 to D-21):
```tsx
const [haku, setHaku]               = useState('')
const [aktiivinen, setAktiivinen]   = useState('Kaikki')
const [aktiivHinta, setAktiivHinta] = useState<number | null>(null)
const [aukinyt, setAukinyt]         = useState(false)
```
Add city filter state immediately after existing state declarations:
```tsx
const [aktiivKaupunki, setAktiivKaupunki] = useState('Kaikki')
```
Add city list derived via `useMemo` (per D-21):
```tsx
const kaupungit = useMemo(
  () => ['Kaikki', ...Array.from(new Set(paikat.map(p => p.kaupunki).filter(Boolean))).sort() as string[]],
  [paikat]
)
```

**Filter logic pattern** (lines 48–58 — extend `suodatettu` useMemo for city filter per D-21):
```tsx
const suodatettu = useMemo(() =>
  paikat.filter(p => {
    const matchesLaji  = aktiivinen === 'Kaikki' || p.laji.toLowerCase() === aktiivinen.toLowerCase()
    const q            = haku.toLowerCase()
    const matchesHaku  = !haku || p.nimi.toLowerCase().includes(q) || p.kuvaus?.toLowerCase().includes(q) || p.osoite?.toLowerCase().includes(q)
    const hintaRef     = p.hinta_min ?? p.hinta_max
    const matchesHinta = aktiivHinta === null || hintaRef == null || hintaRef <= aktiivHinta
    const matchesAuki  = !aukinyt || getOpenStatus(p.aukioloajat).status !== 'closed'
    return matchesLaji && matchesHaku && matchesHinta && matchesAuki
  }),
  [paikat, aktiivinen, haku, aktiivHinta, aukinyt]
)
```
Add `matchesKaupunki` to the filter and `aktiivKaupunki` to the dependency array:
```tsx
const matchesKaupunki = aktiivKaupunki === 'Kaikki' || p.kaupunki === aktiivKaupunki
return matchesLaji && matchesHaku && matchesHinta && matchesAuki && matchesKaupunki
// dependency array: [..., aktiivKaupunki]
```

**Hero subtitle update** (line 77 — per D-22):
```tsx
{/* current: */}
<p className="mt-2 text-[rgba(17,17,17,0.45)] text-sm sm:text-base">
  Tampere &nbsp;·&nbsp; {paikat.length} paikkaa
</p>
{/* new: */}
<p className="mt-2 text-[rgba(17,17,17,0.45)] text-sm sm:text-base">
  {aktiivKaupunki === 'Kaikki' ? 'Kaikki kaupungit' : aktiivKaupunki}
  &nbsp;·&nbsp; {suodatettu.length} paikkaa
</p>
```

**Sport filter pills** (lines 103–135 — replace entire pill scroll with native `<select>` per D-18, D-19):
```tsx
{/* current sport filter pill scroll — REMOVE entire div lines 103–135 */}
<div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
  <p className="sr-only">LAJIT</p>
  {LAJIT_FILTTERI.map(laji => (
    <motion.button key={laji} onClick={() => setAktiivinen(laji)} ... >
      {laji}
    </motion.button>
  ))}
  <motion.button onClick={requestLocation} ...>Etäisyydet</motion.button>
</div>
```
Replace Row 1 with two dropdowns + distance button (per D-19 layout: `[City dropdown] [Sport dropdown] [Etäisyydet button]`):
```tsx
{/* Row 1: city + sport dropdowns + distance button */}
<div className="flex flex-wrap items-center gap-2">
  {/* City dropdown */}
  {kaupungit.length > 1 && (
    <select
      value={aktiivKaupunki}
      onChange={e => setAktiivKaupunki(e.target.value)}
      aria-label="Suodata kaupungin mukaan"
      className="h-10 rounded-full border border-[rgba(0,0,0,0.12)] bg-white px-4 text-sm font-bold text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111] [transition:border-color_150ms_var(--ease-out)] cursor-pointer"
    >
      {kaupungit.map(k => <option key={k} value={k}>{k}</option>)}
    </select>
  )}
  {/* Sport dropdown */}
  <select
    value={aktiivinen}
    onChange={e => setAktiivinen(e.target.value)}
    aria-label="Suodata lajin mukaan"
    className="h-10 rounded-full border border-[rgba(0,0,0,0.12)] bg-white px-4 text-sm font-bold text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111] [transition:border-color_150ms_var(--ease-out)] cursor-pointer"
  >
    {LAJIT_FILTTERI.map(l => <option key={l} value={l}>{l}</option>)}
  </select>
  {/* Distance button — unchanged from existing pattern */}
  <motion.button
    onClick={requestLocation}
    disabled={status === 'requesting'}
    whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
    className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold
      [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)]
      disabled:opacity-50
      ${status === 'granted'
        ? 'bg-[#111111] text-white'
        : 'border border-[rgba(0,0,0,0.1)] text-[rgba(17,17,17,0.6)] hover:text-[#111111] hover:border-[rgba(0,0,0,0.2)]'
      }`}
  >
    <MapPin className="w-3.5 h-3.5" />
    {status === 'requesting' ? 'Haetaan...' : status === 'granted' ? 'Sijainti päällä' : 'Etäisyydet'}
  </motion.button>
</div>
```

**Empty state reset** (lines 214–215 — extend per D-23 to also reset city filter):
```tsx
{/* current: */}
onClick={() => { setHaku(''); setAktiivinen('Kaikki'); setAktiivHinta(null); setAukinyt(false) }}
{/* new: */}
onClick={() => { setHaku(''); setAktiivinen('Kaikki'); setAktiivHinta(null); setAukinyt(false); setAktiivKaupunki('Kaikki') }}
```

**Grid key** (line 191 — update to include city filter so AnimatePresence key resets properly):
```tsx
{/* current: */}
key={`grid-${aktiivinen}-${aktiivHinta ?? 'all'}-${aukinyt}`}
{/* new: */}
key={`grid-${aktiivKaupunki}-${aktiivinen}-${aktiivHinta ?? 'all'}-${aukinyt}`}
```

**Footer link** (add after closing `</div>` of the content section, per D-05 — after venue grid, before end of component):
```tsx
{/* Footer — privacy link (LEGAL-01) */}
<div className="max-w-5xl mx-auto px-4 pb-6 pt-2 flex justify-center">
  <Link
    href="/tietosuoja"
    className="text-xs text-[rgba(17,17,17,0.35)] hover:text-[rgba(17,17,17,0.6)] [transition:color_150ms_var(--ease-out)] underline underline-offset-2"
  >
    Tietosuoja
  </Link>
</div>
```

---

### `app/components/Etusivu.tsx` (EDIT — component, event-driven + display)

**Analog:** self — current file `app/components/Etusivu.tsx`

**Imports pattern** (lines 1–18 — no changes needed to imports; `X`, `MapPin` from lucide already imported):
```tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Moon, Sun } from 'lucide-react'
```

**WEATHER_CITY constant** (add after line 18 `const NAV_H = 56` per D-24 and CONTEXT specifics):
```tsx
const WEATHER_CITY = 'Tampere'
```

**Weather display block** (lines 186–195 — target for AI-04 city name insertion):
```tsx
{saa && (
  <div className="flex items-center gap-1.5">
    <span className="text-base leading-none select-none" aria-hidden>
      {getWeatherEmoji(saa.code)}
    </span>
    <span className="text-sm font-semibold text-[#111111] tabular-nums">
      {saa.temp}°
    </span>
  </div>
)}
```
Change the temperature span (per D-24, inline city after `°`):
```tsx
<span className="text-sm font-semibold text-[#111111] tabular-nums">
  {saa.temp}° <span className="font-normal text-[rgba(17,17,17,0.45)]">{WEATHER_CITY}</span>
</span>
```

**Bottom-sheet badge insertion** (lines 448–462 — target for ADS-02 independent badge per Pitfall 1):
```tsx
{/* current: lines 448–461 — sport badge only */}
<div className="px-5 pt-2 pb-2">
  {(() => {
    const laji = lajiKonfig[valittu.laji] ?? { label: valittu.laji, color: '#6b7280' }
    const Icon = SPORT_ICONS[valittu.laji] ?? Activity
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full text-white"
        style={{ backgroundColor: laji.color }}
      >
        <Icon className="w-3 h-3" />
        {laji.label}
      </span>
    )
  })()}
```
After the closing `</span>` of the sport badge IIFE, add "Sponsoroitu" conditionally (per D-07):
```tsx
  {/* Sponsoroitu badge — independent from PaikkaKortti (ADS-02) */}
  {valittu.featured && (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 ml-1.5">
      Sponsoroitu
    </span>
  )}
```
Note: the IIFE `{(() => { ... })()}` renders a single `<span>`. The Sponsoroitu badge is a sibling element immediately after the IIFE closing `})()}`. Both sit inside the `<div className="px-5 pt-2 pb-2">`. The existing `<h2>` venue name and address `<p>` follow unchanged at lines 463–471.

---

### `app/paikat/[id]/page.tsx` (EDIT — page, request-response)

**Analog:** self — current file `app/paikat/[id]/page.tsx`

**Full current file read:** lines 1–147 (147 lines total, read in one pass).

**Imports — add ExternalLink** (line 3, per D-16):
```tsx
// current:
import { Phone, MapPin, CircleDollarSign, Info, ChevronLeft, Clock } from 'lucide-react'
// new (add ExternalLink):
import { Phone, MapPin, CircleDollarSign, Info, ChevronLeft, Clock, ExternalLink } from 'lucide-react'
```

**Row component pattern** (lines 135–147 — reference for booking URL Row):
```tsx
function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl glass flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-[rgba(17,17,17,0.4)] uppercase tracking-widest mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  )
}
```
Row is defined at the bottom of the file; it is not exported. Use as-is.

**Existing varauslinkki block** (lines 114–129 — REPLACE this block per D-16):
```tsx
{paikka.varauslinkki && (
  <div className="px-6 sm:px-8 pb-8">
    <a
      href={paikka.varauslinkki}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonVariants({
        size: 'lg',
        className: 'w-full rounded-full bg-[#111111] hover:bg-[#333333] active:scale-[0.97] text-white font-semibold text-base h-14 no-underline [transition:background-color_150ms_var(--ease-out),transform_100ms_var(--ease-out)]',
      })}
    >
      Varaa aika →
    </a>
  </div>
)}
```
Replace with a `Row` entry inside the `flex flex-col gap-5` block (per D-16 — after Hinta row, before Kuvaus row, lines 97–111):
```tsx
{paikka.varauslinkki && (
  <Row icon={<ExternalLink className="w-5 h-5 text-[rgba(17,17,17,0.5)]" />} label="Varaussivu">
    <a
      href={paikka.varauslinkki}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-[#111111] font-medium underline underline-offset-2 break-all hover:text-[rgba(17,17,17,0.6)] [transition:color_150ms_var(--ease-out)]"
    >
      {paikka.varauslinkki}
    </a>
  </Row>
)}
```
Also remove the `buttonVariants` import (line 9) if no longer used after this change.

**Row order after edit** (inside `<div className="p-6 sm:p-8 flex flex-col gap-5">`):
1. Sijainti (MapPin) — lines 69–79
2. Aukioloajat (Clock) — lines 82–86
3. Puhelin (Phone) — lines 88–94
4. Hinta (CircleDollarSign) — lines 97–105
5. **Varaussivu (ExternalLink)** — NEW, inserted here
6. Kuvaus (Info) — lines 107–111

---

### `app/page.tsx` (EDIT — page, request-response)

**Analog:** self — current file `app/page.tsx`

**Full current file read:** lines 1–39 (39 lines total, read in one pass).

**SELECT query** (line 13 — target for D-09 `featured` column addition):
```tsx
// current (line 13):
.select('id, nimi, laji, osoite, kaupunki, latitude, longitude, hinta_min, hinta_max, varauslinkki, kuvaus, puhelin, aukioloajat, hinta_kuvaus')

// new — add `featured` to the end of the column list:
.select('id, nimi, laji, osoite, kaupunki, latitude, longitude, hinta_min, hinta_max, varauslinkki, kuvaus, puhelin, aukioloajat, hinta_kuvaus, featured')
```
This is the only change needed in `app/page.tsx`. The `featured` field already exists on the `Liikuntapaikka` type (`featured?: boolean | null`, `lib/types.ts` line 18) and in the DB schema.

---

## Shared Patterns

### Glassmorphism surface
**Source:** `app/components/PaikkaKortti.tsx` line 51, `app/paikat/[id]/page.tsx` lines 65–67
**Apply to:** `app/tietosuoja/page.tsx` if a content card is used (optional — plain white bg is also acceptable per analog)
```tsx
<div className="glass rounded-2xl overflow-hidden">
  <div className="p-6 sm:p-8 flex flex-col gap-5">
```

### Sponsoroitu badge
**Source:** `app/components/PaikkaKortti.tsx` badge row (lines 56–70); same class applied in `Etusivu.tsx` bottom-sheet
**Apply to:** both `PaikkaKortti.tsx` (badge row) and `Etusivu.tsx` (bottom-sheet)
```tsx
{paikka.featured && (
  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
    Sponsoroitu
  </span>
)}
```
Note: `featured` may be `undefined` (not in SELECT until this phase's `app/page.tsx` fix) — the `&&` guard handles both `false` and `undefined` safely.

### Muted text / label caps
**Source:** `app/paikat/[id]/page.tsx` Row component line 142; `app/components/LiikuntapaikatLista.tsx` line 77
**Apply to:** `app/tietosuoja/page.tsx` prose section headings; `LiikuntapaikatLista` hero subtitle
```tsx
{/* Label caps (Row labels): */}
<p className="text-[10px] font-bold text-[rgba(17,17,17,0.4)] uppercase tracking-widest mb-0.5">
{/* Subtitle / muted body: */}
<p className="mt-2 text-[rgba(17,17,17,0.45)] text-sm sm:text-base">
```

### Motion filter button (whileTap only)
**Source:** `app/components/LiikuntapaikatLista.tsx` lines 106–119, lines 170–183
**Apply to:** All existing `motion.button` filter controls; do NOT add to new `<select>` elements
```tsx
whileTap={{ scale: 0.96, transition: { duration: 0.1 } }}
```

### Hover-transition link style
**Source:** `app/paikat/[id]/page.tsx` lines 74–76; `app/components/PaikkaKortti.tsx` line 128
**Apply to:** booking URL anchor in profile page, Tietosuoja footer link
```tsx
className="... hover:text-[rgba(17,17,17,0.6)] [transition:color_150ms_var(--ease-out)]"
```

### Native `<select>` dropdown style
**Source:** CONTEXT.md `<specifics>` section (exact class from UI-SPEC)
**Apply to:** both city and sport `<select>` elements in `LiikuntapaikatLista`
```tsx
className="h-10 rounded-full border border-[rgba(0,0,0,0.12)] bg-white px-4 text-sm font-bold text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111] [transition:border-color_150ms_var(--ease-out)] cursor-pointer"
```

---

## No Analog Found

All files have strong codebase analogs. No file requires fallback to external patterns.

---

## Metadata

**Analog search scope:** `app/components/`, `app/paikat/`, `app/page.tsx`, `lib/`
**Files read:** 8 source files (PaikkaKortti.tsx, LiikuntapaikatLista.tsx, Etusivu.tsx, app/paikat/[id]/page.tsx, app/page.tsx, lib/types.ts, lib/lajit.ts, lib/utils.ts, app/components/NavBar.tsx)
**Pattern extraction date:** 2026-05-22
