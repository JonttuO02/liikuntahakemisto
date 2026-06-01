# Phase 24: Callout-kortti & ikonit - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 24 uudistaa kartan callout-kortin (puhelinkuplamuotoinen popup AdvancedMarkerin päällä): kortti levennetään 130→160px, vasemmalle lisätään avatar-logopaikkamerkki (paikan nimen 1. kirjain + lajin väri taustana) tulevia yrityslogoja varten, ja oikealla teksti animoituu paikan nimen ↔ lajin ikonin + lajin nimen välillä (2s opacity fade). Listakortit (PaikkaKortti, DiagonaalKortti) ja pin-ikonit eivät muutu tässä vaiheessa.

</domain>

<decisions>
## Implementation Decisions

### Callout-kortin layout — MAP-14

- **D-01:** Callout-kortti levennetään **130px → 160px**. Sama puheenkallon clipPath säilyy — ResizeObserver laskee sen dynaamisesti jo nyt, leveyden muutos on triviaali (muuta vakio 130 → 160 clipPath-laskussa).
- **D-02:** Uusi kaksipalstainen rakenne: **vasen** = pyöreä avatar (paikan nimen 1. kirjain, taustana `lajiKonfig[laji].color`), **oikea** = animoitu tekstialue.
- **D-03:** Vasen avatar on **logopaikkamerkki** — ei muuta merkitystä kuin varaus tuleville yrityslogoille (image_url per paikka, kun se on saatavilla). Fallback pysyy tässä vaiheessa 1. kirjain.
- **D-04:** Oikea tekstialue vaihtaa sisältöä **opacity fade -animaatiolla** (AnimatePresence, `initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}`): tila A = paikan nimi (teksti), tila B = laji-ikoni + lajin nimi.

### Callout-animaatio — MAP-14

- **D-05:** Vaihtoväli on **2 sekuntia** (ripeä tahti). Toteutus: `useEffect` + `setInterval(2000)` tai `useInterval` hook. State: `boolean` joka toggleaa A/B.
- **D-06:** Animaatiokirjasto: **Framer Motion AnimatePresence** + `motion.div`. `key` prop toggleaa A/B niin että AnimatePresence tunnistaa muutoksen. Duration: 0.2s (opacity only — CLAUDE.md Emil Kowalski -periaate).
- **D-07:** Puheenkallon clipPath-muoto **säilyy ennallaan** — ResizeObserver päivittää sen automaattisesti kun kortti levenee.

### Callout-kortin laji-ikonit

- **D-08:** "laji+ikoni" -rotaationäkymässä käytetään **Lucide-react ikoneja** (sama sarja kuin PaikkaKortti ja DiagonaalKortti: `Zap` (padel), `Dumbbell` (kuntosali), `Leaf` (jooga), `Waves` (uinti), `Target` (tennis), `Building2` (liikuntahalli), `Activity` (liikunta/fallback)).
- **D-09:** Ikoni näkyy lajin nimen vasemmalla puolella (`flex items-center gap-1`). Koko: `w-3 h-3`. Väri: `lajiKonfig[laji].color` (tai valkoinen jos taustaväri on ikoni-elementillä).

### Pin-ikonit (MAP-15) — DEFERRED

- **D-10:** Pin-ikonien per-laji väritys **siirretään myöhempään** — päivitetään kun oikeat SVG-ikonit ovat valmiit. SportPin.tsx jää ennalleen (`color: '#1e3a8a'`). MAP-15 täytetään osittain callout-kortin ikonilla.

### Listakortit

- **D-11:** PaikkaKortti ja DiagonaalKortti **eivät saa muutoksia** — molemmat näyttävät jo värillisen laji-ikonin (valkoinen Lucide-ikoni `laji.color`-taustalla), mikä on riittävä.

### Claude's Discretion

- Avatar-elementin tarkka koko (esim. 32×32 tai 28×28 — sopii 160px leveyteen)
- Kirjaimen fonttikoko avatarissa (esim. `text-sm font-bold` tai `text-xs font-bold`)
- AnimatePresence `mode` prop (default tai `"wait"` — kumpi sopii paremmin tähän rotating-text käyttöön)
- Tarvitseeko hinta-rivi näkyä uudessa layoutissa (vai poistetaan kokonaan tilansäästön takia)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system & constraints
- `CLAUDE.md` — glassmorphism utilities, animaatioperiaatteet (Emil Kowalski), Tailwind v3, typography

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §MAP-14, MAP-15 — vaatimusten tarkka teksti
- `.planning/ROADMAP.md` §Phase 24 — success criteria (3 must be TRUE)

