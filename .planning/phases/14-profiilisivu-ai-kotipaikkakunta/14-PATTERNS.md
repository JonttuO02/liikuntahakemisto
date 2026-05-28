# Phase 14: Profiilisivu & AI-kotipaikkakunta - Pattern Map

**Mapped:** 2026-05-28
**Files analyzed:** 7 new/modified files
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/profiili/page.tsx` | page shell | request-response | `app/suosikit/page.tsx` | exact |
| `app/profiili/ProfiiliClient.tsx` | component (client) | CRUD + request-response | `app/suosikit/SuosikitClient.tsx` | exact |
| `supabase/migrations/{timestamp}_profiles.sql` | migration | CRUD | `supabase/migrations/20260523_suosikit.sql` | role-match (needs UPDATE policy addition) |
| `app/components/NavPill.tsx` (modify) | component (client) | event-driven | self (read existing structure) | self-modification |
| `app/components/Etusivu.tsx` (modify) | component (client) | CRUD + request-response | self (targeted lines 112–281) | self-modification |
| `app/api/saasuositus/route.ts` (modify) | route handler | request-response | self (lines 80–115) | self-modification |
| `lib/saasuositus.test.ts` (new) | test | transform | `lib/` (vitest pattern; no direct test analog) | no analog |

---

## Pattern Assignments

### `app/profiili/page.tsx` (page shell, request-response)

**Analog:** `app/suosikit/page.tsx`

**Full file to copy** (lines 1–11):
```tsx
import NavPill from '@/app/components/NavPill'
import SuosikitClient from './SuosikitClient'

export default function SuosikitPage() {
  return (
    <>
      <NavPill />
      <SuosikitClient />
    </>
  )
}
```

**What to change:** Replace `SuosikitClient` with `ProfiiliClient`. Keep `NavPill` unchanged.

```tsx
import NavPill from '@/app/components/NavPill'
import ProfiiliClient from './ProfiiliClient'

export default function ProfiiliPage() {
  return (
    <>
      <NavPill />
      <ProfiiliClient />
    </>
  )
}
```

---

### `app/profiili/ProfiiliClient.tsx` (component, CRUD)

**Analog:** `app/suosikit/SuosikitClient.tsx`

**Imports pattern** (lines 1–8):
```tsx
'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import Link from 'next/link'
import AuthModal from '@/app/components/AuthModal'
import { createBrowserSupabase, subscribeToAuthUser } from '@/lib/supabaseSSR'
import type { Liikuntapaikka } from '@/lib/types'
```

**What to change in imports:** Replace `Heart` with `User` icon. Remove `Liikuntapaikka` type import (not needed). Keep `AuthModal`, `createBrowserSupabase`, `subscribeToAuthUser`.

```tsx
'use client'

import { useState, useEffect } from 'react'
import { User } from 'lucide-react'
import Link from 'next/link'
import AuthModal from '@/app/components/AuthModal'
import { createBrowserSupabase, subscribeToAuthUser } from '@/lib/supabaseSSR'
```

**AuthState machine pattern** (lines 10–11, 14–15) — copy verbatim:
```tsx
type AuthState = 'loading' | 'unauthenticated' | 'authenticated'

