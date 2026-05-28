# Phase 14: Profiilisivu & AI-kotipaikkakunta - Research

**Researched:** 2026-05-28
**Domain:** Next.js App Router, Supabase RLS, Anthropic AI prompt engineering
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Kotikaupunki-upsert toteutetaan browser client + RLS — sama arkkitehtuuri kuin `suosikit`-taulussa. Ei uutta Route Handleria. RLS-politiikka pakottaa `auth.uid() = user_id`.

**D-02:** Minimaalinen schema: `user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`, `kotikaupunki text`, `updated_at timestamptz DEFAULT now()`.

**D-03:** Profiles-rivi luodaan upsert save-painikkeella — ei DB-triggeriä rekisteröinnissä.

**D-04:** Tallennuksen onnistuminen näytetään inline-tekstinä ("Kotikaupunki tallennettu"), joka häipyy 2–3 sekunnissa. Ei toast-kirjastoa.

**D-05:** Kotikaupunki ladataan Etusivussa `subscribeToAuthUser`-callbackissa kirjautumisen yhteydessä — samaan aikaan kuin suosikit-haku.

**D-06:** Kirjautunut käyttäjä lähettää aina POST `/api/saasuositus`:lle (myös ilman suosikkeja tai kotikaupunkia). GET-kutsu on vain anonyymille käyttäjälle.

**D-07:** POST body laajenee: `{ suosikit: string[], kaupunki: string, kotikaupunki?: string }`.

**D-08:** Route Handler jättää kotikaupunkikontekstin kokonaan pois promptista jos `kotikaupunki` on tyhjä tai puuttuu body:stä.

**D-09:** NavBar hamburger-dropdown saa "Profiili"-linkin — näkyy kaikille.

**D-10:** "Profiili"-linkki sijoitetaan Suosikit-linkin yläpuolelle dropdownissa.

**D-11:** Cache-avain ei sisällä kotikaupunkia — päivävaihdos invalidoi cachen.

**D-12:** Kotikaupunkikonteksti lisätään promptiin vain reissussa-skenaariossa (kotikaupunki != nykyinen kaupunki).

### Claude's Discretion

- Route Handler -prompting: miten muotoillaan reissussa-konteksti
- ProfiiliClient-komponentin visuaalinen layout
- Etusivun kotikaupunki-staten tarkka nimi ja missä kohtaa subscribeToAuthUser-callbackia haku tehdään

### Deferred Ideas (OUT OF SCOPE)

- Laaja käyttäjäprofiili (display_name, bio, profiilikuva) — v2.0
- Kirjaudu ulos -nappi profiilisivulla
- Kotikaupunki-autocomplete (SUOMI_KAUPUNGIT-lista ehdotuksina)

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-04 | Kirjautuneella käyttäjällä on profiilisivu (`/profiili`) jossa näkyy sähköpostiosoite ja voi asettaa kotipaikkakuntansa (vapaa tekstikenttä) — muutos tallentuu Supabaseen | Supabase upsert + RLS migration pattern (identical to suosikit); SuosikitClient.tsx provides complete authState machine to copy |
| AI-05 | Kirjautunut käyttäjä voi asettaa kotipaikkakuntansa profiiliin; kotipaikkakunta ja nykyinen sijaintikaupunki lisätään `/api/saasuositus`-promptiin kontekstiksi | POST handler already accepts `kaupunki`; extend body parsing to accept `kotikaupunki`; prompt string construction is simple template literal |

</phase_requirements>

---

## Summary

Phase 14 follows the same architecture as Phase 9 (auth + suosikit) almost exactly. The `profiles` Supabase table is structurally simpler than `suosikit` (single row per user, no foreign key to `liikuntapaikat`). Three areas of work exist: (1) a new `/profiili` page as a server shell + `ProfiiliClient` client component, (2) extending `Etusivu.tsx` to load `kotikaupunki` in the auth callback and change POST logic, and (3) extending `/api/saasuositus` to accept and use `kotikaupunki` in the prompt.

The primary reference pattern (`SuosikitClient.tsx`) is a near-complete blueprint for `ProfiiliClient.tsx`. The auth state machine (`'loading' | 'unauthenticated' | 'authenticated'`), `subscribeToAuthUser` usage, `createBrowserSupabase` singleton, and the unauthenticated CTA layout can all be copied verbatim from `SuosikitClient.tsx`.

