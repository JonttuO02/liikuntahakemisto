# Phase 20: Navigaatio-korjaukset - Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 20 korjaa viisi navigaatio-epäjohdonmukaisuutta: (1) palauttaa scroll-sijainnin ja hakutilan kun käyttäjä palaa listakorttinäkymästä paikan profiilisivulta (NAV-01), (2) varmistaa että "Näytä kartalla" kohdistaa kartan paikan koordinaatteihin ilman GPS-aktivointia ja pitää bottom sheetin kiinni (NAV-02), (3) etusivun bottom sheet aloittaa suljettuna ja avautuu automaattisesti animoituna heti (NAV-03), (4) poistaa hakunapin NavPillistä /suosikit- ja /profiili-sivuilta (NAV-04), (5) korjaa /suosikit-sivun "Takaisin"-napit osoittamaan poistetun /?nakyma=lista -reitin sijaan / :lle (NAV-05).

</domain>

<decisions>
## Implementation Decisions

### Scroll-sijainnin palautus (NAV-01)
- **D-01:** Tekniikka: **sessionStorage**. Ennen navigointia /paikat/ID:lle DiagonaalKortti tallentaa koko hakutilan sessionStorageen. Etusivu lukee arvot mountissa ja palauttaa tilan.
- **D-02:** Mitä tallennetaan: **täydellinen tila** — `scrollTop` (search-results-containerin), `searchHaku`, `searchLaji`, `searchKertakaynti`, `searchAukinyt`, `searchKaupunki`, `searchOpen: true`. Suodattimet palautetaan täysin, ei vain scroll-sijainti.
- **D-03:** Milloin tallennetaan: DiagonaalKortin `<Link>`-elementin **onClick**-handlerissa ennen navigointia. Scroll-sijainti luetaan search-results-containerin `scrollTop`-arvosta.
- **D-04:** Palautuslogiikka: Etusivu tarkistaa mountissa `sessionStorage`-avaimen. Jos löytyy, asettaa kaikki hakutila-statet + avaa search-overlain. Yksi `useEffect([], [])` joka lukee ja siivoaa avain sen jälkeen (ei loputonta palautussykliä).
- **D-05:** sessionStorage-avain: `'etusivu-scroll-state'`. Sisältö JSON-serialisoitu.

### Bottom sheet -avausanimaatio (NAV-03)
- **D-06:** Alustustila muutetaan: `useState<'open'|'sliding'|'closed'>('closed')` (oli `'open'`).
- **D-07:** Auto-open: erillinen `useEffect` jossa deps `[]` — tarkistaa `if (!focusId) setSheetPhase('open')`. Ei setTimeout-viivettä — käynnistyy seuraavalla tikillä (0ms). Vastaa vaatimuksen "välittömästi".
- **D-08:** focusId-yhteensopivuus (NAV-02 + NAV-03): Auto-open effect tarkistaa `if (!focusId)` — jos URL sisältää `?id=X`, auto-open ei laukaise. Olemassa oleva focusId-effect (asettaa `sheetPhase('sliding')`) hoitaa tämän tapauksen. Kaksi erillistä effectiä, selkeä logiikka.

### NavPill-siivous (NAV-04)
- **D-09:** Poistetaan "Haku" / Search -kohta NavPillin dropdown-listasta (`app/components/NavPill.tsx`). Linkki meni poistettuun `/?nakyma=lista` -reittiin. Jäljelle jää: Profiili + Suosikit + Kirjaudu — sama kuin etusivun oikean toolbarin sisältö.

### TO DO -sivun "Takaisin"-napit (NAV-05)
- **D-10:** Korvataan kaikki `href="/?nakyma=lista"` viitteet `href="/"` :ksi `app/suosikit/SuosikitClient.tsx`:ssä (3 esiintymää: unauthenticated-state, empty-state, authenticated-state). Myös NavPillin "Haku"-linkki poistetaan D-09:ssä.

### Claude's Discretion
- Tarkka sessionStorage JSON-rakenne (kertaluonteiset yksityiskohdat)
- scrollTop-containerin ref-strategia (useRef DiagonaalKortille tai parentille)
- Auto-open effectin järjestys suhteessa muihin effecteihin (React takaa järjestyksen per mount)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system & constraints
- `CLAUDE.md` — glassmorphism utilities, animaatiot (Emil Kowalski), color system, Finnish UI vocabulary, Tailwind v3, AdvancedMarker patterns

