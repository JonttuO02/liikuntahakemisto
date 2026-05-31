---
phase: 21-todo-lista
plan: 02
subsystem: ui
tags: [react, lucide-react, framer-motion, supabase, next-navigation]

# Dependency graph
requires:
  - phase: 21-todo-lista/01
    provides: BookmarkButton rename from HeartButton (plan 01 scope)
provides:
  - SuosikitClient replaced with DiagonaalKortti-based TO DO list with optimistic delete
  - NavPill and NavBar updated: Bookmark icon + 'TO DO' label
  - BottomNav and PaikkaKortti updated for codebase consistency (Heart removed)
  - DiagonaalKortti extended with onShowMap and onCardClick optional props
affects: [Etusivu, PaikkaSheet, suosikit page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Optimistic delete with rollback in SuosikitClient (removeTodo captures previous state, restores on error)
    - DiagonaalKortti onShowMap prop: pin navigates router.push('/?id=' + place.id)
    - BookmarkCheck icon requires both fill- and text- Tailwind classes for correct rendering

key-files:
  created: []
  modified:
    - app/suosikit/SuosikitClient.tsx
    - app/components/DiagonaalKortti.tsx
    - app/components/NavPill.tsx
    - app/components/NavBar.tsx
    - app/components/BottomNav.tsx
    - app/components/PaikkaKortti.tsx

key-decisions:
  - "DiagonaalKortti extended with onShowMap?: (paikka: Liikuntapaikka) => void and onCardClick?: () => void optional props (Rule 2 auto-fix)"
  - "SuosikitClient uses Bookmark icon (empty) and BookmarkCheck icon (remove button) per icon state convention"
  - "Takaisin-linkit updated from /?nakyma=lista to / — avoids dead parameter per CLAUDE.md constraint"
  - "removeTodo creates fresh createBrowserSupabase() per call — same pattern as HeartButton"

patterns-established:
  - "Optimistic list delete: capture previous = state, filter optimistically, supabase.delete(), rollback on error"
  - "DiagonaalKortti in flex-1 min-w-0 wrapper prevents flex overflow in row layouts"

requirements-completed:
  - TODO-01
  - TODO-02

# Metrics
duration: 25min
completed: 2026-05-31
---

# Phase 21 Plan 02: TO DO -lista SuosikitClient + Nav-ikonit Summary

**SuosikitClient korvattu DiagonaalKortti-pohjaisella TO DO -listalla, Heart-ikonit vaihdettu Bookmark/BookmarkCheckiksi NavPill-, NavBar-, BottomNav- ja PaikkaKortti-komponenteissa**

## Performance

- **Duration:** 25 min
- **Started:** 2026-05-31T00:00:00Z
- **Completed:** 2026-05-31T00:25:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- SuosikitClient.tsx taysin korvattu: auth state machine (loading/unauthenticated/authenticated), userId state, removeTodo-funktio optimistisella poistologiikalla ja rollbackilla
- Kirjautuneen kayttajan nakyma: DiagonaalKortti jokaiselle TO DO -paikalle + BookmarkCheck-poistonappi oikealla
- Pin-nappi DiagonaalKortissa navigoi `/?id=<paikka_id>` (router.push) — karttanakyma kohdistuu paikkaan
- NavPill ja NavBar: Heart Bookmark, "Suosikit" "TO DO" (Haku-linkki koskemattomana)
- BottomNav ja PaikkaKortti paivitetty johdonmukaisuuden vuoksi (dead files)

## Task Commits

1. **Task 1: Replace SuosikitClient with DiagonaalKortti-based TO DO list** - `08a1ddf` (feat)
2. **Task 2: Update NavPill, NavBar, BottomNav, PaikkaKortti icons and labels** - `fc5dd84` (feat)

## Files Created/Modified

- `app/suosikit/SuosikitClient.tsx` - Taysin korvattu: DiagonaalKortti-lista, optimistinen poisto, Bookmark/BookmarkCheck-ikonit, TO DO -tekstit
- `app/components/DiagonaalKortti.tsx` - Lisatty `onShowMap?: (paikka: Liikuntapaikka) => void` ja `onCardClick?: () => void` optional props
- `app/components/NavPill.tsx` - Heart Bookmark, "Suosikit" "TO DO"
- `app/components/NavBar.tsx` - Heart Bookmark, "Suosikit" "TO DO" (Haku koskemattomana)
- `app/components/BottomNav.tsx` - Heart Bookmark, "Suosikit" "TO DO" (dead file, consistency)
- `app/components/PaikkaKortti.tsx` - Heart Bookmark/BookmarkCheck, isSuosikki isTodo, onToggleSuosikki onToggleTodo (dead file, consistency)

## Decisions Made

- Takaisin-linkit muutettu `/?nakyma=lista` `/` koska `?nakyma=lista` ei ole tassa kontekstissa luonteva kotisivu; `/` avaa karttanakyma (etusivun) per CLAUDE.md URL-routing
- DiagonaalKortille lisatty `onShowMap`-prop (Rule 2 auto-fix) — suunnitelman must_have vaatii toimivan pin-navigaation; prop oli kuvailtu PLAN.md:ssa mutta puuttui tiedostosta

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Lisatty onShowMap-prop DiagonaalKortti-interfaceen**
- **Found during:** Task 1 (SuosikitClient toteutus)
- **Issue:** PLAN.md vaatii pin-navigaation `/?id=<paikka_id>`:hen onShowMap-propin kautta (must_have truths rivi 24), mutta DiagonaalKortti.tsx:ssa interface sisalsi vain `paikka` ja `distanceStr` — ei `onShowMap`-propsia. TypeScript olisi hylannyt kutsun.
- **Fix:** Lisatty `onShowMap?: (paikka: Liikuntapaikka) => void` ja `onCardClick?: () => void` DiagonaalKorttiProps-interfaceen ja funktion parametreihin. Molemmat optional, joten olemassa olevat kayttokohdat eivat rikkoudu.
- **Files modified:** app/components/DiagonaalKortti.tsx
- **Verification:** `npx tsc --noEmit` — ei virheita
- **Committed in:** 08a1ddf (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical functionality)
**Impact on plan:** Auto-fix valttamoton suunnitelman must_have-vaatimuksen tayttamiseksi. Ei scope creep.

## Issues Encountered

PATTERNS.md (rivi 273-275) antoi ristiriitaisen ohjeen: `<DiagonaalKortti paikka={p} />` ja kommentti "onShowMap intentionally omitted". Tama on vanhentunut kommentti — PLAN.md:n must_haves (rivi 24) eksplisiittisesti vaatii toimivan pin-navigaation. Valittu PLAN.md:n must_haves-vaatimus ohittamaan PATTERNS.md-ohjeen.

## Known Stubs

Ei stubeja. Kaikki TO DO -sivun toiminnallisuus on kytketty oikeisiin data-lahteisiin (Supabase + auth).

## Next Phase Readiness

- TO DO -lista toiminnallinen: DiagonaalKortti-kortit, pin-navigaatio, optimistinen poisto
- NavPill ja NavBar nayttavat Bookmark-ikonin ja "TO DO"-labelin kirjautuneille kayttajille
- Phase 21 Plan 01 (BookmarkButton-uudelleennimeaminen) taydentaa kokonaisuuden

---
*Phase: 21-todo-lista*
*Completed: 2026-05-31*