### Key files to modify
- `app/components/Etusivu.tsx` §CalloutCard (rivi 109–153) — nykyinen toteutus; uudistettava kokonaan tämän kontekstin mukaisesti

### Reference patterns (read before implementing)
- `app/components/DiagonaalKortti.tsx` §SPORT_ICONS — Lucide-ikonien laji→ikoni mapping; kopioi sama mapping CalloutCard:iin
- `app/components/PaikkaKortti.tsx` §SPORT_ICONS — sama mapping, toinen vahvistus
- `lib/lajit.ts` — `lajiKonfig[laji].color` avatarin taustaväri; `lajiKonfig[laji].label` lajin nimi

### Phase 23 output (do NOT regress)
- `app/components/SportPin.tsx` — Phase 23:ssa luotu; älä muuta `currentColor` -valmistelua (D-10 jäädyttää tähän)
- `app/globals.css` §pin-arc — Phase 23:ssa lisätty animaatio; älä muuta

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CalloutCard` (`Etusivu.tsx` rivi 109–153): nykyinen 130px puheenkupla; ResizeObserver clipPath-mekanismi säilyy, uudistettava sisältö
- `lajiKonfig[laji].color` (`lib/lajit.ts`): avatarin `backgroundColor` suoraan, ei tarvita uusia arvoja
- `SPORT_ICONS` dict (`DiagonaalKortti.tsx` / `PaikkaKortti.tsx`): kopioi callout-korttiin sellaisenaan

### Established Patterns
- `clipPath: path('...')` + `ResizeObserver` (`Etusivu.tsx` rivi 112–126): laskee puheenkallon dynamically; muuta vain leveysvakio 130 → 160 funktioparametrina
- Framer Motion `AnimatePresence` + `motion.div` + `key` prop: toggleaa A/B siten että AnimatePresence tunnistaa muutoksen ja ajaa exit/enter animaatiot
- `useInterval` tai `setInterval` in `useEffect`: 2s vaihto; muista cleanup `clearInterval` unmountissa

### Integration Points
- `Etusivu.tsx` rivi 619–623: `{nearestCardId === p.id && <CalloutCard p={p} />}` — wrapper pysyy, vain CalloutCard-komponentin sisältö muuttuu
- `Etusivu.tsx` rivi 510–516: `nearestCardId` -logiikka — älä muuta (STATE.md varoitus: ei saa regressoida layoutId→PaikkaSheet expand -animaatiota)

</code_context>

<specifics>
## Specific Ideas

- Avatar: pyöreä `w-8 h-8` (32px) tai `w-7 h-7` (28px) div, `border-radius: 9999px`, `backgroundColor: lajiKonfig[laji].color`, kirjain `p.nimi[0].toUpperCase()` centroinut `flex items-center justify-center`
- Animaatio: `const [showName, setShowName] = useState(true)` → `useEffect(() => { const id = setInterval(() => setShowName(v => !v), 2000); return () => clearInterval(id) }, [])` → `<AnimatePresence mode="wait"><motion.div key={showName ? 'name' : 'sport'} ...>`
- Callout-kortin clipPath-muutos: etsi `L 120,0` ja `L 130,` merkit, korvaa 130-viittaukset 160:llä laskufunktiossa

</specifics>

<deferred>
## Deferred Ideas

- **Pin-ikonien per-laji väritys (MAP-15 täydellinen toteutus)** — SportPin.tsx:n `currentColor` on valmis, mutta ikonien vaihto odottaa oikeita SVG-ikoneita; toteutetaan erillisessä pienessä patchissa
- **Yrityslogo callout-kortissa** — logopaikkamerkki luodaan tässä vaiheessa, mutta `image_url`-/`website_domain`-integraatio odottaa datan saatavuutta (Future Requirements §Logo-API)

</deferred>

---

*Phase: 24-callout-kortti-ikonit*
*Context gathered: 2026-06-01*
