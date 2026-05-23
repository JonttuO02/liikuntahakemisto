---
phase: 09-auth-and-favorites
plan: "03"
subsystem: auth
tags: [supabase, favorites, heart-button, optimistic-update, react-state, glassmorphism]

# Dependency graph
requires:
  - phase: 09-01
    provides: suosikit table (Supabase), createBrowserSupabase, createServerSupabase helpers
  - phase: 09-02
    provides: AuthModal component, async layout with getUser()

provides:
  - Heart buttons on all three surfaces (list cards, map bottom sheet, profile page)
  - Favorites engine with optimistic INSERT/DELETE to Supabase suosikit table
  - Auth-aware suosikit page (signed-out prompt, signed-in empty state)
  - Auth trigger in Etusivu right toolbar (User/LogOut icon)

affects:
  - 09-04 (AI personalization depends on suosikitIds state now available in Etusivu)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Optimistic Set-state update pattern: update local state immediately, revert on Supabase error
    - onAuthStateChange subscription with cleanup in useEffect return
    - Standalone HeartButton client component managing its own auth + favorites state
    - Server component auth check passing userEmail prop to client component

key-files:
  created:
    - app/components/HeartButton.tsx
    - app/suosikit/SuosikitClient.tsx
  modified:
    - app/components/PaikkaKortti.tsx
    - app/components/LiikuntapaikatLista.tsx
    - app/components/Etusivu.tsx
    - app/paikat/[id]/page.tsx
    - app/suosikit/page.tsx

key-decisions:
  - "supabaseUser state not stored in HeartButton — only isSuosikki boolean needed; auth check happens live in toggle()"
  - "toggleSuosikki as async function using getUser() on each call — avoids stale auth state from closure"
  - "Right toolbar auth button placed inside rightOpen expanded content alongside Search and Heart links"

patterns-established:
  - "Optimistic favorites toggle: update Set immediately, revert if Supabase errors"
  - "onAuthStateChange subscription pattern: async handler re-fetches from DB, cleanup with unsubscribe"

requirements-completed: []

# Metrics
duration: 35min
completed: 2026-05-23
---

# Phase 9 Plan 03: Heart Buttons + Favorites Engine Summary

**Heart buttons wired to Supabase suosikit table on all three surfaces — list cards, map bottom sheet, profile page — with optimistic updates and auth-gate modal for signed-out users**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-05-23T06:00:00Z
- **Completed:** 2026-05-23T06:35:00Z
- **Tasks:** 6 + 1 auto-fix (7 commits total)
- **Files modified:** 7 (5 modified, 2 created)

## Accomplishments

- PaikkaKortti saa valinnaisen sydänpainikkeen (absolute top-right) kun `onToggleSuosikki` prop on tarjottu
- LiikuntapaikatLista ja Etusivu hallitsevat suosikit-tilan (`Set<number>`) Supabase-synkronoinnilla ja optimistisilla päivityksillä
- Etusivu-oikeassa työkalupalkissa näkyy nyt kirjautumis-/uloskirjautumispainike (User/LogOut)
- Valittu-pohjalevyssä sydän näkyy paikan nimen vieressä flex-rivillä
- Profiilisivu saa itsenäisen `HeartButton`-komponentin
- `/suosikit`-sivu: kirjautumattomalle "Suosikit vaativat kirjautumisen" + CTA-nappi, kirjautuneelle tyhjätila

## Task Commits

1. **T-03-1: Heart button to PaikkaKortti** - `71ec979` (feat)
2. **T-03-2: Favorites engine to LiikuntapaikatLista** - `a380986` (feat)
3. **T-03-3: Favorites state and heart to Etusivu** - `c027477` (feat)
4. **T-03-4: Create HeartButton for profile page** - `b8deb01` (feat)
5. **T-03-5: HeartButton to profile page hero** - `be09933` (feat)
6. **T-03-6: Update suosikit page with auth-aware content** - `a52a636` (feat)
7. **Auto-fix: Remove unused supabaseUser state from HeartButton** - `7921a60` (fix)

## Files Created/Modified

- `app/components/PaikkaKortti.tsx` — Lisätty `isSuosikki` + `onToggleSuosikki` props, sydänpainike absolute top-right
- `app/components/LiikuntapaikatLista.tsx` — Suosikit-tila, `toggleSuosikki`-funktio, AuthModal-mount, onAuthStateChange-subscriptio
- `app/components/Etusivu.tsx` — Suosikit-tila, auth-tila, `toggleSuosikki`, sydän valittu-levyssä, User/LogOut-painike työkalupalkissa, AuthModal-mount
- `app/components/HeartButton.tsx` — Uusi itsenäinen client-komponentti profiilisivulle
- `app/paikat/[id]/page.tsx` — HeartButton-import, nimi+sydän flex-rivillä herossa
- `app/suosikit/page.tsx` — Muutettu async server componentiksi joka kutsuu getUser()
- `app/suosikit/SuosikitClient.tsx` — Uusi client-komponentti: kirjautumaton/kirjautunut UI

## Decisions Made

- `supabaseUser`-tilaa ei tarvita `HeartButton`-komponentissa koska auth tarkistetaan `toggle()`-funktion sisällä `getUser()`-kutsulla — välttää stale closure -ongelman
- `toggleSuosikki` on `async function` (ei arrow state updater) jotta se voi kutsua `getUser()` tuoreella arvolla
- Auth-painike sijoitettu `rightOpen`-laajennettuun sisältöön kolmantena kohteena (Search → Heart → User/LogOut)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Poistettu käyttämätön `supabaseUser`-tila HeartButtonista**
- **Found during:** Buildivaihe (T-03-4 jälkeen)
- **Issue:** `supabaseUser` state määritelty mutta ei koskaan luettu komponentissa — aiheutti ESLint `no-unused-vars` -virheen joka esti buildin
- **Fix:** Poistettu `useState<User | null>` -tila ja kaikki `setSupabaseUser`-kutsut; `User`-tyypin import poistettu tarpeettomana
- **Files modified:** `app/components/HeartButton.tsx`
- **Verification:** `npm run build` läpäisee ilman virheitä
- **Committed in:** `7921a60`

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Korjaus tarpeellinen buildin läpäisemiseksi. Ei scope creep.

## Issues Encountered

Kaksi pre-existing varoitusta Etusivu.tsx:ssa (react-hooks/exhaustive-deps `MapAutoZoom`-komponentissa + `<img>`-elementti karttatapeille) — nämä ovat peräisin aiemmilta faaseilta eikä niitä tässä suunnitelmassa käsitellä.

## Next Phase Readiness

- Suosikit-engine toiminnallinen kaikilla kolmella pinnalla
- `suosikitIds: Set<number>` on nyt Etusivu-komponentissa valmiina 09-04:lle (AI-personalisointi)
- Plan 09-04 voi suoraan lukea `suosikitIds`-tilan ja muuttaa AI-haun POST-kutsuksi suosikit-tiedoilla

## Self-Check: PASSED

All 7 task files found on disk. All 7 commits verified in git log.

---
*Phase: 09-auth-and-favorites*
*Completed: 2026-05-23*
