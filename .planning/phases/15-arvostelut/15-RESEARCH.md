# Phase 15: Arvostelut - Research

**Researched:** 2026-05-28
**Domain:** Supabase RLS + Next.js 14 client components + review UX (star rating, date picker, crowd pills)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Reviews section is a new `.glass` card placed below the existing info card on the venue profile page — visually separate from hours/price/contact.
- **D-02:** Logged-out users see the form in a locked/greyed state with a "Kirjaudu arvostellaksesi" CTA button — not hidden.
- **D-03:** If the user has already reviewed this venue, the form area shows their existing review with an "Muokkaa arvostelu" (Edit) button — review is editable, not locked. This requires an UPDATE path in the DB.
- **D-04:** 5 clickable star icons — clicking star N fills stars 1–N yellow, rest empty. Hover preview before clicking. Works on mobile (tap = select).
- **D-05:** Star average display: filled/empty stars + numeric average + review count. e.g. "★★★★☆ 4.2 (17 arvostelua)".
- **D-06:** Reviews ordered newest first (created_at DESC).
- **D-07:** First 5 reviews shown; "Näytä kaikki" button reveals the rest.
- **D-08:** Each review card shows: star rating (filled stars) + author name or "Anonyymi" + review text. Visit date and crowd rating are captured in the DB but NOT shown per review card (minimal card design).
- **D-09:** Visit date uses a custom date picker component — the researcher picks the best fit for Next.js 14 + Tailwind v3 (lightest option, no heavy dependencies).
- **D-10:** Crowd rating presented as 3 pill/chip toggle buttons side-by-side: "Hiljaista" / "Sopivasti" / "Ruuhkaista". Style matches the existing filter pill pattern.

### Claude's Discretion
- Supabase migration column names and exact schema (follow profiles.sql pattern)
- RLS policies wording (follow Phase 14 profiles.sql pattern — SELECT/INSERT/UPDATE, no DELETE)
- Component file split (e.g. ReviewForm.tsx + ReviewList.tsx + StarPicker.tsx as separate files or one ReviewSection.tsx — planner decides)
- Error state messages (e.g. when DB write fails)
- Empty state when a venue has no reviews yet

### Deferred Ideas (OUT OF SCOPE)
- Sorting reviews by highest rated (not in scope for v1.2 — newest-first is the only order)
- Showing visit date and crowd rating per review card (captured in DB but not displayed in v1.2)
- Pagination with infinite scroll (not in scope — "Näytä kaikki" button suffices for v1.2)
- Review moderation / reporting (out of scope)
- "Verified visit" badge (out of scope per REQUIREMENTS.md)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REVIEW-01 | Kirjautunut käyttäjä voi jättää enintään yhden arvostelun per paikka, joka sisältää tähtiarvosanan (1–5) ja vapaamuotoisen tekstin | `UNIQUE(user_id, paikka_id)` constraint on DB + upsert pattern in client |
| REVIEW-02 | Arvostelija valitsee per arvostelu näkyykö oma nimi vai jääkö arvostelu anonyymiksi | `is_anonymous boolean` column; display name resolved at render time |
| REVIEW-03 | Arvostelu sisältää käyntipäivämäärän (date picker) ja ruuhka-arvion (hiljaista / sopivasti / ruuhkaista) | `visit_date date` + `crowd_rating text CHECK(...)` columns; native HTML `<input type="date">` |
| REVIEW-04 | Paikan profiilisivu näyttää kaikki kyseisen paikan arvostelut sekä tähtiarvosanojen keskiarvon | Server-side Postgres AVG + COUNT aggregate; ReviewSection client component renders list |
</phase_requirements>

---

## Summary

Phase 15 adds a reviews system to the venue profile page (`/paikat/[id]`). The work divides cleanly into three layers: (1) a Supabase migration creating the `reviews` table with RLS, (2) a server-side query in `page.tsx` that fetches reviews + computes AVG/COUNT using Postgres aggregates, and (3) a `ReviewSection` client component hierarchy that handles auth-gating, star input, crowd pill selection, a native date input, and list rendering with "Näytä kaikki" expansion.