**Critical navigation finding:** CONTEXT.md says "NavBar hamburger-dropdown" but the live codebase shows that `NavBar.tsx` / `NavBarServer.tsx` are not imported by any active page. All secondary pages (`/suosikit`, `/paikat/[id]`, `/tietosuoja`) use `NavPill.tsx`. The `/` (Etusivu) has its own inline nav pill. Therefore the Profiili link must be added to **both** `NavPill.tsx` and the inline nav pill in `Etusivu.tsx`.

**Primary recommendation:** Model ProfiiliClient.tsx directly on SuosikitClient.tsx; use upsert (`{ onConflict: 'user_id' }`) on the `profiles` table; add Profiili link to NavPill.tsx and Etusivu.tsx inline pill; extend POST body and prompt in `route.ts`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Profile page display + edit form | Frontend (client component) | — | All auth state is client-side (localStorage); server component has no access to auth session here |
| profiles table read | Browser (createBrowserSupabase) | — | RLS enforces user_id match; anon key read is fine with RLS SELECT policy |
| profiles table upsert (write) | Browser (createBrowserSupabase) | — | RLS enforces auth.uid() = user_id; anon key INSERT/UPDATE permitted by policies |
| kotikaupunki loaded into Etusivu | Frontend (subscribeToAuthUser callback) | — | Etusivu is a client component; auth state already flows through subscribeToAuthUser |
| AI prompt construction with kotikaupunki | API tier (route.ts) | — | Server-side prompt engineering; kotikaupunki arrives via POST body already sanitized |
| Navigation (Profiili link) | Frontend (NavPill client component) | Etusivu inline pill | NavPill is the active nav for all secondary pages; Etusivu has its own inline pill |
| RLS enforcement | Database (Supabase) | — | Row-level security guarantees user_id isolation at DB layer |

---

## Standard Stack

No new packages required. All capabilities are covered by existing dependencies. [VERIFIED: package.json]

### Core (existing, relevant to this phase)

| Library | Installed Version | Purpose | Notes |
|---------|------------------|---------|-------|
| `@supabase/supabase-js` | ^2.105.4 | Browser Supabase client for profiles upsert/select | Already used in suosikit pattern |
| `@supabase/ssr` | ^0.10.3 | Server Supabase client for NavBarServer (not active) | Not needed for this phase |
| `next` | 14.2.35 | App Router, Route Handler | Active |
| `@anthropic-ai/sdk` | ^0.97.1 | AI prompt in route.ts | Already active in `/api/saasuositus` |
| `framer-motion` | ^12.38.0 | NavPill expand animation | Already used |
| `lucide-react` | ^1.16.0 | Icons (User icon for Profiili link) | Already imported in NavPill |
| `vitest` | ^4.1.7 | Unit testing | Already configured |

**Installation:** None required.

---

## Package Legitimacy Audit

No new packages are installed in this phase. All packages are existing project dependencies verified from `package.json`. [VERIFIED: package.json]

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
User (browser)
     │
     ├─[GET /profiili]──────────────────► app/profiili/page.tsx (server shell)
     │                                         │
     │                                    <NavPill /> + <ProfiiliClient />
     │                                         │
     │                                    ProfiiliClient.tsx (client)
     │                                    subscribeToAuthUser() callback
     │                                         │
     │                         ┌───────────────┴───────────────┐
     │                    authenticated?                  unauthenticated?
     │                         │                               │
     │              createBrowserSupabase()              CTA: Kirjaudu sisään
     │              profiles SELECT (user_id)                  │
     │              → setKotikaupunki                    AuthModal
     │                         │
     │              [user edits text field]
     │              [clicks Tallenna]
     │              profiles UPSERT (user_id, kotikaupunki)
     │              → inline success message (setTimeout 2500)
     │
     ├─[GET /]──────────────────────────► app/page.tsx → Etusivu.tsx (client)
     │                                    subscribeToAuthUser() callback
     │                                         │
     │                              profiles SELECT → setKotikaupunki
     │                              suosikit SELECT → setSuosikitIds
     │                                         │
     │                              AI fetch logic:
     │                              user !== null → POST /api/saasuositus
     │                                 body: { suosikit, kaupunki, kotikaupunki? }
     │                              user === null → GET /api/saasuositus?kaupunki=
     │
     └─[POST /api/saasuositus]──────────► route.ts
                                          parse: suosikit, kaupunki, kotikaupunki?
                                          if kotikaupunki && kotikaupunki.trim().toLowerCase()
                                             !== kaupunki.trim().toLowerCase()
                                             → append home/away context to prompt
                                          → Anthropic API (claude-haiku-4-5-20251001)
