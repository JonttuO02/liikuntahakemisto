# Phase 15: Arvostelut - Pattern Map

**Mapped:** 2026-05-28
**Files analyzed:** 7 (6 new + 1 modified)
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/20260528_reviews.sql` | migration | CRUD | `supabase/migrations/20260528083110_profiles.sql` + `supabase/migrations/20260523_suosikit.sql` | exact |
| `lib/reviewUtils.ts` | utility | transform | `lib/buildReissuKonteksti.ts` | role-match |
| `lib/reviewUtils.test.ts` | test | — | `lib/saasuositus.test.ts` | exact |
| `app/components/StarPicker.tsx` | component | request-response | `app/components/HeartButton.tsx` (motion.button + whileTap) | role-match |
| `app/components/ReviewSection.tsx` | component | request-response | `app/paikat/[id]/page.tsx` (glass card shell, layout) | role-match |
| `app/components/ReviewForm.tsx` | component | request-response | `app/components/HeartButton.tsx` + `app/profiili/ProfiiliClient.tsx` | exact |
| `app/paikat/[id]/page.tsx` (modified) | route/server | request-response | self (already read) | exact |

---

## Pattern Assignments

### `supabase/migrations/20260528_reviews.sql` (migration, CRUD)

**Analogs:** `supabase/migrations/20260528083110_profiles.sql` (RLS pattern) + `supabase/migrations/20260523_suosikit.sql` (table schema pattern)

**Schema pattern from `supabase/migrations/20260523_suosikit.sql` (lines 1–8):**
```sql
CREATE TABLE IF NOT EXISTS suosikit (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paikka_id   bigint NOT NULL REFERENCES liikuntapaikat(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, paikka_id)
);
```

**RLS pattern from `supabase/migrations/20260528083110_profiles.sql` (lines 9–25):**
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**What to change for reviews:**
- `id bigserial PRIMARY KEY` — same as suosikit (not uuid PK like profiles)
- `UNIQUE(user_id, paikka_id)` — same as suosikit
- SELECT policy uses `USING (true)` instead of `USING (auth.uid() = user_id)` — reviews are publicly readable (REVIEW-04)
- No DELETE policy (same as profiles.sql — reviews are edit-only per D-03)
- Add columns not in analogs: `rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5)`, `teksti text NOT NULL DEFAULT ''`, `is_anonymous boolean NOT NULL DEFAULT false`, `visit_date date`, `crowd_rating text CHECK (crowd_rating IN ('hiljaista', 'sopivasti', 'ruuhkaista'))`, `reviewer_name text`, `updated_at timestamptz NOT NULL DEFAULT now()`

---

### `lib/reviewUtils.ts` (utility, transform)

**Analog:** `lib/buildReissuKonteksti.ts`

**Pure function structure pattern (lines 1–20):**
```typescript
/**
 * JSDoc comment describing inputs, outputs, and edge cases.
 * Returns '' when: [list edge cases explicitly]
 */
export function buildReissuKonteksti(
  kotikaupunki: string | undefined,
  kaupunki: string
): string {
  if (!kotikaupunki || kotikaupunki.trim() === '') return ''
  if (kotikaupunki.trim().toLowerCase() === kaupunki.trim().toLowerCase()) return ''
  return ` Käyttäjä vierailee ${kaupunki}ssa — hänen kotikaupunkinsa on ${kotikaupunki}.`
}
```

**What to implement in reviewUtils.ts — three pure functions:**

1. `resolveDisplayName(isAnonymous: boolean, reviewerName: string | null): string`
   - Returns `'Anonyymi'` when `isAnonymous === true`
   - Returns `reviewerName` when not anonymous and name is present
   - Returns `'Anonyymi'` as fallback when not anonymous but name is null/empty

2. `computeAvgRating(ratings: number[]): number | null`
   - Returns `null` when array is empty
   - Returns `reviews.reduce((sum, r) => sum + r, 0) / reviews.length` otherwise
   - Round to 1 decimal at render time, not here (keep pure computation)

3. `formatCrowdRating(value: string | null): string`
   - Maps `'hiljaista'` → `'Hiljaista'`, `'sopivasti'` → `'Sopivasti'`, `'ruuhkaista'` → `'Ruuhkaista'`
   - Returns `''` for null/unknown values

---

### `lib/reviewUtils.test.ts` (test)

**Analog:** `lib/saasuositus.test.ts`

**Test file structure pattern (lines 1–26):**
```typescript
import { describe, it, expect } from 'vitest'
import { buildReissuKonteksti } from './buildReissuKonteksti'
import { sanitizeKotikaupunki } from './sanitizeKotikaupunki'