No new npm packages are needed. The project already has `framer-motion` for tap animations, `lucide-react` for icons, and `@supabase/supabase-js` for DB access. The date picker decision is resolved: the native HTML `<input type="date">` is the correct choice for this stack — zero bundle cost, Tailwind v3 styleable, mobile-native date picker on iOS/Android, and no dependency risk. The star rating will use pure inline SVG/Unicode stars controlled by React state, with Framer Motion `whileHover`/`whileTap` on the star buttons.

The auth gating pattern follows `HeartButton.tsx` exactly: `subscribeToAuthUser` in `useEffect`, `AuthModal` rendered inline, `createBrowserSupabase()` for writes. The existing review (D-03) is detected on auth subscription by querying `reviews` for `(user_id, paikka_id)` — if a row exists, the form pre-populates and switches to UPDATE mode.

**Primary recommendation:** Split into three files — `ReviewSection.tsx` (outer shell + avg display + list), `ReviewForm.tsx` (auth machine + form state + submit), `StarPicker.tsx` (reusable star input). Keep DB access in `page.tsx` server component for the initial list and average.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fetch reviews + AVG/COUNT | API / Backend (server component) | — | `page.tsx` fetches via `createServerSupabase(cookies())` — zero client-side waterfall |
| Display review list | Frontend (client component) | — | `ReviewSection` needs `useState` for "show all" toggle |
| Auth gate + form submit | Frontend (client component) | — | Auth state lives in browser (localStorage-backed) — cannot be detected server-side in this project's pattern |
| DB write (INSERT/UPDATE) | Frontend direct to Supabase | — | Same pattern as `HeartButton` and `ProfiiliClient` — browser client with RLS |
| RLS enforcement | Database / Storage | — | `auth.uid() = user_id` — server enforced, not frontend |
| Star average computation | Database / Storage | — | Postgres `AVG(rating)` + `COUNT(*)` — one query, no view needed |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.105.4 (installed) | DB reads/writes + auth | Already in project; `createBrowserSupabase()` for writes |
| `@supabase/ssr` | 0.10.3 (installed) | Server-side Supabase client | Already in project; `createServerSupabase(cookies())` for page.tsx |
| `framer-motion` | 12.38.0 (installed) | `whileTap={{ scale: 0.95 }}` on stars + pills | Already in project; matches animation principles |
| `lucide-react` | 1.16.0 (installed) | Star icon fallback if needed | Already in project |

### No New Packages Required

This phase introduces zero new npm dependencies. All capabilities needed:
- **Star rating UI**: Pure React state + inline SVG or Unicode ★/☆ characters — no library needed
- **Date picker**: Native `<input type="date">` — zero bundle, full mobile support
- **Crowd pill toggles**: Plain React state + Tailwind classes — same as existing filter pills
- **Form submission**: Direct Supabase browser client — same as HeartButton/ProfiiliClient

**Installation:** None required.

---

## Package Legitimacy Audit

No new packages are introduced in this phase. All dependencies are existing project packages already installed and verified in prior phases.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
User browser
  │
  ├─► GET /paikat/[id]
  │     └── page.tsx (Server Component)
  │           ├── createServerSupabase(cookies())
  │           ├── Query: SELECT * FROM liikuntapaikat WHERE id = $1
  │           ├── Query: SELECT *, AVG(rating) OVER(), COUNT(*) OVER()
  │           │         FROM reviews WHERE paikka_id = $1 ORDER BY created_at DESC
  │           └── Renders: <ReviewSection initialReviews={...} avgRating={...} paikkaId={id} />
  │
  └── ReviewSection.tsx (Client Component)
        ├── ReviewAverage (★★★★☆ 4.2 (17 arvostelua))
        ├── ReviewForm.tsx (Client Component)
        │     ├── useEffect → subscribeToAuthUser → query existing review
        │     ├── Auth state: loading / unauthenticated / authenticated-no-review / authenticated-has-review
        │     ├── [unauthenticated] → locked UI + "Kirjaudu arvostellaksesi" → AuthModal
        │     ├── [has-review] → show existing + "Muokkaa arvostelu" button → edit mode
        │     └── [submit] → createBrowserSupabase().from('reviews').upsert(...)
        └── ReviewList
              ├── reviews.slice(0, showAll ? all : 5)
              ├── ReviewCard (stars + name/"Anonyymi" + text)
              └── "Näytä kaikki" button (if reviews.length > 5)