### Requirements
- `.planning/REQUIREMENTS.md` §NAV-01, NAV-02, NAV-03, NAV-04, NAV-05 — vaatimusten tarkka teksti ja success criteria

### Key files (read before implementing)
- `app/components/Etusivu.tsx` — pääkohde: sheetPhase-alustus, auto-open effect, sessionStorage-palautus mountissa, focusId effect (säilyy ennallaan)
- `app/components/DiagonaalKortti.tsx` — lisätään onClick-handler joka tallentaa scroll-tilan + search-tilan ennen navigointia
- `app/components/NavPill.tsx` — poistetaan "Haku"-kohta dropdownista
- `app/suosikit/SuosikitClient.tsx` — korvataan 3× `/?nakyma=lista` → `/`
- `app/paikat/[id]/page.tsx` — "Näytä kartalla" linkki jo oikein (`/?id=${paikka.id}`) — ei muutoksia tarvita

### Existing patterns (read before implementing)
- `app/components/DiagonaalKortti.tsx` — HeartButton-pattern: onClick stopPropagation inside Link, miten lisätään onClick Linkin viereen

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Etusivu.tsx` `focusId` effect (lines 359–366) — jo hoitaa NAV-02:n oikein; auto-open guard käyttää samaa `focusId` muuttujaa
- `Etusivu.tsx` `sheetPhase` state machine — `'open' | 'sliding' | 'closed'` — lisätään vain alustusarvo `'closed'` ja yksi effect
- `Etusivu.tsx` search-results `<motion.div>` — sen `ref` tarvitaan scrollTop-lukemiseen; lisätään `useRef<HTMLDivElement>(null)` ja ref-prop

### Established Patterns
- sessionStorage-käyttö: jo käytössä AI-widgetin cache-avaimessa (`sessionStorage.getItem/setItem` try/catch) — sama pattern
- Framer Motion spring-animaatio sheetTransition:ssa — avausanimaatio käyttää olemassa olevaa 'open'-siirtymää (damping 28, stiffness 280, delay 0.1)
- `useEffect` mount-only: `useEffect(() => { ... }, [])` — vakiintunut pattern Etusivu:ssa

### Integration Points
- `DiagonaalKortti.tsx`: nykyinen `<Link href="/paikat/${paikka.id}">` saa onClick-callbackin joka laukaisee sessionStorage-tallennuksen; Etusivu välittää callback-propin (`onNavigate?: () => void`) tai DiagonaalKortti lukee suoraan `window.__scrollRef`? → Puhtaampi: Etusivu välittää `onCardClick` propin joka wrappaa scroll-tallennuksen, DiagonaalKortti kutsuu sitä (sama pattern kuin `onShowMap`)
- `NavPill.tsx`: puhdas poisto yhdestä `<Link>`-elementistä
- `SuosikitClient.tsx`: 3 yksinkertaista href-korjausta

</code_context>

<specifics>
## Specific Ideas

- sessionStorage-palautus: 0ms — luetaan mountissa, statet asetetaan ennen ensimmäistä renderöintiä (useLayoutEffect tai useEffect riippuen onko flashia)
- Auto-open timing: 0ms delay, "seuraavalla tikillä" — matches existing spring physics (damping 28, stiffness 280, delay 0.1 kuten sheetTransition 'open'-casessa)
- "Näytä kartalla" NAV-02: jo toimii oikein koodissa — focusId-effect + Link `/?id=${paikka.id}`. Ei koodimuutoksia tähän.

</specifics>

<deferred>
## Deferred Ideas

- Hakunapin lisääminen /suosikit ja /profiili -sivujen left-toolbariin (etusivun tapaan) — vaatisi Etusivu-logiikan siirtämisen layout-tasolle, ei tämän vaiheen scope
- Scroll-sijainnin palauttaminen window.scrollY-tasolle (tällä hetkellä search-results-containerin scrollTop) — jos tulevaisuudessa lista on page-level scroll

</deferred>

---

*Phase: 20-navigaatio-korjaukset*
*Context gathered: 2026-05-30*