// In component:
const [authState, setAuthState] = useState<AuthState>('loading')
const [authModalOpen, setAuthModalOpen] = useState(false)
```

**New state for ProfiiliClient** (add alongside authState):
```tsx
const [kotikaupunki, setKotikaupunki] = useState<string>('')
const [userId, setUserId] = useState<string | null>(null)
const [saved, setSaved] = useState(false)
```

**subscribeToAuthUser pattern** (lines 19–47) — adapt from SuosikitClient:
```tsx
useEffect(() => {
  const supabase = createBrowserSupabase()

  async function loadProfile(uid: string) {
    const { data } = await supabase
      .from('profiles')
      .select('kotikaupunki')
      .eq('user_id', uid)
      .single()
    // PGRST116 (no row) is expected for new users — treat as empty string
    setKotikaupunki(data?.kotikaupunki ?? '')
  }

  return subscribeToAuthUser((user) => {
    if (user) {
      setAuthState('authenticated')
      setUserId(user.id)
      loadProfile(user.id)
    } else {
      setAuthState('unauthenticated')
      setUserId(null)
      setKotikaupunki('')
    }
  })
}, [])
```

**Loading guard** (lines 49–52) — copy verbatim:
```tsx
if (authState === 'loading') {
  return <div className="min-h-screen bg-white" />
}
```

**Unauthenticated CTA pattern** (lines 54–83) — copy structure, adapt text and icon:
```tsx
if (authState === 'unauthenticated') {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 pb-16">
      <div className="glass w-16 h-16 rounded-2xl flex items-center justify-center mb-5">
        <User className="w-7 h-7 text-[rgba(17,17,17,0.35)]" />
      </div>
      <h1 className="font-serif text-2xl font-bold text-[#111111] mb-2 text-center">
        Profiili vaatii kirjautumisen
      </h1>
      <p className="text-[rgba(17,17,17,0.45)] text-center mb-8 max-w-xs text-sm">
        Kirjaudu sisään nähdäksesi ja muokataksesi profiiliasi.
      </p>
      <button
        onClick={() => setAuthModalOpen(true)}
        className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-6 py-2.5 rounded-full [transition:background-color_150ms_var(--ease-out)]"
      >
        Kirjaudu sisään
      </button>
      <Link
        href="/"
        className="mt-4 text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)] underline underline-offset-2"
      >
        Takaisin hakemistoon
      </Link>
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  )
}
```

**Note:** Use `href="/"` not `href="/?nakyma=lista"` — the list view is being removed in Phase 12.

**Upsert + inline save feedback pattern** (from RESEARCH.md decisions D-03, D-04):
```tsx
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

**Authenticated layout** (adapted from SuosikitClient lines 113–140, RESEARCH.md Pattern layout):
```tsx
// Outer container — matches SuosikitClient authenticated layout
<div className="min-h-screen bg-white px-4 py-8 max-w-2xl mx-auto">
  <h1 className="font-serif text-2xl font-bold text-[#111111] mb-2">Profiili</h1>
  <p className="text-sm text-[rgba(17,17,17,0.45)] mb-6">{user?.email}</p>
  <div className="glass rounded-2xl p-4 flex flex-col gap-3">
    <label className="text-[10px] font-bold text-[#111111] uppercase tracking-widest">
      Kotipaikkakunta
    </label>
    <input
      type="text"
      value={kotikaupunki}
      onChange={e => setKotikaupunki(e.target.value)}
      placeholder="esim. Tampere"
      className="border border-[rgba(0,0,0,0.12)] rounded-xl px-3 py-2 text-sm text-[#111111] bg-white focus:outline-none focus:border-[rgba(0,0,0,0.3)]"
    />
    <button
      onClick={handleSave}
      className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-5 py-2 rounded-full self-start [transition:background-color_150ms_var(--ease-out)]"
    >
      Tallenna
    </button>
    {saved && <p className="text-sm text-green-700">Kotikaupunki tallennettu</p>}
  </div>
  <Link
    href="/"
    className="mt-8 inline-block text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)] underline underline-offset-2"
  >
    Takaisin hakemistoon
  </Link>
</div>
```

---

### `supabase/migrations/{timestamp}_profiles.sql` (migration, CRUD)

**Analog:** `supabase/migrations/20260523_suosikit.sql`

**RLS structure to copy** (lines 1–26 of suosikit migration):
```sql
-- Create suosikit (favorites) table
CREATE TABLE IF NOT EXISTS suosikit (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ...
);
ALTER TABLE suosikit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own suosikit"  ON suosikit FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own suosikit" ON suosikit FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own suosikit" ON suosikit FOR DELETE  USING (auth.uid() = user_id);
```

