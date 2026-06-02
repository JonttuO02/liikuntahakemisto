# Phase 26: Filtterit - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 26 yksinkertaistaa filtterialueen poistamalla "Kertakäynti OK" ja "Auki nyt" -painikkeet ja korvaamalla `<select>`-dropdownit karusellianimaatiolla varustetuilla pill-komponenteilla (kaupunki + laji). Lajifiltteri muuttuu multi-selectiksi. Carousel-pillit sijaitsevat search-overlayn filtteririvillä. SessionStorage päivitetään `_v: 2` -kenttään.

</domain>

<decisions>
## Implementation Decisions

### Karuselli-pillit — FILTER-03

- **D-01:** Kaupunki- ja lajifiltterille tulevat **omat karuselli-pillit** search-overlayssa (korvaa nykyiset `<select>`-dropdownit). Ei erillisiä "Kertakäynti OK" tai "Auki nyt" -painikkeita.
- **D-02:** Karuselli on **ambient** — pyörii automaattisesti 2 sekunnin välein (sama kuin CalloutCard, Phase 24). Animaatiotyyli: **opacity crossfade** (`AnimatePresence`, `duration: 0.2s`, Emil Kowalski -periaate).
- **D-03:** Karusellin tila heijastaa valintojen tilaa:
  - 0 valintaa → pyörii kaikki saatavilla olevat vaihtoehdot (ambient discovery)
  - 1 valinta → näyttää valitun arvon **staattisesti** (karuselli pysähtyy)
  - 2+ valintaa (vain lajille) → pyörii valitut arvot vuorotellen
- **D-04:** Napautuksesta pillin alle **laajenee valintalistaus** kaikilla vaihtoehdoilla (chip/row-tyyli). Valitaan yksi tai useampia, lista sulkeutuu, pill päivittyy.

### Monivalinta — laji

- **D-05:** Lajifiltteri muuttuu **multi-selectiksi**: `searchLaji: string[]` (tyhjä taulukko = kaikki). Kaupunkifiltteri pysyy single-selectinä.
- **D-06:** Filteröintilogiikka: `searchLaji.length === 0 || searchLaji.includes(p.laji.toLowerCase())`
- **D-07:** `isFilterActive`: `searchLaji.length > 0 || searchKaupunki !== 'Kaikki'`

### Dead state removal — FILTER-02

- **D-08:** `searchKertakaynti` ja `searchAukinyt` **poistetaan kokonaan**: state-muuttujat, setter-kutsut, filteröintilogiikka, `isFilterActive`-tarkistukset ja sessionStorage-käsittely.
- **D-09:** `searchLaji` refaktoroidaan `string` → `string[]` kaikkine viittauksineen Etusivu.tsx:ssä (filteröinti, sessionStorage tallentaminen/palautus, `isFilterActive`).

### SessionStorage migration — FILTER-02

- **D-10:** Tallennettu tila saa `_v: 2` -kentän: `sessionStorage.setItem('etusivu-scroll-state', JSON.stringify({ ...state, _v: 2 }))`.
- **D-11:** Palautuksessa: jos `_v !== 2` (vanha sessio), **poistetaan koko sessioavain** eikä palauteta mitään filter-tiloja. Näin varmistetaan ettei poistettuja filttereitä (kertakäynti/aukinyt) voi palautua vanhoista sessioista.
- **D-12:** Vanhassa sessiossa mahdollisesti oleva `searchLaji: 'Padel'` (string) **ei palaudu** koska `_v !== 2` nollaa koko avaimen (D-11).
- **D-13:** Uudessa sessiossa (`_v: 2`) `searchLaji` tallennetaan `string[]`-muodossa ja palautetaan suoraan.

### Claude's Discretion

- Karusellin tarkat CSS-dimensiot (pill-koko, padding, min-width)
- Valintalistauksen tarkka tyyli (chip-grid vs. pystysuora lista)
- Tyhjätila: jos kaupunkifiltteri-optioita alle 3 (nykyinen `kaupungit.length > 2` -ehto), kaupunki-pill piilotetaan tai näytetään ilman karusellia
- Valintalistauksen avautumis-/sulkeutumisanimaatio (esim. `height: 0 → auto` tai `opacity+y`)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system & animaatiot
- `CLAUDE.md` — glassmorphism utilities, Emil Kowalski -animaatioperiaatteet (opacity crossfade, duration 0.2s), Tailwind v3, typography (2 weights only)

### Requirements
- `.planning/REQUIREMENTS.md` §FILTER-02, FILTER-03 — vaatimusten tarkka teksti
- `.planning/ROADMAP.md` §Phase 26 — success criteria (3 must be TRUE)

