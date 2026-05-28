# Phase 15: Arvostelut - Context

**Gathered:** 2026-05-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a reviews system to venue profile pages (`/paikat/[id]`). Logged-in users can submit one review per venue containing: star rating (1–5), free-text comment, anonymous/named choice, visit date (custom date picker), and crowd rating (hiljaista / sopivasti / ruuhkaista). All users (including logged-out) can read reviews. The venue page shows all reviews + a calculated star average.

</domain>

<decisions>
## Implementation Decisions

### ReviewForm Placement
- **D-01:** Reviews section is a new `.glass` card placed below the existing info card on the venue profile page — visually separate from hours/price/contact.
- **D-02:** Logged-out users see the form in a locked/greyed state with a "Kirjaudu arvostellaksesi" CTA button — not hidden.
- **D-03:** If the user has already reviewed this venue, the form area shows their existing review with an "Muokkaa arvostelu" (Edit) button — review is editable, not locked. This requires an UPDATE path in the DB.

### Star Rating
- **D-04:** 5 clickable star icons — clicking star N fills stars 1–N yellow, rest empty. Hover preview before clicking. Works on mobile (tap = select).
- **D-05:** Star average display: filled/empty stars + numeric average + review count. e.g. "★★★★☆ 4.2 (17 arvostelua)".

### Review List Display
- **D-06:** Reviews ordered newest first (created_at DESC).
- **D-07:** First 5 reviews shown; "Näytä kaikki" button reveals the rest.
- **D-08:** Each review card shows: star rating (filled stars) + author name or "Anonyymi" + review text. Visit date and crowd rating are captured in the DB but NOT shown per review card (minimal card design).

### Date Picker & Crowd Rating
- **D-09:** Visit date uses a custom date picker component — the researcher picks the best fit for Next.js 14 + Tailwind v3 (lightest option, no heavy dependencies).
- **D-10:** Crowd rating presented as 3 pill/chip toggle buttons side-by-side: "Hiljaista" / "Sopivasti" / "Ruuhkaista". Tap to select one. Style matches the existing filter pill pattern.

### Claude's Discretion
- Supabase migration column names and exact schema (follow profiles.sql pattern)
- RLS policies wording (follow Phase 14 profiles.sql pattern — SELECT/INSERT/UPDATE, no DELETE)
- Component file split (e.g. ReviewForm.tsx + ReviewList.tsx + StarPicker.tsx as separate files or one ReviewSection.tsx — planner decides)
- Error state messages (e.g. when DB write fails)
- Empty state when a venue has no reviews yet

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system
- `CLAUDE.md` — glassmorphism color system, typography constraints (2 weights, 4 sizes), animation principles, card structure
- `app/globals.css` — `.glass`, `.glass-hover`, `.glass-btn`, `.glass-nav` utility classes

### Auth + DB patterns
- `app/profiili/ProfiiliClient.tsx` — three-state auth machine (loading/unauthenticated/authenticated), `createBrowserSupabase()` + `subscribeToAuthUser()` pattern
- `supabase/migrations/20260528083110_profiles.sql` — RLS policy pattern: SELECT/INSERT/UPDATE with `auth.uid() = user_id`; no DELETE policy; `user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
- `lib/supabaseSSR.ts` — `createBrowserSupabase()`, `createServerSupabase()`, `subscribeToAuthUser()` exports

### Venue profile page (integration target)
- `app/paikat/[id]/page.tsx` — server component; reviews section slots in below the `.glass` content card; uses `createServerSupabase(cookies())`

### Requirements
- `.planning/REQUIREMENTS.md` §REVIEW — REVIEW-01 through REVIEW-04 (locked requirements)
- `.planning/ROADMAP.md` §Phase 15 — success criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/profiili/ProfiiliClient.tsx` — auth-gated client component pattern; adapt for ReviewForm auth gate
- `supabase/migrations/20260523_suosikit.sql` — many-to-many user↔paikka table; reviews table follows similar schema
- `app/components/AuthModal.tsx` — existing login modal; use for the "Kirjaudu arvostellaksesi" CTA
- `app/components/HeartButton.tsx` — client component that reads auth state on a server-rendered page; same pattern needed for ReviewForm

### Established Patterns
- `.glass rounded-2xl p-4 flex flex-col gap-3` — standard card surface (ProfiiliClient, PaikkaPage)
- `text-[10px] font-bold text-[#111111] uppercase tracking-widest` — label caps style
- `bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-5 py-2 rounded-full` — primary button
- `border border-[rgba(0,0,0,0.12)] rounded-xl px-3 py-2 text-sm` — text input style
- Filter pill toggle: `bg-[#111111] text-white` for active, `border border-[rgba(0,0,0,0.12)] text-[#111111]` for inactive — use for crowd rating pills
- `whileTap={{ scale: 0.95 }}` — Framer Motion tap feedback on interactive elements

### Integration Points
- Reviews section renders in `app/paikat/[id]/page.tsx` — server component fetches paikka; reviews can be fetched server-side alongside paikka data OR by a client component on mount
- Star average can be computed via Postgres aggregate (AVG + COUNT) in the same server query, or via a Supabase view

</code_context>

<specifics>
## Specific Ideas

- Star average format: "★★★★☆ 4.2 (17 arvostelua)" — filled/empty star icons + 1-decimal numeric + review count in parentheses
- Crowd rating pill labels: exactly "Hiljaista", "Sopivasti", "Ruuhkaista" (these are the canonical Finnish terms from REQUIREMENTS.md)
- Anonymous author display: exactly "Anonyymi" (not "Tuntematon" or other variations)
- "Näytä kaikki" button to reveal reviews beyond the first 5

</specifics>

<deferred>
## Deferred Ideas

- Sorting reviews by highest rated (not in scope for v1.2 — newest-first is the only order)
- Showing visit date and crowd rating per review card (captured in DB but not displayed in v1.2)
- Pagination with infinite scroll (not in scope — "Näytä kaikki" button suffices for v1.2)
- Review moderation / reporting (out of scope)
- "Verified visit" badge (out of scope per REQUIREMENTS.md)

</deferred>

---

*Phase: 15-arvostelut*
*Context gathered: 2026-05-28*