**Critical difference — profiles needs UPDATE policy (suosikit does not):**
```sql
CREATE TABLE IF NOT EXISTS profiles (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  kotikaupunki text,
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- REQUIRED: profiles upsert path hits UPDATE on second save — suosikit never needed this
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Schema differences from suosikit:**
- `user_id` is `PRIMARY KEY` (no separate `bigserial id`)
- No `UNIQUE` constraint needed (PK enforces uniqueness)
- No `paikka_id` foreign key
- Has `updated_at` column
- No DELETE policy needed (profiles are never deleted; CASCADE handles auth.users deletion)

---

### `app/components/NavPill.tsx` (modify — add Profiili link)

**CRITICAL: NavBar.tsx is dead code.** `NavBarServer.tsx` exists but is never imported by any active page. All secondary pages (`/suosikit`, `/paikat/[id]`, `/tietosuoja`, and new `/profiili`) use `NavPill.tsx`. Changes to `NavBar.tsx` have no visible effect.

**Current expanded content** (lines 56–76):
```tsx
<Link href="/?nakyma=lista" onClick={() => setOpen(false)} className={BTN}>
  <Search className="w-3.5 h-3.5" />
  Haku
</Link>
<Link href="/suosikit" onClick={() => setOpen(false)} className={BTN}>
  <Heart className="w-3.5 h-3.5" />
  Suosikit
</Link>
{user ? (
  <button onClick={handleSignOut} className={BTN}>
    <LogOut className="w-3.5 h-3.5" />
    Kirjaudu ulos
  </button>
) : (
  <button onClick={() => { setAuthModalOpen(true); setOpen(false) }} className={BTN}>
    <User className="w-3.5 h-3.5" />
    Kirjaudu
  </button>
)}
```

**Insert before the Suosikit link** (D-10: Profiili above Suosikit):
```tsx
<Link href="/profiili" onClick={() => setOpen(false)} className={BTN}>
  <User className="w-3.5 h-3.5" />
  Profiili
</Link>
```

**No import change needed** — `User` is already imported at line 6:
```tsx
import { Search, Heart, User, LogOut, MoreHorizontal, X } from 'lucide-react'
```

**Result order:** Haku → Profiili → Suosikit → Kirjaudu ulos / Kirjaudu

---

### `app/components/Etusivu.tsx` (modify — inline pill + auth callback + AI fetch)

**There are three targeted modifications:**

#### Modification 1: Add Profiili link to inline pill (lines 561–609)

**Current inline pill expanded content** (lines 577–608):
```tsx
<button onClick={toggleSearch} className="flex items-center gap-1.5 ...">
  <Search className="w-3.5 h-3.5" />
  Haku
</button>
<Link href="/suosikit" onClick={closeOverlays} className="flex items-center gap-1.5 ...">
  <Heart className="w-3.5 h-3.5" />
  Suosikit
</Link>
{supabaseUser ? (
  <button onClick={...} className="flex items-center gap-1.5 ...">
    <LogOut className="w-3.5 h-3.5" />
    Kirjaudu ulos
  </button>
) : (
  <button onClick={() => { setAuthModalOpen(true); closeOverlays() }} className="flex items-center gap-1.5 ...">
    <User className="w-3.5 h-3.5" />
    Kirjaudu
  </button>
)}
```

**Insert before the Suosikit Link** (same BTN class as NavPill pattern, matching line 580 class):
```tsx
<Link
  href="/profiili"
  onClick={closeOverlays}
  className="flex items-center gap-1.5 px-3 h-8 rounded-full glass-btn text-sm font-bold text-[rgba(17,17,17,0.7)] hover:text-[#111111] [transition:color_150ms_ease]"
>
  <User className="w-3.5 h-3.5" />
  Profiili
