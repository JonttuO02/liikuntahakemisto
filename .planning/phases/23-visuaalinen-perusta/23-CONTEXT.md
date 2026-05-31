# Phase 23: Visuaalinen perusta - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 23 uudistaa karttapinnien visuaalin (sininen sporttinen liukuväri + kiillotettu kiertelyanimaatio, klusteripinnit samalla teemalla), vaihtaa sovelluksen fontin Inter:stä Outfit:iin, ja uudistaa bottom sheet -logon heijastusanimaatiolla. Kaikki pinnit siirretään inline HTML -elementeiksi AdvancedMarkerin sisällä.

</domain>

<decisions>
## Implementation Decisions

### Sininen liukuväri — MAP-11, MAP-13

- **D-01:** Pinnin väri vaihtuu punaisesta (#c0392b) **sporttiseen siniseen liukuväriin**: yläosa `#38bdf8` (sky-400), kärki `#0284c7` (sky-600) — top-to-bottom gradient. Ei indigo-palette, ei ocean-palette — erillinen sporttinen sininen.
- **D-02:** Valkoinen ympyrä (`<circle cx="14" cy="14" r="10" fill="white"/>`) säilyy pinnin sisällä.
- **D-03:** Klusteripinnit (MAP-13) käyttävät **samaa sinistä teemaa** kuin yksittäiset pinnit.

### Kiilto-animaatio — MAP-12

- **D-04:** Animaatio on **kiillotettu piste joka kiertelee pinnin ulkokehällä** — ei pulsoiva rengas, ei scale-pulssi. Hidas ja elegantti kierros (Claude valitsee sopivan kierrosajan ~3–5s).
- **D-05:** Animaatio on **kaikissa pinneissä jatkuvasti** — ei vain valitussa.
- **D-06:** Constraint (STATE.md:stä lukittu): transform/opacity ONLY — ei box-shadow, ei background, ei filter.

### Pin-renderöinti-arkkitehtuuri

- **D-07:** Pinnit siirretään `<img src={data-URL}>` -mallista **inline HTML -elementeiksi** AdvancedMarkerin sisällä.
- **D-08:** Luodaan **uusi `app/components/SportPin.tsx`** komponentti yksittäisille pinneille. Vastaanottaa `laji`-propin, renderöi inline HTML-rakenteen (pinni-runko + valkoinen ympyrä + sportti-ikoni + animoitu kiilto-elementti).
- **D-09:** **Klusteripinnit myös inline HTML** — sama sininen teema + kiertelyanimaatio. `lib/sportPins.ts` voidaan poistaa tai jättää tyhjäksi kun molemmat korvattu (researcher tarkistaa onko muita käyttäjiä).
- **D-10:** Sportti-ikonien SVG-polut siirretään `lib/sportPins.ts`:stä `SportPin.tsx`:ään (tai erilliseen konstant-tiedostoon). Phase 24 hyötyy: `currentColor` mahdollistaa ikonien värityksen CSS:llä.

### Fontti — UI-22

- **D-11:** Fontti vaihdetaan **Inter → Outfit** (`next/font/google`). `--font-sans` CSS-muuttuja säilyy — nolla downstream-muutosta muissa komponenteissa. `app/layout.tsx`: `import { Outfit, Playfair_Display }`, `const outfit = Outfit({ subsets: ['latin'], variable: '--font-sans' })`.
- **D-12:** `Playfair_Display` (`--font-serif`) säilyy — ei muutoksia font-serif-käyttöihin.

### Bottom sheet -logo uudistus — UI-23

- **D-13:** Logo **pienennetään** 56px → ~32px (korkeus).
- **D-14:** Koristekaaret (arc + wave) näkyvät **aina mustina** (#111111) — ei muutosta niiden väriin.
- **D-15:** Kirjainten teksti on **piilotettu oletuksena** (opacity 0 tai clip-rect width = 0).
- **D-16:** **5 sekunnin automaattinen looppi:** pyyhkäisy vasemmalta oikealle paljastaa kirjaimet (~0.6s) → kirjaimet näkyvissä (~1s) → häipyminen (~0.4s) → tauko (~3s) → toistuu.
- **D-17:** Tekstin väri = pinnien sporttinen sininen (`#38bdf8` → `#0284c7` gradient tai kiinteä `#0284c7`) — sama väriperhe kuin uudet pinnit.
- **D-18:** Heijastusanimaatio teknisesti samankaltainen kuin nykyinen sweep-clip AktiiviLogo.tsx:ssä — `clipPath` + `rectRef` animaatio. Uudistus: lähtökohtana tyhjä (ei nykyistä gradienttisykliä), vain yksi sininen väri, automaattinen looppi.

### Claude's Discretion

- SportPin-komponentin tarkka HTML-rakenne (pinni-runko: div + border-radius, vai SVG inline?)
- Kiertelevän pisteen tarkka CSS-toteutus (border arc, pseudo-element, vai erillinen div)
- Kierrosajan tarkka arvo (3–5s — Claude valitsee visuaalisesti sopivimman)
- Animaation `animation-delay` yksittäisten pinnien välillä (esim. satunnainen offset niin että eivät synkronoidu)
- Logo-heijastuksen väri tarkalleen: kiinteä `#0ea5e9` vai liukuväri `#38bdf8 → #0284c7`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system & constraints
- `CLAUDE.md` — glassmorphism utilities, color system, typography (4 sizes, 2 weights), animation principles (Emil Kowalski), Tailwind v3

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §MAP-11, MAP-12, MAP-13, UI-22, UI-23 — vaatimusten tarkka teksti
- `.planning/ROADMAP.md` §Phase 23 — success criteria (5 must be TRUE)

### Key files to modify
- `app/layout.tsx` — Inter → Outfit fonttimääritys (rivi 2, 7, 22)
- `lib/sportPins.ts` — nykyinen data-URL pin-toteutus; korvattava SportPin.tsx:llä
- `app/components/Etusivu.tsx` — AdvancedMarker-renderöinti (rivi ~578–690); `<img src={pinUrl(...)}` korvataan `<SportPin laji={p.laji} />`
- `app/components/AktiiviLogo.tsx` — nykyinen logo-sweep-animaatio; uudistettava (D-13–D-18)

### New files to create
- `app/components/SportPin.tsx` — inline HTML pin-komponentti (D-07, D-08)

### Reference patterns (read before implementing)
- `app/components/AktiiviLogo.tsx` — sweep-clip tekniikka (`clipPath` + `rectRef` + Framer Motion `animate`) — sovellettavissa logon heijastusanimaatioon (D-18)
- `app/globals.css` §pinBounce (rivi 74–81) — nykyinen pinni-CSS-animaatio; `.gmap-pin` luokka
- `lib/sportPins.ts` §SPORT_ICONS_SVG — sport-ikonien SVG-polut; siirretään SportPin.tsx:ään

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AktiiviLogo.tsx` sweep-clip mekanismi (`clipPath id="sweep-clip"` + `rectRef` + `animate(rect, { width: 1672 })`) — adaptoitavissa logon uuteen heijastus-loopin toteutukseen
- `SPORT_ICONS_SVG` dict (`lib/sportPins.ts`) — sport-ikonien SVG-polut siirretään sellaisinaan SportPin.tsx:ään
- `app/globals.css` `@keyframes pinBounce` — esimerkki CSS-animaation lisäyksestä globaaliin CSS:ään; kiertoanimaatiolle vastaava `@keyframes spinOrbit`

### Established Patterns
- AdvancedMarker-rakenne (`Etusivu.tsx` ~rivi 578): `<AdvancedMarker><div style={{position:'relative',width:0,height:0}}><AnimatePresence>...`— wrapper-div jo olemassa, SportPin istuu sen sisään luontevasti
- CSS `transform: rotate()` animaatio on hyväksytty (STATE.md: transform/opacity ONLY) — kiertelyanimaatiolle tämä on standardi ratkaisu
- `@vis.gl/react-google-maps` `AdvancedMarker` — HTML-sisältö suoraan children-propina, inline HTML toimii

### Integration Points
- `Etusivu.tsx` ~rivi 591: `<img src={pinUrl(p.laji)} ... className="gmap-pin" />` → `<SportPin laji={p.laji} />`
- `Etusivu.tsx` ~rivi 625: `<img src={clusterPinUrl(item.items.length)} .../>` → inline cluster HTML-elementti
- `app/layout.tsx` rivi 2, 7, 22: Inter-import + fonttivariabeli → Outfit-import
- `app/globals.css`: lisätään `@keyframes` kiertoanimaatiolle; `.gmap-pin` luokka voidaan poistaa tai päivittää

</code_context>

<specifics>
## Specific Ideas

- Sportti-sininen hex-arvot: `#38bdf8` (yläosa/kirkas, Tailwind sky-400) ja `#0284c7` (kärki/tumma, Tailwind sky-600)
- Logon heijastusanimaatio: sama vasemmalta-oikealle -pyyhkäisy kuin nykyinen AktiiviLogo, mutta yksinkertaisempi — vain yksi sininen väri, automaattinen `useInterval`/`useEffect` looppi ilman user-triggeröintiä
- Logo-koko: `style={{ height: 32, width: 'auto' }}` (nykyinen on 56)
- Kiertelevä kiiltopiste: todennäköisesti `position: absolute` div tai pseudo-element, `border-radius: 50%`, pieni koko (~4px × 4px), `transform: rotate()` animaatio äärimmäisellä `transform-origin` (pinnin ulkopuolelta)
- Phase 24 valmistelussa: SportPin.tsx:n ikonikontainerissa kannattaa käyttää `color` tai `stroke="currentColor"` jotta Phase 24 voi asettaa eri värit CSS:llä per laji

</specifics>

<deferred>
## Deferred Ideas

- Lajiikonien värillisyys (MAP-15) — Phase 24:n scope; SportPin.tsx:n `currentColor`-valmistelu mahdollistaa tämän
- Callout-kortin suurentaminen ja tietovaihto (MAP-14) — Phase 24
- `@googlemaps/markerclusterer` aktivointi — Out of Scope koko v1.5:ssä (STATE.md)

</deferred>

---

*Phase: 23-visuaalinen-perusta*
*Context gathered: 2026-06-01*
