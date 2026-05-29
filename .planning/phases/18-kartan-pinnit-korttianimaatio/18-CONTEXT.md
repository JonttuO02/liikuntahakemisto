# Phase 18: Kartan pinnit & korttianimaatio — Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Kolme karttaominaisuutta: (1) Yhtenäinen punainen pinni + laji-SVG-ikoni valkoisella ympyrätaustalla (MAP-08). (2) Sama-koordinaatti-klusterointi — klusteri-pinni numerolla, popup listan yllä (MAP-09). (3) Pienkortin in-place laajennus — mini-card → kompakti kortti AdvancedMarkerin sisällä ilman bottom sheettia (MAP-10).

</domain>

<decisions>
## Implementation Decisions

### Pinnin design (MAP-08)
- **D-01:** Kaikki pinnit ovat punaisia (perinteinen Google Maps -tyyli). Väri: `#ef4444` (red-500) tai vastaava. Ei lajikohtaisia värejä pinneissä.
- **D-02:** Pinnin muoto: sama teardrop-muoto kuin nykyinen (28×38 px, SVG path unchanged).
- **D-03:** Pinnin sisällä: valkoinen ympyrä taustana + laji-SVG-ikoni tummilla viivoilla ympyrän päällä. Pyöreät ikonit (esim. uinti) voivat peittää valkoisen osuuden kokonaan — hyväksyttyä.
- **D-04:** Ikonin viivan väri valkoisella taustalla: Clauden päätettävä (loogisesti tumma, esim. `#374151` tai `#111111`).
- **D-05:** `lib/sportPins.ts`:ssä `pinUrl`-funktion väriparametri korvataan kiinteällä punaisella; ikonin stroke vaihdetaan tummaksi (ei valkoiseksi).

### Klusterointi (MAP-09)
- **D-06:** Sama-osoite-tunnistus: koordinaatit pyöristettynä (lat/lng ±0.0001 astetta ≈ 11 m). Lasketaan `paikatKartalla`-arraysta ennen renderöintiä.
- **D-07:** Klusteri-pinni: sama punainen teardrop-muoto, valkoinen ympyrä, numero (klusterin koko) ikonin sijaan.
- **D-08:** Klusterin tap: pieni popup-lista pinnin yläpuolelle. Listaa paikat (nimi + laji-badge). Paikan napautus avaa sen in-place kortin (MAP-10 mekanismi).
- **D-09:** Popup sulkeutuu kun napataan muualle kartalle (backdrop tai map-click).

### In-place kortti (MAP-10)
- **D-10:** Nykyinen `valittu`-bottom sheet **poistetaan kokonaan** — MAP-10 korvaa sen. JSX-blokki `{valittu && <motion.div ...>}` (slide-up sheet) poistetaan.
- **D-11:** Vuorovaikutus: zoom < 16 → pinni (napaus zoomaa lähemmäksi). Zoom ≥ 16 → mini-kortti (nykyinen). Mini-kortin napaus → in-place laajenee isommaksi kortiksi.
- **D-12:** Laajennetun kortin sisältö (kompakti): nimi, laji-badge, hinta, "auki nyt" -status, etäisyys, X-nappi sulkemiseen, CTA "Näytä tiedot" → `/paikat/[id]`.
- **D-13:** Kortin sijainti: in-place pinnin yläpuolelle. Renderöidään AdvancedMarkerin sisällä AnimatePresence:lla (laajenee mini-kortista ylöspäin).
- **D-14:** Sulkeminen: X-nappi kortissa TAI napaus muualle kartalle (backdrop).
- **D-15:** Laajennettu kortti käyttää `valittu`-tilamuuttujaa (tai uutta `expandedPin`-tilaa). `setValittu(null)` sulkee kortin.