</Link>
```

**`User` is already imported** at Etusivu.tsx line 7 — no import change needed.

#### Modification 2: Add kotikaupunki state + profiles fetch to auth callback (lines 112, 220–231)

**Current state block** (line 112):
```tsx
const [suosikitIds, setSuosikitIds] = useState<Set<number>>(new Set())
```

**Add after line 112:**
```tsx
const [kotikaupunki, setKotikaupunki] = useState<string>('')
```

**Current auth callback** (lines 220–231):
```tsx
useEffect(() => {
  const supabase = createBrowserSupabase()
  return subscribeToAuthUser(async (user) => {
    setSupabaseUser(user)
    if (user) {
      const { data } = await supabase.from('suosikit').select('paikka_id').eq('user_id', user.id)
      if (data) setSuosikitIds(new Set(data.map((s: { paikka_id: number }) => s.paikka_id)))
    } else {
      setSuosikitIds(new Set())
    }
  })
}, [])
```

**Modified auth callback** — add profiles fetch after suosikit fetch:
```tsx
useEffect(() => {
  const supabase = createBrowserSupabase()
  return subscribeToAuthUser(async (user) => {
    setSupabaseUser(user)
    if (user) {
      const { data } = await supabase.from('suosikit').select('paikka_id').eq('user_id', user.id)
      if (data) setSuosikitIds(new Set(data.map((s: { paikka_id: number }) => s.paikka_id)))
      // NEW: load kotikaupunki from profiles (PGRST116 = no row yet, safe to ignore)
      const { data: profileData } = await supabase.from('profiles').select('kotikaupunki').eq('user_id', user.id).single()
      setKotikaupunki(profileData?.kotikaupunki ?? '')
    } else {
      setSuosikitIds(new Set())
      setKotikaupunki('')  // NEW
    }
  })
}, [])
```

#### Modification 3: Change AI fetch logic (lines 252–281)

**Current AI fetch logic** (lines 252–281):
```tsx
useEffect(() => {
  const key = 'saasuositus-' + new Date().toISOString().slice(0, 10)
    + '-' + weatherKaupunki
    + (suosikitIds.size > 0 ? '-' + suosikitIds.size : '')
  try {
    const cached = sessionStorage.getItem(key)
    if (cached) { setAiTeksti(cached); return }
  } catch {}

  const suosikkiNimet = Array.from(suosikitIds)
    .slice(0, 10)
    .map(id => paikat.find(p => p.id === id)?.nimi)
    .filter(Boolean) as string[]

  const fetchPromise = suosikkiNimet.length > 0          // <-- CHANGE THIS LINE
    ? fetch('/api/saasuositus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suosikit: suosikkiNimet, kaupunki: weatherKaupunki }) })
    : fetch('/api/saasuositus?kaupunki=' + encodeURIComponent(weatherKaupunki))
  ...
}, [suosikitSizeAndIds, weatherKaupunki])
```

**Modified AI fetch logic** (D-06: POST when user !== null; D-07: body gains kotikaupunki):
```tsx
const fetchPromise = supabaseUser !== null              // changed from suosikkiNimet.length > 0
  ? fetch('/api/saasuositus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suosikit: suosikkiNimet,
        kaupunki: weatherKaupunki,
        ...(kotikaupunki ? { kotikaupunki } : {}),     // D-07 addition
      })
    })
  : fetch('/api/saasuositus?kaupunki=' + encodeURIComponent(weatherKaupunki))
