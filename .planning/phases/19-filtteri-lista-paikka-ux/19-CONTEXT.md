# Phase 19: Filtteri, lista & paikka-UX - Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 19 tekee neljä muutosta etusivun lista-UX:iin: (1) korvaa hintasuodattimet kertakäynti-filtterillä, (2) korvaa DiagonaalKortin kartta-snapshotin paikka kuvalla (image_url Supabasesta), (3) pienentää Karuselli-kortteja ja kasvattaa AI-widgeti kaksirivaiseksi, (4) lisää DiagonaalKorttiin pin-ikoni-napin joka sulkee listan ja zoomaa kartan paikkaan. Lisäksi lisätään `image_url`-kenttä paikat-tauluun (DATA-08).

</domain>

<decisions>
## Implementation Decisions

### Kertakäynti-filtteri (FILTER-01)
- **D-01:** Kertakäynti-tunnistus käyttää `!isMembershipOnly(paikka)` logiikkaa — sama heuristiikka kuin olemassa oleva `lib/priceUtils.ts`. Ei uutta kenttää tietokantaan.
- **D-02:** Hintasuodattimet (`HINTA_FILTTERI` array + `searchHinta` state) poistetaan kokonaan Etusivu.tsx:stä. Tilalle tulee yksi toggle-nappi "Kertakäynti OK" joka on on/off-tila (`searchKertakaynti: boolean`).
- **D-03:** `isFilterActive` -tarkistus (toolbar indicator dot) päivitetään sisältämään `searchKertakaynti`.

### Paikka kuva DiagonaalKortissa (UI-19)
- **D-04:** `image_url`-kenttä lisätään `lib/types.ts` Liikuntapaikka-tyyppiin (`image_url?: string | null`).
- **D-05:** DiagonaalKortin oikea puoli: jos `paikka.image_url` on asetettu, näytetään se `<img>` -tagilla `object-cover`. Fallback (ei image_url): säilytetään nykyinen laji-väri + ikoni (kuten `hasCoords === false` -case nyt). Static Maps -logiikka (`staticMapsUrl`, `MAP_ID`) poistetaan DiagonaalKortista kokonaan.
- **D-06:** Supabase migration lisää `image_url TEXT` sarakkeen paikat-tauluun.

### Pin-nappi DiagonaalKortissa (UI-21)
- **D-07:** Pin-nappi sijaitsee vasemman info-paneelin **alaosassa** omana `<button>`-elementtinä. `<Link>` kattaa muun vasemman paneelin. Nappi saa `e.stopPropagation()` + `e.preventDefault()` jotta Link ei aktivoidu.
- **D-08:** DiagonaalKortti saa uuden prop: `onShowMap?: (paikka: Liikuntapaikka) => void`. Etusivu välittää callbackin joka tekee: `setSearchOpen(false)` + `setAutoZoomTarget({ lat, lng })` + `pendingValittuRef.current = paikka` (sama flow kuin "Näytä kartalla" -nappi profiilisivulla).
- **D-09:** Nappi näkyy vain kun `paikka.latitude != null && paikka.longitude != null` — muuten piilotettu (`hidden` tai ei renderöidä).
- **D-10:** Pin-napin ikoni: `MapPin` (lucide-react, jo importattu DiagonaalKortissa). Pieni, `w-3.5 h-3.5`, glass-btn tyyli.

### AI-widget + Karuselli layout (UI-20)
- **D-11:** AI-widget kasvaa kaksirivaiseksi: `flex-col gap-1` rakenne. Ylärivi: sää-emoji + lämpötila + kaupunki + yö/päivä-nappi. Alarivi: `aiTeksti` (tekstiä rivitetään, `text-sm`, ei `shrink-0`). Widget saa lisää pystykorkeutta (`py-4` tai vastaava).
- **D-12:** Karuselli-kortit pienennetään noin 30 %: `bottom: '10%'` → `bottom: '5%'` ja Karuselli-containerin `max-height` lisätään (esim. 160px). Claude päättää tarkat arvot jotka näyttävät hyvältä.

### Claude's Discretion
- Karusellin tarkat pixel-arvot / fractions pienentämiselle
- AI-widgetin padding ja flex-rakenne tarkemmin
- Pin-napin tarkka CSS-sijoitus vasemman paneelin alaosassa

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system & constraints
- `CLAUDE.md` — glassmorphism utilities, animaatiot (Emil Kowalski, scale+easeOut), color system, Finnish UI vocabulary, Tailwind v3

### Requirements
- `.planning/REQUIREMENTS.md` §FILTER-01, UI-19, UI-20, UI-21, DATA-08 — vaatimusten tarkka teksti

### Key files (read before implementing)
- `app/components/DiagonaalKortti.tsx` — muutettava komponentti (image_url, pin-nappi, onShowMap prop)
- `app/components/Etusivu.tsx` — integraatiopiste: HINTA_FILTTERI poistetaan, searchHinta → searchKertakaynti, onShowMap callback
- `app/components/Karuselli.tsx` — CARD_W ja bottom-arvo pienennetään
- `lib/priceUtils.ts` — isMembershipOnly logiikka kertakäynti-filtteriä varten
- `lib/types.ts` — image_url lisätään Liikuntapaikka-tyyppiin

### Database
- `supabase/migrations/` — uusi migraatiotiedosto image_url TEXT -sarakkeelle

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/priceUtils.ts` `isMembershipOnly(paikka)` — käännetään filtteriksi: `!isMembershipOnly(paikka)` = kertakäynti OK
- `DiagonaalKortti.tsx` `SPORT_ICONS` + fallback-div — säilytetään image_url-fallbackina
- `Etusivu.tsx` `setAutoZoomTarget` + `pendingValittuRef` + `setSearchOpen` — onShowMap callbackin sisältö

### Established Patterns
- HeartButton-pattern: `<button onClick={e => { e.stopPropagation(); e.preventDefault(); ... }}>` sisällä `<Link>`:ssä
- `glass-btn rounded-full` pienille ikoninappeille
- Migration: `supabase/migrations/YYYYMMDDHHMMSS_add_image_url.sql`

### Integration Points
- `Etusivu.tsx`: DiagonaalKortti-renderöinti saa uuden `onShowMap` prop
- `Etusivu.tsx` state: `searchHinta` poistetaan, `searchKertakaynti` lisätään
- `Etusivu.tsx` filtter-logiikka (`useMemo suodatettu`): hinta-filtteri → kertakäynti-filtteri
- `lib/types.ts` + Supabase migraatio: image_url-kenttä

</code_context>

<specifics>
## Specific Ideas

- Pin-nappi vasemman paneelin alaosassa — ei erillistä bar:ia, ei muuta kortin h-32-korkeutta
- Kertakäynti-filtteri on yksinkertainen toggle (ei hintabracket-listaa)
- AI-teksti rivitetään luonnollisesti (ei `truncate`), widget flex-col
- Karuselli noin 30% lyhyemmät kortit — tarkat arvot Claudelle

</specifics>

<deferred>
## Deferred Ideas

- Skeleton/blur-up animaatio image_url-kuvalle latautuessa — visuaalinen parannus, deferred
- Kuva-upload Supabase Storageen (tällä hetkellä manuaalinen URL) — deferred

</deferred>

---

*Phase: 19-filtteri-lista-paikka-ux*
*Context gathered: 2026-05-30*
