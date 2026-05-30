---
phase: 20-navigaatio-korjaukset
plan: 01
subsystem: ui
tags: [nextjs, react, navigation, navpill, suosikit]

# Dependency graph
requires:
  - phase: 19-filtteri-lista-paikka-ux
    provides: NavPill ja SuosikitClient komponentit jotka tarvitsivat navigaatiokorjauksia
provides:
  - NavPill-valikko ilman dead Haku-linkkia (NAV-04)
  - SuosikitClient kolmella korjatulla back-linkilla jotka osoittavat "/" (NAV-05)
affects: [21-todo-lista, 22-profiili-ai-kiinnostukset]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dead route /?nakyma=lista poistettu kaikesta navigaatiosta — takaisin-linkit osoittavat /"

key-files:
  created: []
  modified:
    - app/components/NavPill.tsx
    - app/suosikit/SuosikitClient.tsx
    - app/components/Etusivu.tsx

key-decisions:
  - "NAV-04: NavPill-laajennettu valikko sisältää vain Profiili, Suosikit, Kirjaudu — ei Haku-linkkia"
  - "NAV-05: Kaikki SuosikitClient takaisin-linkit osoittavat '/' eikä dead-routeen /?nakyma=lista"

patterns-established:
  - "Dead URL-parametrit (?nakyma=lista) on poistettava kaikesta navigaatiosta"

requirements-completed:
  - NAV-04
  - NAV-05

# Metrics
duration: 15min
completed: 2026-05-30
---

# Phase 20 Plan 01: Navigaatio-korjaukset Summary

**Dead Haku-linkki poistettu NavPill-valikosta ja kolme broken back-linkkia SuosikitClientissa korjattu osoittamaan kotisivulle**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-30T13:12:00Z
- **Completed:** 2026-05-30T13:27:52Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- NavPill-laajennettu valikko sisältää nyt vain Profiili, Suosikit ja Kirjaudu — Haku-linkki joka osoitti dead routeen /?nakyma=lista on poistettu
- Kolme back-linkkia SuosikitClientissa korjattu: unauthenticated-tila "Takaisin hakemistoon", empty-tila "Selaa hakemistoa" ja authenticated-tila "Takaisin hakemistoon" osoittavat nyt "/"
- Build läpäisty ilman TypeScript-virheitä

## Task Commits

Jokainen tehtävä commitoitu atomisesti:

1. **Task 1: Remove "Haku" link from NavPill dropdown (NAV-04)** - `97c9353` (fix)
2. **Task 2: Fix three back-link hrefs in SuosikitClient (NAV-05)** - `ff3b3a5` (fix)

**Plan metadata:** `(tulossa)` (docs: complete plan)

## Files Created/Modified
- `app/components/NavPill.tsx` - Poistettu Haku-linkki ja Search-ikoni-importti
- `app/suosikit/SuosikitClient.tsx` - Kolme href="/?nakyma=lista" vaihdettu href="/"
- `app/components/Etusivu.tsx` - Auto-fix: poistettu käyttämaton SPORT_ICONS konstanto ja sen lucide-react ikonit

## Decisions Made
- Haku-linkki poistettu kokonaan ilman korvaajaa — hakutoiminnallisuus ei kuulu nykyiseen navigaatiomalliin
- Back-linkit osoittavat "/" (homepage), mikä on karttanäkymä suunnitelman mukaisesti

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Poistettu käyttamaton SPORT_ICONS konstanto Etusivu.tsx:sta**
- **Found during:** Task 1 (NavPill build-vaihe)
- **Issue:** Etusivu.tsx sisälsi `const SPORT_ICONS: Record<string, LucideIcon>` jota ei käytetty missään — TypeScript/ESLint reportoi unused variable -virheen joka esti buildin
- **Fix:** Poistettu SPORT_ICONS konstanto (rivit 31-34) sekä siihen liittyvät importit (Dumbbell, Waves, Leaf, Building2, Zap, Target, Activity, LucideIcon)
- **Files modified:** app/components/Etusivu.tsx
- **Verification:** Build läpäistiin onnistuneesti
- **Committed in:** 97c9353 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix oli välttämaton buildin onnistumiseksi. Ei scope creep — poistettu vain käyttamaton koodi.

## Issues Encountered
- `.env.local` puuttui worktree-hakemistosta — kopioitu päarepositorion juuresta. Tämä on worktree-ympäristön normaali rajoite.

## User Setup Required
None - ei ulkoisia palveluita tai ympäristömuuttujia tarvita.

## Next Phase Readiness
- Navigaatiokorjaukset valmis — NavPill ja SuosikitClient ilman dead-routeja
- Phase 20 plan 02 voi edetä riippumattomasti

---
*Phase: 20-navigaatio-korjaukset*
*Completed: 2026-05-30*