```

**Dependency array stays the same** (D-11: cache key does NOT include kotikaupunki):
```tsx
}, [suosikitSizeAndIds, weatherKaupunki])
```

---

### `app/api/saasuositus/route.ts` (modify — POST handler kotikaupunki extension)

**Analog:** self (lines 80–115)

**Current POST body parsing** (lines 80–92):
```typescript
export async function POST(request: Request) {
  let suosikit: string[] = []
  let kaupunki = 'Tampere'
  try {
    const body = await request.json()
    suosikit = Array.isArray(body.suosikit)
      ? body.suosikit
          .slice(0, 10)
          .filter((s: unknown): s is string => typeof s === 'string')
          .map((s: string) => s.replace(/[^\w\sÄäÖöÅå\-,.'()&]/g, '').slice(0, 80))
      : []
    if (typeof body.kaupunki === 'string') kaupunki = body.kaupunki
  } catch {}
```

**Modified POST body parsing** — add kotikaupunki after kaupunki parse (same sanitization pattern):
```typescript
export async function POST(request: Request) {
  let suosikit: string[] = []
  let kaupunki = 'Tampere'
  let kotikaupunki: string | undefined
  try {
    const body = await request.json()
    suosikit = Array.isArray(body.suosikit)
      ? body.suosikit
          .slice(0, 10)
          .filter((s: unknown): s is string => typeof s === 'string')
          .map((s: string) => s.replace(/[^\w\sÄäÖöÅå\-,.'()&]/g, '').slice(0, 80))
      : []
    if (typeof body.kaupunki === 'string') kaupunki = body.kaupunki
    // NEW: kotikaupunki — sanitize same as suosikit names; 80-char limit (D-08)
    if (typeof body.kotikaupunki === 'string' && body.kotikaupunki.trim()) {
      kotikaupunki = body.kotikaupunki
        .replace(/[^\w\sÄäÖöÅå\-,.'()&]/g, '')
        .slice(0, 80)
        .trim()
    }
  } catch {}
```

**Current prompt construction** (lines 97–101):
```typescript
const suosikkiLista = suosikit.length
  ? `\nKäyttäjän suosikit: ${suosikit.join(', ')}.`
  : ''

const prompt = `Tänään on ${day} ${kaupunki}ssa. ... Älä käytä emojeja.${suosikkiLista}`
```

**Modified prompt construction** — add reissussa context after suosikkiLista (D-12: only when cities differ):
```typescript
const suosikkiLista = suosikit.length
  ? `\nKäyttäjän suosikit: ${suosikit.join(', ')}.`
  : ''

// NEW: reissussa context — only when kotikaupunki is set AND differs from current city (D-12)
const reissuKonteksti = (kotikaupunki &&
  kotikaupunki.trim().toLowerCase() !== kaupunki.trim().toLowerCase())
  ? ` Käyttäjä vierailee ${kaupunki}ssa — hänen kotikaupunkinsa on ${kotikaupunki}.`
  : ''

const prompt = `Tänään on ${day} ${kaupunki}ssa. Lämpötila on ${temp}°C ja sää on ${weatherDesc}. Kirjoita YKSI lyhyt suomenkielinen lause joka suosittelee sopivaa liikuntapalvelua tai -lajia tähän säähän ${kaupunki}ssa. Mainitse "${kaupunki}" tai viittaa liikuntapaikan löytämiseen. Älä käytä emojeja.${suosikkiLista}${reissuKonteksti}`
```

---

### `lib/saasuositus.test.ts` (new test file)

**No close analog** — the only test file location is `lib/**/*.test.ts` per vitest config. No existing test file covers route handler logic.

**Test framework pattern** (from vitest config — `include: ['lib/**/*.test.ts']`):
```typescript
import { describe, it, expect } from 'vitest'

// Extract the reissussa logic into a pure helper in lib/ for testability:
// lib/buildPrompt.ts (or inline in route.ts and re-export)
function buildReissuKonteksti(kotikaupunki: string | undefined, kaupunki: string): string {
  if (!kotikaupunki) return ''
  return kotikaupunki.trim().toLowerCase() !== kaupunki.trim().toLowerCase()
    ? ` Käyttäjä vierailee ${kaupunki}ssa — hänen kotikaupunkinsa on ${kotikaupunki}.`
    : ''
}

describe('buildReissuKonteksti', () => {
  it('appends context when cities differ', () => {
    expect(buildReissuKonteksti('Tampere', 'Helsinki')).toContain('kotikaupunkinsa on Tampere')
  })
  it('returns empty string when cities match (case-insensitive)', () => {
    expect(buildReissuKonteksti('tampere', 'Tampere')).toBe('')
  })
  it('returns empty string when kotikaupunki is undefined', () => {
    expect(buildReissuKonteksti(undefined, 'Tampere')).toBe('')
  })
  it('returns empty string when kotikaupunki is empty after trim', () => {
    expect(buildReissuKonteksti('   ', 'Tampere')).toBe('')
  })
})
```

---

## Shared Patterns

### Auth State Machine
**Source:** `app/suosikit/SuosikitClient.tsx` lines 10, 14, 38–46
**Apply to:** `app/profiili/ProfiiliClient.tsx`
```tsx
type AuthState = 'loading' | 'unauthenticated' | 'authenticated'
const [authState, setAuthState] = useState<AuthState>('loading')

// In subscribeToAuthUser callback:
if (user) { setAuthState('authenticated') }
else       { setAuthState('unauthenticated') }
```

### Browser Supabase Singleton
**Source:** `lib/supabaseSSR.ts` lines 22–39 (`createBrowserSupabase`) and lines 44–48 (`subscribeToAuthUser`)
**Apply to:** `ProfiiliClient.tsx`, `Etusivu.tsx` auth callback
```typescript
// createBrowserSupabase() is a singleton — call it inside useEffect or handlers, not at module level
const supabase = createBrowserSupabase()
// subscribeToAuthUser fires immediately with current user, then on every auth change
return subscribeToAuthUser((user) => { ... })
```

### Button / CTA Styling
**Source:** `app/suosikit/SuosikitClient.tsx` line 68
**Apply to:** `ProfiiliClient.tsx` (Kirjaudu sisään button, Tallenna button)
```tsx
className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-6 py-2.5 rounded-full [transition:background-color_150ms_var(--ease-out)]"
```

### Muted Secondary Text
**Source:** `app/suosikit/SuosikitClient.tsx` lines 63, 128
**Apply to:** `ProfiiliClient.tsx` (user email display, subtitle)
```tsx
className="text-[rgba(17,17,17,0.45)] text-sm"     // body muted text
className="text-sm text-[rgba(17,17,17,0.45)]"     // address/subtitle variant
```

### NavPill Link Item (BTN class)
**Source:** `app/components/NavPill.tsx` line 10
**Apply to:** New Profiili link in `NavPill.tsx` and `Etusivu.tsx` inline pill
```tsx
const BTN = 'flex items-center gap-1.5 px-3 h-8 rounded-full glass-btn text-sm font-bold text-[rgba(17,17,17,0.7)] hover:text-[#111111] [transition:color_150ms_ease]'
// Etusivu inline pill uses the expanded inline version of this class (line 580):
className="flex items-center gap-1.5 px-3 h-8 rounded-full glass-btn text-sm font-bold text-[rgba(17,17,17,0.7)] hover:text-[#111111] [transition:color_150ms_ease]"
```

### Input Sanitization for AI Prompt
**Source:** `app/api/saasuositus/route.ts` line 89
**Apply to:** `kotikaupunki` parsing in same file
```typescript
.replace(/[^\w\sÄäÖöÅå\-,.'()&]/g, '').slice(0, 80)
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `lib/saasuositus.test.ts` | test | transform | No existing unit test files for route handler logic; vitest config exists but no test files in `lib/` test pure route logic yet |

---

## Critical Warnings for Planner

1. **NavBar.tsx is dead code.** `NavBar.tsx` and `NavBarServer.tsx` are not imported by any active page. The Profiili link MUST go into `NavPill.tsx` (secondary pages) AND the inline expanding pill in `Etusivu.tsx` (lines ~577–608). Any change to `NavBar.tsx` will be invisible in the app.

2. **RLS migration needs UPDATE policy.** The `suosikit` migration reference has no UPDATE policy (favorites only need INSERT/DELETE). `profiles` needs INSERT + UPDATE + SELECT — omitting UPDATE will cause the second save to be rejected with a policy violation.

3. **`.single()` returns PGRST116 for new users.** When no row exists in `profiles` (new user, never saved), `.single()` returns an error. Ignore the error and default to empty string: `data?.kotikaupunki ?? ''`.

4. **POST trigger change in Etusivu.** The AI fetch condition changes from `suosikkiNimet.length > 0` to `supabaseUser !== null` (D-06). This is a behavioral change — authenticated users with zero favorites will now send POST instead of GET.

5. **Cache key unchanged** (D-11). Do NOT add `kotikaupunki` to the cache key string at line 253–255 of Etusivu.tsx.

---

## Metadata

**Analog search scope:** `app/suosikit/`, `app/components/NavPill.tsx`, `app/components/Etusivu.tsx`, `app/api/saasuositus/route.ts`, `supabase/migrations/`, `lib/supabaseSSR.ts`
**Files read:** 8
**Pattern extraction date:** 2026-05-28
