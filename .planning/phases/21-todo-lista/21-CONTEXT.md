# Phase 21: TO DO -lista - Context

**Gathered:** 2026-05-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 21 korvaa suosikit-järjestelmän TO DO -listaksi: Heart-ikoni → Bookmark koko sovelluksessa, HeartButton-komponentti nimetään BookmarkButton:ksi, kaikki "Suosikit"-tekstit muuttuvat "TO DO":ksi, ja /suosikit-sivu näyttää DiagonaalKortti-listauksen kirjanmerkki-poistonapilla.

</domain>

<decisions>
## Implementation Decisions

### Sivun URL
- **D-01:** URL pysyy `/suosikit` — polkua ei muuteta. Supabase-taulu `suosikit` säilyy nimellään. Olemassa olevia kirjanmerkkejä ei rikota.

### Suomenkielinen nimi "TO DO"
- **D-02:** UI-label on "TO DO" (englanninkielinen lainasana, kuten roadmap määrittelee). NavPill: "TO DO", sivun otsikko: "TO DO -lista", aria-labelit: "Lisää TO DO -listalle" / "Poista TO DO -listalta".

### HeartButton → BookmarkButton (tiedosto + komponentti)
- **D-03:** `app/components/HeartButton.tsx` nimetään `app/components/BookmarkButton.tsx`:ksi. Komponenttinimi `HeartButton` → `BookmarkButton`, propsityyppi `HeartButtonProps` → `BookmarkButtonProps`. Kaikki import-kohdat päivitetään (vähintään: `app/paikat/[id]/page.tsx`).
- **D-04:** Lucide-ikoni Heart → Bookmark (tai BookmarkCheck täytettynä — Claude päättää mikä näyttää parhaalta). Aria-labelit päivitetään suomen kielessä.
- **D-05:** `PaikkaSheet.tsx` props: `suosikki: boolean` → `todo: boolean`, `onToggleSuosikki: (id: number) => void` → `onToggleTodo: (id: number) => void`. Heart-ikoni → Bookmark-ikoni PaikkaSheet:n toggle-napissa.
- **D-06:** `Etusivu.tsx` sisäiset muuttujat: `suosikitIds` → `todoIds`, `toggleSuosikki` → `toggleTodo`, `suosikkiNimet` → `todoNimet` (Claude päättää onko API payload key `/api/saasuositus`:ssa syytä muuttaa — se on sisäinen).

### TO DO -listan näkymä (SuosikitClient)
- **D-07:** SuosikitClient korvataan kokonaan uudella toteutuksella: listaus käyttää DiagonaalKortti-komponenttia (sama kuin Etusivun lista-näkymässä).
- **D-08:** Listan rakenne per paikka: `flex flex-row items-start gap-2` — `[DiagonaalKortti flex-1]` + `[kirjanmerkki-poistonappi shrink-0]`. Poistonappi on kortin ulkopuolella, samalla rivillä, kortin oikealla puolella.
- **D-09:** Poistonappi: kirjanmerkki-ikoni (täytetty = TO DO -listalla). Painaminen tekee optimistisen poiston: poistetaan kohde listasta välittömästi UI:ssa, sen jälkeen `supabase.delete()` taustalla. Jos delete epäonnistuu, paikka palautetaan listaan.
- **D-10:** DiagonaalKortille välitetään `onShowMap`-prop TO DO -sivulla — pin-nappi toimii ja navigoi `/?id=<paikka_id>`:hen (karttanäkymä kohdistuu paikkaan). Käytä `router.push('/?id=' + place.id)` (`useRouter` from `next/navigation`).
- **D-11:** Tyhjiö-tila (ei TO DO -paikkoja): Bookmark-ikoni + otsikko "Ei vielä TO DO -paikkoja" + "Selaa hakemistoa" -nappi. Aiemman Heart-ikonin tilalle.
- **D-12:** Kirjautumaton käyttäjä: Bookmark-ikoni + "TO DO -lista vaatii kirjautumisen" + "Kirjaudu sisään" -nappi.

### NavPill & NavBar
- **D-13:** `NavPill.tsx`: Heart → Bookmark, "Suosikit" → "TO DO".
- **D-14:** `NavBar.tsx` (global layout.tsx:ssa): Heart → Bookmark, "Suosikit" → "TO DO". (Huom: NavBar:n `/?nakyma=lista` Haku-linkki on yhä siellä — ei tämän vaiheen scope, mutta älä poista tai muuta sitä.)