```

### Recommended Project Structure

```
app/
├── profiili/
│   ├── page.tsx          # Thin server shell: <NavPill /> + <ProfiiliClient />
│   └── ProfiiliClient.tsx  # 'use client' — authState machine, profiles upsert form
supabase/
└── migrations/
    └── {timestamp}_profiles.sql  # CREATE TABLE + RLS policies
```

### Pattern 1: AuthState Machine (copy from SuosikitClient)

**What:** Three-state machine driven by `subscribeToAuthUser` — prevents hydration flash and renders correct UI for each state.

**When to use:** Every page that gate-keeps behind authentication.

```tsx
// Source: app/suosikit/SuosikitClient.tsx (VERIFIED: codebase read)
type AuthState = 'loading' | 'unauthenticated' | 'authenticated'

const [authState, setAuthState] = useState<AuthState>('loading')

useEffect(() => {
  const supabase = createBrowserSupabase()

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('kotikaupunki')
      .eq('user_id', userId)
      .single()
    if (data) setKotikaupunki(data.kotikaupunki ?? '')
  }

  return subscribeToAuthUser((user) => {
    if (user) {
      setAuthState('authenticated')
      loadProfile(user.id)
    } else {
      setAuthState('unauthenticated')
      setKotikaupunki('')
    }
  })
}, [])
```

### Pattern 2: Supabase Upsert with RLS

**What:** Single-row upsert using `user_id` as the conflict target. RLS enforces `auth.uid() = user_id` so the anon key write is safe.

**When to use:** Profile data where one row per user is the invariant.

```typescript
// Source: Supabase JS docs pattern (ASSUMED — standard upsert API)
const { error } = await supabase
  .from('profiles')
  .upsert(
    { user_id: userId, kotikaupunki: trimmedValue, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
```

**Note on `updated_at`:** The column has `DEFAULT now()` but upsert does not auto-update it — pass explicitly or use a DB trigger. Simplest: pass `new Date().toISOString()` in client.

### Pattern 3: RLS Migration (from suosikit reference)

**What:** Standard migration file for a user-owned table.

```sql
-- Source: supabase/migrations/20260523_suosikit.sql (VERIFIED: codebase read)
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

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Key difference from suosikit:** Profiles needs an UPDATE policy (suosikit only needed INSERT/DELETE). The `user_id` is PRIMARY KEY so there is no separate `id bigserial` column.

### Pattern 4: AI Prompt Extension (kotikaupunki context)

**What:** Conditionally append home/away context to the existing prompt string.

**When to use:** Only when `kotikaupunki` is set AND differs from current `kaupunki` (case-insensitive, trimmed comparison).

```typescript
// Source: app/api/saasuositus/route.ts + decisions D-07, D-08, D-12 (VERIFIED: codebase read)
// In POST handler, after existing body parsing:
let kotikaupunki: string | undefined
if (typeof body.kotikaupunki === 'string' && body.kotikaupunki.trim()) {
  kotikaupunki = body.kotikaupunki
    .replace(/[^\w\sÄäÖöÅå\-,.'()&]/g, '')
    .slice(0, 80)
    .trim()
}

// Prompt extension — reissussa context:
const reissuKonteksti = (kotikaupunki &&
  kotikaupunki.trim().toLowerCase() !== kaupunki.trim().toLowerCase())
  ? ` Käyttäjä vierailee ${kaupunki}ssa — hänen kotikaupunkinsa on ${kotikaupunki}.`
  : ''

const prompt = `Tänään on ${day} ${kaupunki}ssa. Lämpötila on ${temp}°C ja sää on ${weatherDesc}. Kirjoita YKSI lyhyt suomenkielinen lause joka suosittelee sopivaa liikuntapalvelua tai -lajia tähän säähän ${kaupunki}ssa. Mainitse "${kaupunki}" tai viittaa liikuntapaikan löytämiseen. Älä käytä emojeja.${suosikkiLista}${reissuKonteksti}`
```

### Pattern 5: NavPill Link Addition

**What:** Add "Profiili" link before "Suosikit" in the NavPill expanded content.

**Critical finding:** `NavBar.tsx` / `NavBarServer.tsx` are dead code — `NavBarServer` is defined but never imported by any active page. All secondary pages use `NavPill.tsx`. The Profiili link must be added to `NavPill.tsx` (used by `/suosikit`, `/paikat/[id]`, `/tietosuoja`, `/profiili`) and the inline expanding pill inside `Etusivu.tsx`.

```tsx
// Source: app/components/NavPill.tsx (VERIFIED: codebase read)
// Add before the existing Suosikit link:
<Link href="/profiili" onClick={() => setOpen(false)} className={BTN}>
  <User className="w-3.5 h-3.5" />
  Profiili
</Link>
```

**Note:** `User` is already imported in `NavPill.tsx` (line 6: `import { Search, Heart, User, LogOut, MoreHorizontal, X } from 'lucide-react'`). No new import needed.

For `Etusivu.tsx`'s inline pill: `User` is also already imported (line 7).

### Pattern 6: Etusivu.tsx Integration — kotikaupunki state and POST logic

**What:** Load profile in auth callback; change AI fetch trigger from `suosikitIds.size > 0` to `user !== null`.

```tsx
// Source: app/components/Etusivu.tsx lines 220-281 (VERIFIED: codebase read)

// New state (add alongside suosikitIds):
const [kotikaupunki, setKotikaupunki] = useState<string>('')

// In the subscribeToAuthUser useEffect (around line 220):
return subscribeToAuthUser(async (user) => {
  setSupabaseUser(user)
  if (user) {
    // existing suosikit fetch:
    const { data: favData } = await supabase.from('suosikit').select('paikka_id').eq('user_id', user.id)
    if (favData) setSuosikitIds(new Set(favData.map((s: { paikka_id: number }) => s.paikka_id)))
    // NEW — profiles fetch:
    const { data: profileData } = await supabase.from('profiles').select('kotikaupunki').eq('user_id', user.id).single()
    setKotikaupunki(profileData?.kotikaupunki ?? '')
  } else {
    setSuosikitIds(new Set())
    setKotikaupunki('')   // NEW
  }
})

// AI fetch useEffect dependency key stays the same (D-11: cache key excludes kotikaupunki).
// Change fetch trigger logic (around line 266):
// OLD: const fetchPromise = suosikkiNimet.length > 0 ? POST : GET
// NEW: const fetchPromise = user !== null ? POST : GET
// And POST body gets kotikaupunki? field:
fetch('/api/saasuositus', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    suosikit: suosikkiNimet,
    kaupunki: weatherKaupunki,
    ...(kotikaupunki ? { kotikaupunki } : {}),
  })
})
```

**Dependency array consideration:** `kotikaupunki` must be added to the AI fetch `useEffect` dependency — but with care. If `kotikaupunki` changes (user saves profile), we want a fresh fetch. However, D-11 says cache key does NOT include kotikaupunki, so only live fetches (cache miss days) will pick up the new value. The dependency should be the user's auth state, not `kotikaupunki` itself. Add `supabaseUser?.id` (stable string) to the dep array alongside `suosikitSizeAndIds` and `weatherKaupunki`, since a user auth change already invalidates the cache miss path.

### Anti-Patterns to Avoid

- **Re-fetching profiles on every render:** `subscribeToAuthUser` fires on every auth state change. The profiles fetch inside the callback is fine — it only runs when user changes (login/logout).
- **Using `.single()` and throwing on PGRST116:** Supabase `.single()` returns an error if no row exists (PGRST116 — "0 rows"). This is expected for new users who have never saved a profile. Handle gracefully: `if (data) setKotikaupunki(data.kotikaupunki ?? '')` — ignore the error.
- **Including kotikaupunki in cache key:** D-11 explicitly prohibits this. The cache key stays `saasuositus-${date}-${weatherKaupunki}(optional suosikitIds.size)`.
- **Adding Profiili link to NavBar.tsx:** NavBar is dead code. Changes there have no visible effect.
- **Using UPDATE RLS policy only (no INSERT):** Supabase upsert needs both INSERT and UPDATE policies. Without INSERT policy, the first save (when no row exists yet) will be blocked.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth state management | Custom session polling / localStorage reads | `subscribeToAuthUser()` from `lib/supabaseSSR.ts` | Already handles INITIAL_SESSION, TOKEN_REFRESHED events, singleton pattern — copy from SuosikitClient |
| Upsert with conflict resolution | Manual SELECT then INSERT/UPDATE logic | `supabase.from('profiles').upsert(..., { onConflict: 'user_id' })` | Single atomic operation; RLS handles security |
| Save feedback timer | External toast library | `useState<boolean>` + `setTimeout(2500)` | D-04 locked; no new dependencies |
| Input sanitization in route.ts | Custom regex from scratch | Copy the `.replace(/[^\w\sÄäÖöÅå\-,.'()&]/g, '').slice(0, 80)` pattern already used for `suosikit` names | Consistent with existing handler |

**Key insight:** This phase is almost entirely composition of existing patterns. The risk is not implementation complexity — it is knowing which nav component to actually modify.

---

## Common Pitfalls

### Pitfall 1: Modifying Dead NavBar Instead of NavPill

**What goes wrong:** Developer reads CONTEXT.md "NavBar hamburger-dropdown", opens `NavBar.tsx`, adds the Profiili link — but no page ever renders NavBar, so the link is invisible.

**Why it happens:** `NavBarServer.tsx` exists but is never imported. All secondary pages use `NavPill.tsx`.

**How to avoid:** Add Profiili link to `NavPill.tsx` AND the inline expanding pill inside `Etusivu.tsx` (around line 80-97 of the inline pill section).

**Warning signs:** `/profiili` link does not appear on any page after implementation.

### Pitfall 2: Missing UPDATE Policy in RLS Migration

**What goes wrong:** First upsert (INSERT path) works. Subsequent saves (UPDATE path) return `406 Not Acceptable` or RLS violation.

**Why it happens:** The `suosikit` reference migration only has INSERT + DELETE (no UPDATE needed there). Profiles needs UPDATE because the row already exists on second save.

**How to avoid:** Always include all three write policies: `FOR INSERT WITH CHECK`, `FOR UPDATE USING ... WITH CHECK`, `FOR SELECT USING`.

### Pitfall 3: `.single()` Throwing PGRST116 for New Users

**What goes wrong:** New user logs in → no row in `profiles` table → `.single()` returns error PGRST116 → unhandled error crashes the profiles load flow.

**Why it happens:** D-03 says no trigger creates a row on registration. The first time a user visits `/profiili` they have no row.

**How to avoid:** In ProfiiliClient, after `supabase.from('profiles').select('kotikaupunki').eq('user_id', userId).single()`, ignore error and treat null/missing data as empty string: `setKotikaupunki(data?.kotikaupunki ?? '')`.

### Pitfall 4: kotikaupunki State Not Initialized Before AI Fetch

**What goes wrong:** User is logged in → `subscribeToAuthUser` fires → profiles fetch is async → `kotikaupunki` is still `''` when the AI fetch useEffect runs → POST body has no kotikaupunki even when the user has one set.

**Why it happens:** The profiles fetch and the AI fetch are in separate `useEffect` hooks with different dependency arrays. The AI fetch may run before the profiles fetch resolves.

**How to avoid:** The AI fetch is already gated by `suosikitSizeAndIds` + `weatherKaupunki` dep array. Since `kotikaupunki` is loaded in the same auth callback as `suosikitIds`, the timing is approximately the same. The cache key mechanism means re-fetches only happen on cache misses. Accept this as "kotikaupunki shows in AI from next page load" — consistent with D-11 (cache invalidates at day boundary anyway). Document this in code comments.

### Pitfall 5: Case-Sensitive City Comparison Breaks Reissussa Logic

**What goes wrong:** User sets `kotikaupunki = "Tampere"`, visits Tampere — `"Tampere" !== "tampere"` or `"Tampere" !== "TAMPERE"` — reissussa context incorrectly added.

**Why it happens:** Direct string comparison without normalization.

**How to avoid:** Use `.trim().toLowerCase()` on both sides: `kotikaupunki.trim().toLowerCase() !== kaupunki.trim().toLowerCase()`.

---

## Code Examples

### ProfiiliClient: Inline Save Feedback Pattern

```tsx
// Source: decisions D-04 (ASSUMED pattern — standard React pattern)
const [saved, setSaved] = useState(false)

async function handleSave() {
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

// In JSX:
{saved && (
  <p className="text-sm text-green-700">Kotikaupunki tallennettu</p>
)}
```

### ProfiiliClient: Layout Structure

```tsx
// Source: CONTEXT.md §Specific Ideas + CLAUDE.md design system (ASSUMED layout)
// glass card, font-serif heading, muted email, text input, save button
<div className="min-h-screen bg-white px-4 py-8 max-w-2xl mx-auto">
  <h1 className="font-serif text-2xl font-bold text-[#111111] mb-6">Profiili</h1>
  <p className="text-sm text-[rgba(17,17,17,0.45)] mb-6">{user.email}</p>
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
</div>
```

---

## Runtime State Inventory

> This is a feature-addition phase (new table, new page, new prompting), not a rename/refactor/migration phase. No runtime state needs updating for an existing resource.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | No existing `profiles` table — none to migrate | Create new table via migration |
| Live service config | No external services reference `profiles` | None |
| OS-registered state | None | None |
| Secrets/env vars | `ANTHROPIC_API_KEY` is already set (route.ts uses it) | None |
| Build artifacts | None | None |

**Nothing found in category:** Verified by reading migrations folder (only 3 migration files, none reference profiles).

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| POST only when suosikitIds.size > 0 | POST always when user !== null | D-06 locked decision |
| No profile table | `profiles` table with user_id PK | New in this phase |
| AI prompt: weather + suosikit only | AI prompt: weather + suosikit + optional reissussa context | D-12 |

**No deprecated APIs used.** Supabase JS v2 upsert API with `onConflict` is the current pattern. [ASSUMED — based on training knowledge of @supabase/supabase-js v2]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase `.upsert(..., { onConflict: 'user_id' })` is the correct v2 API for single-row upsert with conflict resolution | Standard Stack / Code Examples | If API has changed, upsert may silently do nothing or throw — test in Wave 0 |
| A2 | `updated_at` is not auto-updated by Supabase on upsert without explicit value — must pass `new Date().toISOString()` | Code Examples | If DB trigger handles it, passing the value is harmless redundancy |
| A3 | ProfiiliClient layout structure (inline save message, `.glass` card, input styling) | Code Examples | This is Claude's Discretion per CONTEXT.md — layout is flexible; no correctness risk |
| A4 | AI fetch useEffect with `supabaseUser?.id` as dependency is sufficient to capture "user just logged in" scenario for kotikaupunki | Architecture Patterns (Pattern 6) | If timing causes kotikaupunki to be empty when AI fetch runs, user gets non-personalized result until next day cache miss |

---

## Open Questions (RESOLVED)

1. **Suosikit page back-link uses dead `/?nakyma=lista` route**
   - What we know: `SuosikitClient.tsx` has `href="/?nakyma=lista"` back-links (lines 74, 135) — but CLAUDE.md says `?nakyma=lista` is dead and Phase 12 removes LiikuntapaikatLista.
   - What's unclear: Should `ProfiiliClient.tsx` use `href="/"` for back-navigation?
   - Recommendation: Use `href="/"` — not `/?nakyma=lista` — for any back-to-homepage link in ProfiiliClient, as the list view is being removed in Phase 12.

2. **NavPill "Profiili" link visibility for unauthenticated users**
   - What we know: D-09 says Profiili link is visible to all users. Unauthenticated user clicks → sees CTA on profiili page (like suosikit page).
   - What's unclear: Should the "Profiili" link appear regardless of auth state, or only when `user !== null`?
   - Recommendation: Show always (D-09 says "näkyy kaikille"). Consistent with suosikit pattern.

3. **userId availability for upsert in ProfiiliClient**
   - What we know: `subscribeToAuthUser` callback provides `user.id`. The `userId` must be captured in a state or ref to be accessible in `handleSave`.
   - Recommendation: Store `userId` via `useState<string | null>(null)` set in the auth callback, alongside `authState`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build / dev | ✓ | v24.15.0 | — |
| Supabase project | profiles table migration | ✓ (env vars set) | — | — |
| ANTHROPIC_API_KEY | /api/saasuositus | ✓ (existing usage) | — | time-based fallback already in route.ts |
| vitest | Unit tests | ✓ | ^4.1.7 | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.7 |
| Config file | `vitest.config.ts` (exists, `include: ['lib/**/*.test.ts']`) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

**Note:** The vitest config only covers `lib/**/*.test.ts` — UI component tests are not in scope (no jsdom environment configured). Phase 14 unit testable logic lives in `route.ts` prompt construction, which is pure string logic.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-04 | Profile page renders email and text input | manual | — | ❌ manual only |
| AUTH-04 | kotikaupunki persists after save + page reload | manual | — | ❌ manual only |
| AUTH-04 | Unauthenticated user sees CTA, not form | manual | — | ❌ manual only |
| AI-05 | reissussa context appended when cities differ | unit | `npx vitest run` | ❌ Wave 0 — new test file |
| AI-05 | No context appended when kotikaupunki matches kaupunki | unit | `npx vitest run` | ❌ Wave 0 — new test file |
| AI-05 | No context when kotikaupunki is empty/undefined | unit | `npx vitest run` | ❌ Wave 0 — new test file |

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `lib/saasuositus.test.ts` — covers AI-05 (reissussa context logic, case-insensitive comparison, empty kotikaupunki)

**Note:** Route Handler logic should be extracted to a pure helper function in `lib/` to enable unit testing without HTTP mocking. The `buildPrompt(...)` function (or equivalent) is the testable unit.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (profile page is auth-gated) | subscribeToAuthUser — client-side auth state |
| V3 Session Management | yes (auth session drives profile access) | Supabase handles session; RLS enforces at DB layer |
| V4 Access Control | yes (users can only read/write own profile) | RLS policy: `auth.uid() = user_id` on all operations |
| V5 Input Validation | yes (kotikaupunki is user input sent to AI) | Sanitize in route.ts: `replace(/[^\w\sÄäÖöÅå\-,.'()&]/g, '').slice(0, 80)` — copy existing suosikit sanitization pattern |
| V6 Cryptography | no | No crypto operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prompt injection via kotikaupunki | Tampering | Sanitize input in route.ts before inserting into prompt; 80-char limit; whitelist regex (already used for suosikit names) |
| Cross-user profile read | Information Disclosure | RLS SELECT policy: `auth.uid() = user_id` |
| Writing to another user's profile | Tampering | RLS INSERT+UPDATE policies: `auth.uid() = user_id` |
| Storing sensitive data in kotikaupunki | Information Disclosure | Field is free text, user-controlled; no PII beyond city name expected |

---

## Sources

### Primary (HIGH confidence)

- `app/suosikit/SuosikitClient.tsx` — authState machine, subscribeToAuthUser pattern, unauthenticated CTA layout [VERIFIED: codebase read]
- `lib/supabaseSSR.ts` — createBrowserSupabase(), subscribeToAuthUser() API signatures [VERIFIED: codebase read]
- `app/components/NavBar.tsx` — expandable pill structure (dead code — not in active use) [VERIFIED: codebase read]
- `app/components/NavPill.tsx` — active nav component; where Profiili link must be added [VERIFIED: codebase read]
- `app/components/Etusivu.tsx` lines 200–281 — subscribeToAuthUser callback, AI fetch logic, cache key [VERIFIED: codebase read]
- `app/api/saasuositus/route.ts` — POST handler, existing body parsing, prompt construction [VERIFIED: codebase read]
- `supabase/migrations/20260523_suosikit.sql` — RLS migration pattern [VERIFIED: codebase read]
- `package.json` — installed dependency versions [VERIFIED: codebase read]
- `vitest.config.ts` — test framework configuration [VERIFIED: codebase read]

### Secondary (MEDIUM confidence)

- CONTEXT.md §Decisions — locked architectural decisions from discuss-phase
- CLAUDE.md — glassmorphism design system, color/typography constraints, Tailwind v3

### Tertiary (LOW confidence, flagged)

- Supabase upsert `{ onConflict: 'user_id' }` API — [ASSUMED] based on training knowledge of @supabase/supabase-js v2; not verified against Context7/official docs this session

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages are existing dependencies verified from package.json
- Architecture: HIGH — patterns directly copied from working SuosikitClient + suosikit migration
- Navigation finding: HIGH — code search confirmed NavBar is dead, NavPill is active
- Pitfalls: HIGH — based on direct code inspection of the patterns being extended
- AI prompt extension: HIGH — route.ts prompt string construction is straightforward template literal work

**Research date:** 2026-05-28
**Valid until:** 2026-06-28 (30 days — stable Next.js 14 + Supabase v2 ecosystem)