### Muutettavat tiedostot
- `app/components/Etusivu.tsx` — blast-radius-tiedosto; kaikki muutokset tähän tiedostoon. Filtteri-tila, karuselli-pillit, sessionStorage-logiikka

### Reusable patterns (lue ennen toteutusta)
- `app/components/Etusivu.tsx` §CalloutCard (rivi 109–153) — `setInterval` + `AnimatePresence` pattern karusellia varten (Phase 24 toteutti saman)
- `app/components/Etusivu.tsx` §sessionStorage restore (rivi 443–460) — palautuslogiikka; muokattava `_v: 2` -tarkistuksella
- `app/components/Etusivu.tsx` §filtteririvi (rivi 1318–1357) — nykyiset `<select>`-dropdownit ja poistuva painikepari
- `lib/lajit.ts` — `LAJIT_FILTTERI` lista karuselliin; `lajiKonfig` lajien labelit/värit
- `lib/cityFilter.ts` — `deriveKaupungit` palauttaa kaupunkilistan ('Kaikki'-sentinel mukaan); käytetään kaupunki-karusellin sisältönä

### Phase 23–25 output (do NOT regress)
- `app/components/Etusivu.tsx` §TodoButton + TodoOverlay — Phase 25:ssa toteutettu; älä muuta todo-toiminnallisuutta
- `app/globals.css` — Phase 23:ssa lisätyt animaatiot; älä muuta

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LAJIT_FILTTERI` (`lib/lajit.ts`): valmis lista lajivaihtoehdoista karusellin sisällöksi
- `deriveKaupungit(paikat)` (`lib/cityFilter.ts`): palauttaa `['Kaikki', 'Tampere', 'Helsinki', ...]` — käytä slice(1) karuselliin (skipattaan 'Kaikki')
- `AnimatePresence` + `motion.div` + `key` + `setInterval`: Phase 24 CalloutCard toteutti identtisen karuselli-patternin — kopioi rakenne
- `glass rounded-full` pill-tyyli: jo käytössä filtteririveillä ja toolbar-pilleissä

### Established Patterns
- Karuselli: `const [idx, setIdx] = useState(0)` + `useEffect(() => { const id = setInterval(() => setIdx(i => (i+1) % items.length), 2000); return () => clearInterval(id) }, [items.length])`
- `AnimatePresence mode="wait"` + `motion.div key={idx}` + `initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}` + `transition={{ duration: 0.2 }}`
- Karuselli pysähtyy: kun `selected.length === 1`, renderöi staattisesti ilman interval-logiikkaa (ei tarvita `clearInterval`, vain `if (selected.length !== 1) setInterval(...)`)

### Integration Points
- `searchLaji: string[]` muutos: kaikki nykyiset `searchLaji === 'Kaikki'` -vertailut → `searchLaji.length === 0`; `searchLaji !== 'Kaikki'` → `searchLaji.length > 0`
- `sessionStorage` tallentaminen (rivi 340–349): lisää `_v: 2` ja muuta `searchLaji` string[] -formaattiin
- `sessionStorage` palautus (rivi 443–460): lisää `_v`-tarkistus ennen muiden kenttien palautusta; poista `searchKertakaynti` / `searchAukinyt` -palautuslinjat
- `isFilterActive` (rivi 686): `searchLaji !== 'Kaikki' || searchKertakaynti || searchAukinyt || searchKaupunki !== 'Kaikki'` → `searchLaji.length > 0 || searchKaupunki !== 'Kaikki'`
- "Tyhjennä haku" -nappi (rivi 1383–1389): poista `setSearchKertakaynti(false)` ja `setSearchAukinyt(false)`; muuta `setSearchLaji('')` → `setSearchLaji([])`

</code_context>

<specifics>
## Specific Ideas

- Karuselli ambient-tilassa (0 valintaa): laji-karuselli syklaa `LAJIT_FILTTERI.filter(l => l !== 'Kaikki')` (kaikki lajit); kaupunki-karuselli syklaa `deriveKaupungit(paikat).filter(k => k !== 'Kaikki')`
- Karuselli 1 valinta: renderöi valittu arvo ilman AnimatePresencen key-vaihtoa (staattinen teksti)
- Karuselli 2+ valintaa: syklaa vain `selected`-taulukko
- Valintalistaus: avautuu pillin alle `AnimatePresence` height/opacity -animaatiolla; chipsit `glass rounded-full text-xs font-bold` -tyylillä; valittu chip korostetaan `bg-[#111111] text-white`

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 26-filtterit*
*Context gathered: 2026-06-02*