describe('buildReissuKonteksti', () => {
  it('appends context when cities differ', () => {
    const result = buildReissuKonteksti('Tampere', 'Helsinki')
    expect(result).toContain('kotikaupunkinsa on Tampere')
  })

  it('returns empty string when kotikaupunki is undefined', () => {
    expect(buildReissuKonteksti(undefined, 'Tampere')).toBe('')
  })

  it('returns empty string when kotikaupunki is whitespace-only after trim', () => {
    expect(buildReissuKonteksti('   ', 'Tampere')).toBe('')
  })
})
```

**What to change for reviewUtils.test.ts:**
- Import `resolveDisplayName`, `computeAvgRating`, `formatCrowdRating` from `./reviewUtils`
- `describe('resolveDisplayName')`: test anonymous → `'Anonyymi'`, named → name string, null name when not anonymous → `'Anonyymi'`
- `describe('computeAvgRating')`: test empty array → `null`, `[3, 5]` → `4`, `[1]` → `1`
- `describe('formatCrowdRating')`: test `null` → `''`, `'hiljaista'` → `'Hiljaista'`, `'ruuhkaista'` → `'Ruuhkaista'`
- Run with: `npx vitest run lib/reviewUtils.test.ts`

---

### `app/components/StarPicker.tsx` (component, request-response)

**Analog:** `app/components/HeartButton.tsx` (motion.button + whileTap pattern)

**Imports pattern from `app/components/HeartButton.tsx` (lines 1–8):**
```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createBrowserSupabase, subscribeToAuthUser } from '@/lib/supabaseSSR'
import AuthModal from './AuthModal'
```

**What StarPicker needs (adapted imports):**
```typescript
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
```

**motion.button + whileTap pattern from `app/components/HeartButton.tsx` (lines 66–73):**
```tsx
<motion.button
  whileTap={{ scale: 0.85, transition: { duration: 0.12, ease: 'easeOut' } }}
  onClick={toggle}
  className="glass-btn w-10 h-10 rounded-full flex items-center justify-center shrink-0"
  aria-label={isSuosikki ? 'Poista suosikeista' : 'Lisää suosikkeihin'}
>
  <Heart className={cn('w-5 h-5', isSuosikki ? 'fill-[#111111] text-[#111111]' : 'text-[rgba(17,17,17,0.35)]')} />
</motion.button>
```

**Filter pill toggle pattern (active/inactive) from `app/components/Etusivu.tsx` (lines 786–795):**
```tsx
<motion.button
  key={label}
  onClick={() => setSearchHinta(max)}
  whileTap={{ scale: 0.96, transition: { duration: 0.1 } }}
  className={`h-8 px-3 rounded-full text-xs font-bold [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)]
    ${searchHinta === max ? 'bg-[#111111] text-white' : 'glass text-[rgba(17,17,17,0.6)] hover:text-[#111111]'}`}
>
  {label}
</motion.button>
```

**What to change for StarPicker:**
- Props: `value: number; onChange: (n: number) => void`
- Local state: `hovered: number` (0 = no hover)
- `display = hovered || value` drives filled/empty star rendering
- 5 `motion.button` elements with `whileTap={{ scale: 0.95, transition: { duration: 0.12, ease: 'easeOut' } }}`
- `onMouseEnter={() => setHovered(n)}` on each button; `onMouseLeave={() => setHovered(0)}` on the container div
- Star character: Unicode `★`; filled = `text-amber-400`, empty = `text-[rgba(17,17,17,0.2)]`
- `aria-label={`${n} tähteä`}` on each button; `role="group" aria-label="Tähtiarvosana"` on container

---

### `app/components/ReviewSection.tsx` (component, request-response)

**Analog:** `app/paikat/[id]/page.tsx` (glass card layout, spacing conventions)

**Glass card container pattern from `app/paikat/[id]/page.tsx` (lines 72–76):**
```tsx
<div className="max-w-2xl mx-auto px-4 pt-6 pb-10">
  <div className="glass rounded-2xl overflow-hidden">
    <div className="p-6 sm:p-8 flex flex-col gap-5">
      {/* content rows */}
    </div>
  </div>