### Claude's Discretion
- Tarkka Bookmark vs BookmarkCheck vs BookmarkX ikoni-valinta eri tiloille (täytetty/tyhjä)
- Poistonapin tarkka koko ja sijainti DiagonaalKortin oikealla puolella
- `todoNimet` API payload key `/api/saasuositus`:ssa vai pidetään `suosikit`-avain muuttumattomana
- Tyhjiö-tilojen tarkka kopioksti

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system & constraints
- `CLAUDE.md` — glassmorphism utilities, animaatiot (Emil Kowalski), color system, Finnish UI vocabulary, Tailwind v3

### Requirements
- `.planning/REQUIREMENTS.md` §TODO-01, TODO-02 — vaatimusten tarkka teksti ja success criteria

### Key files (read before implementing)
- `app/components/HeartButton.tsx` → nimetään BookmarkButton.tsx:ksi; tarkista ennen toteuttamista
- `app/suosikit/SuosikitClient.tsx` → korvataan DiagonaalKortti-pohjaisella toteutuksella
- `app/components/DiagonaalKortti.tsx` — reused; tarkista `onShowMap` optional prop -pattern
- `app/components/NavPill.tsx` — "Suosikit" + Heart → "TO DO" + Bookmark
- `app/components/NavBar.tsx` — "Suosikit" + Heart → "TO DO" + Bookmark (älä muuta muita linkkejä)
- `app/components/PaikkaSheet.tsx` — props rename: suosikki→todo, onToggleSuosikki→onToggleTodo
- `app/components/Etusivu.tsx` — toggleSuosikki→toggleTodo, suosikitIds→todoIds, PaikkaSheet-props päivitetään
- `app/paikat/[id]/page.tsx` — HeartButton → BookmarkButton import päivitetään

### Database
- Supabase-taulu `suosikit` **pysyy nimellään** — ei migraatiota tässä vaiheessa

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/components/DiagonaalKortti.tsx` — käytetään TO DO -sivun listauksessa sellaisenaan; `onShowMap` jätetään välittämättä
- `app/components/HeartButton.tsx` (→ BookmarkButton) — olemassa oleva toggle-logiikka (optimistinen päivitys, AuthModal-integraatio) säilyy; vain ikoni + tekstit muuttuvat
- `Etusivu.tsx` `toggleTodo`-logiikka (→ aiemmin `toggleSuosikki`) — sama pattern siirrettynä SuosikitClient:iin poistonappia varten

### Established Patterns
- Optimistinen Supabase-päivitys: `setState(!current)` ensin, `supabase.delete/insert` taustalla, palauta vanha tila virheellä — pattern jo HeartButton.tsx:ssä ja Etusivu.tsx:ssä
- `glass-btn w-8 h-8 rounded-full` pienille ikoninappeille (käytetään myös PaikkaSheet:n toggle-napissa)
- `motion.button whileTap={{ scale: 0.85 }}` ikoninappeille

### Integration Points
- `Etusivu.tsx` → PaikkaSheet-kutsu: `suosikki`/`onToggleSuosikki` -propset päivitettävä samaan aikaan kuin PaikkaSheet-interface
- `app/paikat/[id]/page.tsx` → HeartButton-import päivitettävä BookmarkButton:iksi
- Lucide-react: `Bookmark` ja `BookmarkCheck` ovat saatavilla versiossa 1.16.0

</code_context>

<specifics>
## Specific Ideas

- TO DO -sivun korttirivit: `flex flex-row items-start gap-2` — DiagonaalKortti vie `flex-1`, poistonappi on `shrink-0` kortin oikealla puolella
- Poistonappi: täytetty bookmark → klikki → optimistinen poisto listalta (ei vahvistusdialogia)
- NavPillin linkki näkyy vain kirjautuneelle käyttäjälle (sama guard kuin nyt: `{user && ...}`)

</specifics>

<deferred>
## Deferred Ideas

- "Merkitse vierailtu" -toiminto TO DO -listalla — ei v1.4 scope
- TO DO -listan jako muille käyttäjille — ei v1.4 scope
- NavBar:n `/?nakyma=lista` Haku-linkin siivous — ei tämän vaiheen scope

</deferred>

---

*Phase: 21-todo-lista*
*Context gathered: 2026-05-31*