### Clauden päätettävät
- Tarkat punaisen värin sävy ja ikonin dark-väri valkoisella ympyrällä.
- Popup-listan tarkka visuaalinen muoto (glass-pill? glass-rounded-2xl?).
- AdvancedMarkerin anchor-point jotta kortti ei mene ruudun ulkopuolelle.
- Uuden `expandedPin`-tilan tarve vs. `valittu`-tilan uudelleenkäyttö.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Kartan toteutus
- `app/components/Etusivu.tsx` — koko kartan toteutus. Tärkeät kohdat:
  - `paikatKartalla` useMemo (rivit 310–318) — klusterointilogiikka lisätään tänne tai sen jälkeen
  - `AdvancedMarker`-renderöinti (rivit 393–420) — pinnin/minikortinn JSX, tähän in-place laajennus
  - `valittu`-bottom sheet JSX (rivit ~812–) — **poistetaan kokonaan**
  - `setValittu` kutsut — tarkistettava jäljelle jäävät käyttötapaukset

### Pinnin SVG-generaattori
- `lib/sportPins.ts` — `pinUrl(color, laji)` funktio. Muutetaan: kiinteä punainen väri, ikoni tummilla viivoilla.

### Lajikonfiguraatio
- `lib/lajit.ts` — `lajiKonfig` (värit, labelit), `LAJIT_FILTTERI`. Lajikohtaiset värit poistetaan pinnistä mutta säilyvät muualla (filtteripilleissä, badge-väreissä).

### Vaatimukset
- `.planning/REQUIREMENTS.md` §MAP-08, MAP-09, MAP-10

### Design System
- `CLAUDE.md` §Animation Principles — ei spring ilman drag, duration 0.18–0.35, AnimatePresence opacity-only view transitions.
- `CLAUDE.md` §Color System — `#111111` primary, `.glass` komponenttipinnat.
- `app/globals.css` — `.glass`, `.glass-btn` luokat.

### Kirjasto
- `@vis.gl/react-google-maps` — `AdvancedMarker`, `useMap`. Anchor-point-kontrolli AdvancedMarkerin `style`-propilla tai sisäisen div:n `transform`-offsetilla.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pinUrl(color, laji)` — muutetaan kiinteälle punaiselle, ei uutta funktiota tarvita.
- AnimatePresence `mode="wait"` pin↔minicard — sama rakenne toimii mini↔laajennettu kortille.
- `valittu`-tila — säilyy, mutta bottom sheet JSX poistetaan; tila ajaa nyt in-place korttia.
- `.glass rounded-2xl` — laajennetun kortin pinta, sama kuin DiagonaalKortti.

### Established Patterns
- `AdvancedMarker` sisältää animoidun div:n — lisätään kolmas tila: `expanded` (valittu?.id === p.id && zoom >= 16).
- `whileTap={{ scale: 0.95 }}` — napautuspalaute pinnillä/kortilla.
- `formatDistance`, `hintateksti`, `getOpenStatus` — käytetään laajennetussa kortissa.

### Integration Points
- Klusteri-logiikka: `paikatKartalla`-array groupataan koordinaattien mukaan ennen renderöintiä. Yksittäiset paikat renderöidään normaalisti; klusterit saavat oman AdvancedMarkerin.
- `setSearchOpen(false)` kutsutaan jo pin-klikissä — säilyy.
- Bottom sheet (`{valittu && ...}`) poistetaan. Tarkistetaan että `valittu`-tilan muut sivuvaikutukset (map centering via `setAutoZoomTarget`) säilyvät.

</code_context>

<specifics>
## Specific Ideas

- Punainen pin: perinteinen Google Maps -symboli. Käyttäjä sanoi "punainen, jonka keskellä valkoinen ympyrä — perinteinen pin symboli". Ei fancy, ei brändätty väri.
- Klusteri popup: "pieni popup pinnin yläpuolelle" — glass-pinta, lista venue-riveistä, sulkeutuu tap outsidella.
- In-place laajennus: mini-kortti (nimi + laji-badge, ~100×50 px) → kompakti kortti (~280×160 px) animaatiolla. Laajenee ylöspäin pinnistä.
- X-nappi kortissa sulkemiseen — eksplisiittinen, ei pelkkä tap outside.

</specifics>

<deferred>
## Deferred Ideas

- Klusterointi koko kartalle (kaikille pinneille zoom-tason perusteella) — REQUIREMENTS.md Out of Scope.
- Varausjärjestelmä — out of scope v1.3.

</deferred>

---

*Phase: 18-Kartan pinnit & korttianimaatio*
*Context gathered: 2026-05-29*