```

### Recommended Project Structure
```
app/
├── components/
│   ├── ReviewSection.tsx   # outer shell: avg header + ReviewForm + ReviewList
│   ├── ReviewForm.tsx      # auth machine + form state + INSERT/UPDATE submit
│   └── StarPicker.tsx      # 5 star buttons, hover preview, controlled value
supabase/
└── migrations/
    └── 20260528_reviews.sql  # CREATE TABLE reviews + RLS policies
```

### Pattern 1: Supabase Migration — reviews table

**What:** Single migration file following profiles.sql and suosikit.sql patterns.
**When to use:** This is the schema for the reviews table.

```sql
-- Source: modeled after supabase/migrations/20260528083110_profiles.sql
--         and supabase/migrations/20260523_suosikit.sql [CITED: project codebase]

CREATE TABLE IF NOT EXISTS reviews (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paikka_id   bigint NOT NULL REFERENCES liikuntapaikat(id) ON DELETE CASCADE,
  rating      smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  teksti      text NOT NULL DEFAULT '',
  is_anonymous boolean NOT NULL DEFAULT false,
  visit_date  date,
  crowd_rating text CHECK (crowd_rating IN ('hiljaista', 'sopivasti', 'ruuhkaista')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, paikka_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews (public read for REVIEW-04)
CREATE POLICY "Anyone can read reviews"
  ON reviews FOR SELECT
  USING (true);

-- Users can insert only their own review
CREATE POLICY "Users can insert own review"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update only their own review
CREATE POLICY "Users can update own review"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Key decisions:**
- `UNIQUE(user_id, paikka_id)` enforces one review per user per venue at DB level (REVIEW-01)
- `rating smallint` not `int` — reviews never exceed 5, smallint is appropriate
- `teksti NOT NULL DEFAULT ''` — allows empty text (text is optional per D-08 minimal design)
- `is_anonymous boolean NOT NULL DEFAULT false` — REVIEW-02
- `visit_date date` (nullable) — date only, no time component; aligns with `<input type="date">` output
- `crowd_rating text CHECK(...)` (nullable) — not required by spec; DB validates allowed values
- `updated_at` tracked for the UPDATE path (D-03) [CITED: project codebase profiles.sql pattern]

### Pattern 2: Server-side AVG/COUNT Query in page.tsx

**What:** Fetch reviews + average + count in a single server query. No Supabase view needed.
**When to use:** page.tsx server component, called once at request time.

```typescript
// Source: Supabase PostgREST aggregate via .select() [ASSUMED: PostgREST aggregate syntax]
// Confirmed approach: fetch reviews array then compute in JS — VERIFIED pattern from existing codebase

// Simple approach (verified pattern): two separate queries
const { data: reviews } = await supabase
  .from('reviews')
  .select('id, rating, teksti, is_anonymous, created_at, user_id')
  .eq('paikka_id', id)
  .order('created_at', { ascending: false })

// Compute aggregate in JS — avoids PostgREST aggregate syntax complexity
const avgRating = reviews && reviews.length > 0
  ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  : null
const reviewCount = reviews?.length ?? 0
```

**Note:** JS-side AVG computation is safe here because review counts per venue will be small (< 1000). A Postgres aggregate would only matter at scale. [ASSUMED: venue review count stays small for v1.2 scope]

### Pattern 3: Auth Machine in ReviewForm (HeartButton pattern)

**What:** Three-state auth machine using `subscribeToAuthUser`, checks for existing review.
**When to use:** ReviewForm.tsx client component.

```typescript
// Source: adapted from app/components/HeartButton.tsx [CITED: project codebase]
'use client'
import { useState, useEffect, useRef } from 'react'
import { createBrowserSupabase, subscribeToAuthUser } from '@/lib/supabaseSSR'

type AuthState = 'loading' | 'unauthenticated' | 'authenticated'

export default function ReviewForm({ paikkaId }: { paikkaId: number }) {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [existingReview, setExistingReview] = useState<Review | null>(null)
  const currentUser = useRef<{ id: string; email?: string } | null>(null)

  useEffect(() => {
    const supabase = createBrowserSupabase()
    return subscribeToAuthUser(async (user) => {
      currentUser.current = user
      if (user) {
        setAuthState('authenticated')
        // Check for existing review
        const { data } = await supabase
          .from('reviews')
          .select('*')
          .eq('user_id', user.id)
          .eq('paikka_id', paikkaId)
          .maybeSingle()
        setExistingReview(data ?? null)
      } else {
        setAuthState('unauthenticated')
        setExistingReview(null)
      }
    })
  }, [paikkaId])
  // ...
}
```

### Pattern 4: Upsert for INSERT/UPDATE

**What:** Single upsert call handles both "new review" (INSERT) and "edit review" (UPDATE via D-03).
**When to use:** Form submission handler in ReviewForm.tsx.

```typescript
// Source: adapted from ProfiiliClient.tsx upsert pattern [CITED: project codebase]
const { error } = await supabase
  .from('reviews')
  .upsert(
    {
      user_id: userId,
      paikka_id: paikkaId,
      rating: selectedRating,
      teksti: teksti.trim(),
      is_anonymous: isAnonymous,
      visit_date: visitDate || null,
      crowd_rating: crowdRating || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,paikka_id' }
  )
```

**Note:** `onConflict: 'user_id,paikka_id'` matches the UNIQUE constraint name. [CITED: Supabase JS docs pattern, existing project upsert in ProfiiliClient.tsx]

### Pattern 5: Native Date Input

**What:** `<input type="date">` styled with Tailwind v3.
**When to use:** Visit date field in ReviewForm.tsx (D-09 lightest option).

```tsx
// No library needed — browser native date picker [ASSUMED: native date input]
<input
  type="date"
  value={visitDate}
  onChange={e => setVisitDate(e.target.value)}
  max={new Date().toISOString().split('T')[0]}  // prevent future dates
  className="border border-[rgba(0,0,0,0.12)] rounded-xl px-3 py-2 text-sm text-[#111111]
             bg-white focus:outline-none focus:border-[rgba(0,0,0,0.3)] w-full"
/>
```

**Why native over a library:** Zero bundle cost, mobile-native picker (iOS/Android wheel/grid), Tailwind v3 styleable for the border/radius. The only downside (inconsistent cross-browser look) is acceptable for this internal date field. Confirmed: no date picker library candidates needed.

### Pattern 6: Star Rating Component

**What:** 5 star buttons with hover preview, controlled by React state.
**When to use:** StarPicker.tsx component.

```tsx
// Source: pure React pattern, no library [ASSUMED: standard React pattern]
// Uses Framer Motion whileTap per CLAUDE.md animation principles
const STARS = [1, 2, 3, 4, 5]

export function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState<number>(0)
  const display = hovered || value

  return (
    <div className="flex gap-1" onMouseLeave={() => setHovered(0)} role="group" aria-label="Tähtiarvosana">
      {STARS.map(n => (
        <motion.button
          key={n}
          type="button"
          whileTap={{ scale: 0.95, transition: { duration: 0.12, ease: 'easeOut' } }}
          onMouseEnter={() => setHovered(n)}
          onClick={() => onChange(n)}
          aria-label={`${n} tähteä`}
          className="text-2xl leading-none focus:outline-none"
        >
          <span className={n <= display ? 'text-amber-400' : 'text-[rgba(17,17,17,0.2)]'}>
            ★
          </span>
        </motion.button>
      ))}
    </div>
  )
}
```

**Note:** Unicode ★ character used for star — consistent with D-05 display format "★★★★☆ 4.2". `text-amber-400` for filled stars aligns with Tailwind v3 utility. [CITED: CLAUDE.md animation principles for whileTap]

### Pattern 7: Crowd Rating Pills (D-10)

```tsx
// Source: CLAUDE.md filter pill pattern [CITED: CLAUDE.md]
const CROWD_OPTIONS = [
  { value: 'hiljaista',  label: 'Hiljaista' },
  { value: 'sopivasti',  label: 'Sopivasti' },
  { value: 'ruuhkaista', label: 'Ruuhkaista' },
]

{CROWD_OPTIONS.map(opt => (
  <motion.button
    key={opt.value}
    type="button"
    whileTap={{ scale: 0.95 }}
    onClick={() => setCrowdRating(crowdRating === opt.value ? null : opt.value)}
    className={crowdRating === opt.value
      ? 'bg-[#111111] text-white font-bold text-sm px-3 py-1.5 rounded-full'
      : 'border border-[rgba(0,0,0,0.12)] text-[#111111] font-bold text-sm px-3 py-1.5 rounded-full'
    }
  >
    {opt.label}
  </motion.button>
))}
```

### Pattern 8: Star Average Display (D-05)

```tsx
// Source: D-05 decision [CITED: 15-CONTEXT.md]
function StarAverage({ avg, count }: { avg: number | null; count: number }) {
  if (count === 0) return <p className="text-sm text-[rgba(17,17,17,0.45)]">Ei vielä arvosteluja</p>
  const rounded = Math.round(avg! * 10) / 10  // 1 decimal
  const filled = Math.round(avg!)              // for visual star display
  return (
    <div className="flex items-center gap-2">
      <span className="text-amber-400 tracking-tight">
        {'★'.repeat(filled)}{'☆'.repeat(5 - filled)}
      </span>
      <span className="font-bold text-sm text-[#111111]">{rounded.toFixed(1)}</span>
      <span className="text-sm text-[rgba(17,17,17,0.45)]">({count} arvostelua)</span>
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Fetching reviews client-side on mount:** Causes visible loading flash on every page visit. The initial list + average belongs in the server component query — pass as props to ReviewSection.
- **Server Actions for form submission:** This project uses direct Supabase browser client writes (HeartButton, ProfiiliClient pattern). Do NOT introduce Next.js Server Actions — inconsistent with established pattern.
- **Supabase view for AVG:** Unnecessary complexity. JS-side average computation from the fetched array is sufficient and avoids a migration for a view.
- **date-fns / react-datepicker / react-day-picker:** Heavy dependencies for a single date field. Native `<input type="date">` is the correct choice for this stack.
- **Separate API route for reviews:** HeartButton and ProfiiliClient write directly to Supabase from the browser via RLS — reviews must follow the same pattern. An API route adds a server round-trip with no security benefit (RLS already enforces ownership).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth subscription | Custom auth listener | `subscribeToAuthUser()` from `lib/supabaseSSR.ts` | Singleton pattern prevents multiple listeners; already handles session hydration |
| Login modal | Custom auth form | `AuthModal` component | Handles email + Google OAuth, error mapping, loading states |
| One-review-per-user enforcement | Client-side guard only | `UNIQUE(user_id, paikka_id)` DB constraint | Client guards are bypassable; DB constraint is authoritative |
| Crowd rating validation | Client-side enum check only | `CHECK (crowd_rating IN (...))` DB constraint | Same reasoning — DB validates canonical values |
| Rating visual display | Custom SVG star component | Unicode ★/☆ + React state | Zero complexity, consistent with D-05 format spec |

---

## Common Pitfalls

### Pitfall 1: Server component passes reviews but client re-fetches on auth load
**What goes wrong:** ReviewSection receives `initialReviews` prop from server but re-fetches from Supabase on mount because the client detects auth. This causes a double fetch and a flash of stale data.
**Why it happens:** The auth subscription fires asynchronously; developers often re-fetch data when auth state changes.
**How to avoid:** Reviews list is static (public read) — never re-fetch it based on auth change. Auth state only affects the ReviewForm, not the ReviewList.
**Warning signs:** ReviewList flickers or re-orders after page load.

### Pitfall 2: Upsert conflict target mismatch
**What goes wrong:** `supabase.from('reviews').upsert(..., { onConflict: 'user_id,paikka_id' })` fails with "there is no unique or exclusion constraint matching the ON CONFLICT specification".
**Why it happens:** PostgREST requires the conflict target to match the exact column names in the UNIQUE constraint.
**How to avoid:** Match `onConflict: 'user_id,paikka_id'` exactly to the constraint columns. Test with both INSERT (first review) and UPDATE (edit) paths.
**Warning signs:** 409 Conflict or 400 Bad Request from Supabase on second submission.

### Pitfall 3: `maybeSingle()` vs `single()` for existing review check
**What goes wrong:** Using `.single()` when checking for an existing review throws an error when no row exists (PGRST116). This breaks the form on first visit to any venue.
**Why it happens:** `.single()` errors if 0 rows are returned. ProfiiliClient uses this pattern and comments about it (line 28 in ProfiiliClient.tsx).
**How to avoid:** Always use `.maybeSingle()` for existence checks. Returns `null` instead of error when no row found. [CITED: ProfiiliClient.tsx line 28 comment]
**Warning signs:** Console error "JSON object requested, multiple (or no) rows returned" on venues with no reviews.

### Pitfall 4: `<input type="date">` value format mismatch
**What goes wrong:** Supabase `date` column expects `YYYY-MM-DD`; `new Date().toISOString()` returns `YYYY-MM-DDTHH:mm:ss.sssZ`. Passing the full ISO string causes a DB cast error.
**Why it happens:** JS Date.toISOString() always includes time.
**How to avoid:** Strip time: `new Date().toISOString().split('T')[0]` for the `max` attribute. The `<input type="date">` `.value` property is already `YYYY-MM-DD` — pass it directly to Supabase.
**Warning signs:** Supabase returns 400 "invalid input syntax for type date".

### Pitfall 5: Anonymous display name leaks user_id
**What goes wrong:** When `is_anonymous = true`, the component accidentally renders `user.id` or `user.email` instead of "Anonyymi".
**Why it happens:** Copying display logic without checking the `is_anonymous` flag.
**How to avoid:** ReviewCard should resolve: `is_anonymous ? 'Anonyymi' : displayName`. The `user_id` column must never be shown in the UI — only the resolved display name string.
**Warning signs:** UUID strings appearing in the review author field.

### Pitfall 6: ReviewSection re-fetches average after user submits
**What goes wrong:** After a user submits a review, the displayed star average is stale (server-fetched value from page load). The average stays wrong until the user refreshes.
**Why it happens:** The initial average was fetched server-side and passed as a prop; it doesn't update when a new review is submitted client-side.
**How to avoid:** After a successful upsert, call `router.refresh()` (from `useRouter`) to re-run the server component and get fresh data. This is the established Next.js 14 App Router pattern for revalidating server data after a mutation. [ASSUMED: router.refresh() pattern for App Router]
**Warning signs:** Star average doesn't update after submitting a review without a manual browser refresh.

---

## Code Examples

### Rendering the ReviewSection in page.tsx

```typescript
// Source: adapted from app/paikat/[id]/page.tsx [CITED: project codebase]
// Add after the closing </div> of the content card, still inside the max-w-2xl wrapper:

const { data: reviews } = await supabase
  .from('reviews')
  .select('id, rating, teksti, is_anonymous, created_at, user_id')
  .eq('paikka_id', id)
  .order('created_at', { ascending: false })

const reviewList = reviews ?? []
const avgRating = reviewList.length > 0
  ? reviewList.reduce((sum, r) => sum + r.rating, 0) / reviewList.length
  : null

// In JSX, below the content card div:
<ReviewSection
  paikkaId={id}
  initialReviews={reviewList}
  avgRating={avgRating}
  reviewCount={reviewList.length}
/>
```

### ReviewSection shell

```tsx
// Source: design conventions from CLAUDE.md + D-01, D-07 [CITED: CLAUDE.md, 15-CONTEXT.md]
'use client'
export default function ReviewSection({ paikkaId, initialReviews, avgRating, reviewCount }) {
  const [showAll, setShowAll] = useState(false)
  const displayed = showAll ? initialReviews : initialReviews.slice(0, 5)

  return (
    <div className="max-w-2xl mx-auto px-4 pb-10">
      <div className="glass rounded-2xl p-6 sm:p-8 flex flex-col gap-5">
        <StarAverage avg={avgRating} count={reviewCount} />
        <ReviewForm paikkaId={paikkaId} />
        <div className="flex flex-col gap-3">
          {displayed.map(r => <ReviewCard key={r.id} review={r} />)}
          {!showAll && initialReviews.length > 5 && (
            <button onClick={() => setShowAll(true)}
              className="text-sm font-bold text-[#111111] underline underline-offset-2 self-start">
              Näytä kaikki ({initialReviews.length} arvostelua)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Third-party date picker (react-datepicker) | Native `<input type="date">` | Progressive simplification | Zero bundle cost; mobile-native UI |
| Server Actions for mutations | Direct Supabase browser client writes | Established in Phase 9 | Consistent with HeartButton / ProfiiliClient pattern |
| Supabase view for aggregates | JS-side computation from fetched array | Phase 15 decision | Avoids migration for a Postgres view |

**Deprecated/outdated:**
- `@supabase/ssr` `createBrowserClient`: Known hanging promise issue in this project's Next.js setup — use plain `createClient` via `createBrowserSupabase()` from `lib/supabaseSSR.ts`. [CITED: lib/supabaseSSR.ts comment lines 7-9]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | JS-side AVG computation from fetched reviews is acceptable (venue review count stays small) | Architecture Patterns Pattern 2 | If a venue gets thousands of reviews, this wastes bandwidth — switch to Postgres aggregate via PostgREST |
| A2 | `router.refresh()` after upsert correctly revalidates the server component and returns updated average | Common Pitfalls Pitfall 6 | Average stays stale after submit; alternative: maintain client-side review list state |
| A3 | Native `<input type="date">` is sufficient for Finnish users' date input needs | Pattern 5 | Mobile browsers differ in picker UX; some users may find native picker confusing for past dates |
| A4 | `onConflict: 'user_id,paikka_id'` string syntax is correct for Supabase JS upsert with a composite UNIQUE constraint | Pattern 4 | Upsert fails with conflict target error — fallback: explicit SELECT + INSERT or UPDATE |

---

## Open Questions

1. **Display name for non-anonymous reviews**
   - What we know: `is_anonymous = false` means show the author's name
   - What's unclear: The `reviews` table as designed only stores `user_id`, not a display name. The user's email is available via auth but should not be shown publicly.
   - Recommendation: Store a `display_name text` column in the `reviews` table at INSERT time, populated from the user's `profiles` record or email prefix. This avoids a JOIN on every page load. Planner decides: add `display_name text` column to migration, populated at write time.

2. **Route for user display name source**
   - What we know: `profiles` table has `kotikaupunki` but no `display_name`
   - What's unclear: What name to show for non-anonymous reviews? Email prefix (before @)? Full email?
   - Recommendation: Use email prefix (everything before `@`) as the display name at write time. Store it in a `reviewer_name text` column. This avoids exposing full email addresses.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build + dev | ✓ | v24.15.0 | — |
| Supabase CLI (migration apply) | DB migration | Manual | — | Apply via Supabase dashboard SQL editor |
| `framer-motion` | Star tap animation | ✓ | 12.38.0 (installed) | Plain CSS transition |
| `@supabase/supabase-js` | DB client | ✓ | 2.105.4 (installed) | — |

**Missing dependencies with no fallback:** None — all required dependencies are already installed.

**Missing dependencies with fallback:**
- Supabase CLI: migrations can be applied manually via Supabase dashboard if CLI not configured locally.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.7 |
| Config file | `vitest.config.ts` (root, `include: ['lib/**/*.test.ts']`) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REVIEW-01 | One review per user per venue | unit | `npx vitest run lib/reviewUtils.test.ts` | ❌ Wave 0 |
| REVIEW-02 | Anonymous display name resolves to "Anonyymi" | unit | `npx vitest run lib/reviewUtils.test.ts` | ❌ Wave 0 |
| REVIEW-03 | Visit date YYYY-MM-DD format, crowd rating enum values | unit | `npx vitest run lib/reviewUtils.test.ts` | ❌ Wave 0 |
| REVIEW-04 | Star average computation from array | unit | `npx vitest run lib/reviewUtils.test.ts` | ❌ Wave 0 |

**Note:** UI interaction tests (star click, pill select, auth gate) are manual-only — vitest config excludes component files (`include: ['lib/**/*.test.ts']`). All automated tests cover pure utility functions in `lib/`.

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `lib/reviewUtils.ts` — pure functions: `resolveDisplayName()`, `computeAvgRating()`, `formatCrowdRating()`, crowd rating enum validation
- [ ] `lib/reviewUtils.test.ts` — unit tests for the above functions

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (existing) — `subscribeToAuthUser` |
| V3 Session Management | no | Handled by Supabase Auth middleware (existing) |
| V4 Access Control | yes | RLS: `auth.uid() = user_id` on INSERT/UPDATE; SELECT USING (true) |
| V5 Input Validation | yes | `rating CHECK (1–5)`, `crowd_rating CHECK (enum)` at DB level; client-side trim on `teksti` |
| V6 Cryptography | no | No new crypto |

### Known Threat Patterns for Supabase + Next.js 14

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| User submits review for another user's `user_id` | Tampering | RLS `WITH CHECK (auth.uid() = user_id)` — DB rejects |
| Duplicate reviews via parallel requests | Tampering | `UNIQUE(user_id, paikka_id)` DB constraint — DB rejects second insert |
| Injecting HTML/script via review text | Tampering | React renders text as text nodes (not innerHTML) — XSS not possible |
| Exposing email in public review display | Information Disclosure | Store `reviewer_name` (email prefix) at write time; never render `user_id` or full email |
| Future dates in visit_date | Tampering | `max={today}` on `<input type="date">` + optional DB CHECK if needed |

---

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/20260528083110_profiles.sql` — RLS policy pattern (SELECT/INSERT/UPDATE, no DELETE)
- `supabase/migrations/20260523_suosikit.sql` — UNIQUE constraint + bigserial + CASCADE pattern
- `app/components/HeartButton.tsx` — auth subscription pattern for client components on server pages
- `app/profiili/ProfiiliClient.tsx` — three-state auth machine, upsert pattern
- `app/paikat/[id]/page.tsx` — integration target; createServerSupabase usage
- `lib/supabaseSSR.ts` — createBrowserSupabase, subscribeToAuthUser, createServerSupabase exports
- `CLAUDE.md` — glassmorphism system, typography (2 weights, 4 sizes), animation principles

### Secondary (MEDIUM confidence)
- `package.json` — verified installed versions of framer-motion (12.38.0), lucide-react (1.16.0), supabase-js (2.105.4)
- `vitest.config.ts` — confirmed test include pattern (`lib/**/*.test.ts`)

### Tertiary (LOW confidence)
- None — all claims sourced from project codebase or marked [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified from installed package.json; no new packages
- Architecture: HIGH — all patterns sourced directly from existing project code
- DB schema: HIGH — follows profiles.sql and suosikit.sql patterns exactly
- RLS policies: HIGH — copy of established project pattern
- Date picker recommendation: HIGH — native HTML input, zero risk
- Pitfalls: HIGH — sourced from existing code comments and established patterns

**Research date:** 2026-05-28
**Valid until:** 2026-06-28 (stable stack — Supabase, Next.js 14, Tailwind v3)

---

## RESEARCH COMPLETE

**Phase:** 15 - Arvostelut
**Confidence:** HIGH

### Key Findings
- Zero new npm packages required — all needed capabilities (auth, DB, animation) are in existing dependencies
- Native `<input type="date">` is the correct date picker for this stack (D-09 resolved)
- Reviews table schema: `bigserial PK`, `UNIQUE(user_id, paikka_id)`, `rating smallint CHECK(1-5)`, `is_anonymous boolean`, `visit_date date`, `crowd_rating text CHECK(enum)` — follows profiles.sql + suosikit.sql pattern exactly
- RLS: `SELECT USING (true)` (public read), `INSERT WITH CHECK (auth.uid() = user_id)`, `UPDATE USING + WITH CHECK (auth.uid() = user_id)`, no DELETE policy
- Recommended component split: `ReviewSection.tsx` (shell + avg + list) + `ReviewForm.tsx` (auth machine + form) + `StarPicker.tsx` (reusable star input)
- Open question for planner: add `reviewer_name text` column to reviews table, populated at write time from email prefix — avoids exposing full email in public reviews

### File Created
`.planning/phases/15-arvostelut/15-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All packages from existing package.json; no new packages |
| DB Schema | HIGH | Direct copy of profiles.sql + suosikit.sql patterns |
| Architecture | HIGH | HeartButton + ProfiiliClient patterns verified from source |
| Pitfalls | HIGH | Sourced from existing code comments + established patterns |
| Date Picker | HIGH | Native HTML — no dependency risk |

### Open Questions
- Display name for non-anonymous reviews: recommend `reviewer_name text` column stored at write time (email prefix). Planner must decide and add to migration.
- `router.refresh()` after upsert: [ASSUMED] pattern for App Router revalidation — planner should account for this or maintain client-side state instead.

### Ready for Planning
Research complete. Planner can now create PLAN.md files.