</div>
```

**Label caps style from `app/paikat/[id]/page.tsx` (line 145):**
```tsx
<p className="text-[10px] font-bold text-[rgba(17,17,17,0.4)] uppercase tracking-widest mb-0.5">{label}</p>
```

**Muted text style (for empty state, review count, timestamps):**
```tsx
className="text-sm text-[rgba(17,17,17,0.45)]"
```

**"Näytä kaikki" / underline link button (self-start, no border):**
```tsx
// Pattern from ProfiiliClient.tsx (lines 87-89) — underline link style
className="mt-4 text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)] underline underline-offset-2"
```

**What to implement in ReviewSection.tsx:**
- `'use client'` — needs `useState` for `showAll` toggle
- Props: `paikkaId: number`, `initialReviews: Review[]`, `avgRating: number | null`, `reviewCount: number`
- Container: `<div className="max-w-2xl mx-auto px-4 pb-10">` → `<div className="glass rounded-2xl p-6 sm:p-8 flex flex-col gap-5">`
- Render order: `<StarAverage />` → `<ReviewForm paikkaId={paikkaId} />` → divider → `<ReviewList />`
- `displayed = showAll ? initialReviews : initialReviews.slice(0, 5)`
- "Näytä kaikki" button only if `initialReviews.length > 5` and `!showAll`
- `StarAverage` inline: filled Unicode stars + numeric + count in parentheses
- `ReviewCard` inline or as named export: star display + `resolveDisplayName(r.is_anonymous, r.reviewer_name)` + `r.teksti`

---

### `app/components/ReviewForm.tsx` (component, request-response)

**Analog:** `app/components/HeartButton.tsx` (auth subscription) + `app/profiili/ProfiiliClient.tsx` (three-state auth machine + upsert)

**Imports pattern from `app/profiili/ProfiiliClient.tsx` (lines 1–7):**
```typescript
'use client'

import { useState, useEffect } from 'react'
import { User } from 'lucide-react'
import Link from 'next/link'
import AuthModal from '@/app/components/AuthModal'
import { createBrowserSupabase, subscribeToAuthUser } from '@/lib/supabaseSSR'
```

**Three-state auth type + useState from `app/profiili/ProfiiliClient.tsx` (lines 9–17):**
```typescript
type AuthState = 'loading' | 'unauthenticated' | 'authenticated'

export default function ProfiiliClient() {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [kotikaupunki, setKotikaupunki] = useState<string>('')
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [saved, setSaved] = useState(false)
```

**subscribeToAuthUser useEffect pattern from `app/profiili/ProfiiliClient.tsx` (lines 19–44):**
```typescript
useEffect(() => {
  const supabase = createBrowserSupabase()

  async function loadProfile(uid: string) {
    const { data } = await supabase
      .from('profiles')
      .select('kotikaupunki')
      .eq('user_id', uid)
      .single()
    setKotikaupunki(data?.kotikaupunki ?? '')
  }

  return subscribeToAuthUser((user) => {
    if (user) {
      setAuthState('authenticated')
      setUserId(user.id)
      setUserEmail(user.email ?? '')
      loadProfile(user.id)
    } else {
      setAuthState('unauthenticated')
      setUserId(null)
      setKotikaupunki('')
    }
  })
}, [])
```

**HeartButton maybeSingle() pattern (use this, NOT .single()) from `app/components/HeartButton.tsx` (line 24):**
```typescript
const { data } = await supabase.from('suosikit').select('id').eq('user_id', user.id).eq('paikka_id', paikkaId).maybeSingle()
```

**upsert pattern from `app/profiili/ProfiiliClient.tsx` (lines 46–59):**
```typescript
async function handleSave() {
  if (!userId) return
  const supabase = createBrowserSupabase()
  const trimmed = kotikaupunki.trim()
  const { error } = await supabase
    .from('profiles')
    .upsert(
      { user_id: userId, kotikaupunki: trimmed, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  if (!error) {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }
}
```

**AuthModal open/close from `app/profiili/ProfiiliClient.tsx` (lines 67–95):**
```tsx
if (authState === 'unauthenticated') {
  return (
    <div className="...">
      <button
        onClick={() => setAuthModalOpen(true)}
        className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-6 py-2.5 rounded-full [transition:background-color_150ms_var(--ease-out)]"
      >
        Kirjaudu sisään
      </button>
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  )
}
```

**Text input style from `app/profiili/ProfiiliClient.tsx` (lines 108–113):**
```tsx
<input
  type="text"
  value={kotikaupunki}
  onChange={e => setKotikaupunki(e.target.value)}
  placeholder="esim. Tampere"
  className="border border-[rgba(0,0,0,0.12)] rounded-xl px-3 py-2 text-sm text-[#111111] bg-white focus:outline-none focus:border-[rgba(0,0,0,0.3)]"
/>
```

**Primary button style from `app/profiili/ProfiiliClient.tsx` (lines 115–118):**
```tsx
<button
  onClick={handleSave}
  className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-5 py-2 rounded-full self-start [transition:background-color_150ms_var(--ease-out)]"
>
  Tallenna
</button>
```

**What to change for ReviewForm.tsx:**
- `currentUser = useRef<{ id: string; email?: string } | null>(null)` (from HeartButton pattern — ref for async handlers)
- Existing review check: `.from('reviews').select('*').eq('user_id', user.id).eq('paikka_id', paikkaId).maybeSingle()` — use `maybeSingle()`, never `single()`
- `upsert` target: `{ onConflict: 'user_id,paikka_id' }` (composite constraint from reviews table)
- `updated_at: new Date().toISOString()` included in upsert payload
- `reviewer_name` populated at write time: `user.email?.split('@')[0] ?? null`
- After successful upsert: call `router.refresh()` from `useRouter()` to revalidate server data (Pitfall 6)
- Auth states rendered:
  - `'loading'`: skeleton / null (no flash)
  - `'unauthenticated'`: greyed form + "Kirjaudu arvostellaksesi" button → `AuthModal` (D-02)
  - `'authenticated'` + no existing review: full form (StarPicker + textarea + date + crowd pills + submit)
  - `'authenticated'` + existing review: pre-populated form with "Muokkaa arvostelu" toggle (D-03)
- Crowd pills: `whileTap={{ scale: 0.95 }}` + active = `bg-[#111111] text-white` / inactive = `border border-[rgba(0,0,0,0.12)] text-[#111111]` (Etusivu filter pill pattern)

---

### `app/paikat/[id]/page.tsx` (modified, server component)

**Analog:** self

**Existing supabase query pattern (lines 15–25):**
```typescript
export default async function PaikkaPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase(cookies())
  const id = Number(params.id)
  if (!Number.isInteger(id) || id < 1) notFound()

  const { data: paikka } = await supabase
    .from('liikuntapaikat')
    .select('*')
    .eq('id', id)
    .single()

  if (!paikka) notFound()
```

**New import to add at top of file (after existing imports):**
```typescript
import ReviewSection from '@/app/components/ReviewSection'
```

**New query to add after `paikka` fetch (before return):**
```typescript
const { data: reviews } = await supabase
  .from('reviews')
  .select('id, rating, teksti, is_anonymous, reviewer_name, created_at')
  .eq('paikka_id', id)
  .order('created_at', { ascending: false })

const reviewList = reviews ?? []
const avgRating = reviewList.length > 0
  ? reviewList.reduce((sum, r) => sum + r.rating, 0) / reviewList.length
  : null
```

**Slot ReviewSection after closing `</div>` of content card (line 133), inside the page wrapper:**
```tsx
{/* ── Reviews ──────────────────────────────────────── */}
<ReviewSection
  paikkaId={id}
  initialReviews={reviewList}
  avgRating={avgRating}
  reviewCount={reviewList.length}
/>
```

---

## Shared Patterns

### Auth subscription (apply to ReviewForm.tsx)
**Source:** `app/components/HeartButton.tsx` lines 19–30, `lib/supabaseSSR.ts` lines 44–48

```typescript
// subscribeToAuthUser fires immediately with current state, then on every change.
// Returns an unsubscribe function — return it from useEffect for cleanup.
useEffect(() => {
  const supabase = createBrowserSupabase()
  return subscribeToAuthUser(async (user) => {
    currentUser.current = user
    if (user) {
      setAuthState('authenticated')
      // load existing review here with .maybeSingle()
    } else {
      setAuthState('unauthenticated')
    }
  })
}, [paikkaId])
```

### AuthModal rendering (apply to ReviewForm.tsx)
**Source:** `app/components/HeartButton.tsx` lines 75–89

```tsx
<AuthModal
  open={authModalOpen}
  onClose={() => setAuthModalOpen(false)}
  pendingPaikkaId={paikkaId}
  onSuccess={async () => {
    setAuthModalOpen(false)
    // re-check auth state; subscribeToAuthUser will fire automatically
  }}
/>
```

### Error handling (apply to ReviewForm.tsx)
**Source:** `app/components/HeartButton.tsx` lines 53–62

```typescript
if (error) {
  console.error('[HeartButton] insert error:', error)
  setIsSuosikki(wasSaved)  // revert optimistic update
}
```
For ReviewForm: log error, set `submitError` state, render `<p className="text-sm text-red-600">{error message}</p>`.

### Glass card surface (apply to ReviewSection.tsx)
**Source:** `app/globals.css` lines 26–36, `app/paikat/[id]/page.tsx` lines 72–76

```tsx
<div className="max-w-2xl mx-auto px-4 pb-10">
  <div className="glass rounded-2xl p-6 sm:p-8 flex flex-col gap-5">
    {/* content */}
  </div>
</div>
```
Always `.glass rounded-2xl` — never replicate glassmorphism inline.

### Transition class (apply to all interactive elements)
**Source:** `app/profiili/ProfiiliClient.tsx` line 81

```tsx
[transition:background-color_150ms_var(--ease-out)]
```
Use this on buttons instead of Tailwind `transition-colors`. The `--ease-out` CSS variable is defined in `globals.css`.

### Filter pill toggle active/inactive (apply to crowd rating pills in ReviewForm.tsx)
**Source:** `app/components/Etusivu.tsx` lines 786–795

```tsx
// Active pill
className="h-8 px-3 rounded-full text-xs font-bold bg-[#111111] text-white [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)]"

// Inactive pill
className="h-8 px-3 rounded-full text-xs font-bold glass text-[rgba(17,17,17,0.6)] hover:text-[#111111] [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)]"
```

### Upsert with conflict target (apply to ReviewForm.tsx submit handler)
**Source:** `app/profiili/ProfiiliClient.tsx` lines 51–56

```typescript
const { error } = await supabase
  .from('profiles')
  .upsert(
    { user_id: userId, kotikaupunki: trimmed, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
// For reviews: onConflict: 'user_id,paikka_id' (composite key)
```

---

## No Analog Found

No files are without a close analog. All 7 files have strong matches.

---

## Critical Pitfalls (from RESEARCH.md — enforce in plan actions)

| Pitfall | Correct Pattern |
|---------|----------------|
| `.single()` for existence check | Always `.maybeSingle()` — `.single()` throws on 0 rows (PGRST116) |
| Upsert conflict mismatch | `onConflict: 'user_id,paikka_id'` — must match composite UNIQUE constraint exactly |
| Re-fetching reviews on auth change | Reviews list is static — only ReviewForm re-queries (for existing review), never ReviewList |
| Stale average after submit | Call `router.refresh()` from `useRouter()` after successful upsert |
| Anonymous name leaking | `resolveDisplayName(r.is_anonymous, r.reviewer_name)` — never render `user_id` or email |
| Date format to Supabase | `<input type="date">` `.value` is already `YYYY-MM-DD` — pass directly, never `new Date().toISOString()` |

---

## Metadata

**Analog search scope:** `app/components/`, `app/paikat/[id]/`, `app/profiili/`, `supabase/migrations/`, `lib/`
**Files read:** 10
**Pattern extraction date:** 2026-05-28
