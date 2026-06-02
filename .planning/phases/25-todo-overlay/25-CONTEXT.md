# Phase 25: TO DO overlay - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 25 muuttaa TO DO -listan navigaatiosta (`href="/suosikit"`) Etusivun päälle avautuvaksi overlayksi. Uusi kiinteä Bookmark-nappi oikeassa reunassa (nav-pillin alapuolella) avaa/sulkee overlaysin. `/suosikit`-reitti säilyy teknisenä paluuosoitteena authin jälkeen. Overlay näyttää DiagonaalKortti-korteilla käyttäjän TO DO -paikat. Paikan poiston yhteydessä inline-komponentti tarjoaa arvostelulomakkeen kirjautuneille.

</domain>

<decisions>
## Implementation Decisions

### Napin sijainti & muoto — TODO-04

- **D-01:** TO DO -nappi on **kiinteä, itsenäinen nappi oikeassa reunassa**, nav-pillin avaavan (MoreHorizontal) napin **alapuolella**. Ei osana nav-pillin expanded-menua.
- **D-02:** Nappi näyttää **vain ikonin** — ei tekstiä, ei numero-badgea. Suljettu: `Bookmark`-ikoni. Auki: `X`-ikoni. Sama `glass rounded-full` tyyli kuin muu toolbar.

### Overlay-visuaalisuus — TODO-03, TODO-06

- **D-03:** Overlay on **osittainen, liukuu oikealta** — noin 80% näytön leveydestä, korkeus koko ruutu toolbarin alapuolelta alas. Kartta jää vasemmalle näkyviin.
- **D-04:** Sisältö näytetään **DiagonaalKortti-komponenteilla** (sama kuin `/suosikit`-sivulla). Overlayssa on oma otsikko ("TO DO") joka erottaa sen visuaalisesti hakulistasta (TODO-06).
- **D-05:** **Ei backdroppia** — kartta näkyy vasemmalla häiritsemättä. Ei tummennus- tai blur-efektejä.

### Animaatio — TODO-05

- **D-06:** Overlay avautuu **scale-efektillä napista** — `transform-origin` nappin kohdalla (oikeassa yläkulmassa), skaalautuu `scale(0) → scale(1)`. Sulkeutuu `scale(1) → scale(0)`. Emil Kowalski: `duration: 0.2`, ease `[0.25, 0.1, 0.25, 1]`.
- **D-07:** DiagonaalKortti-kortit **staggeroituvat sisään** overlaysin avauduttua — `opacity+y` stagger, `staggerChildren: 0.06` (≤ 0.08s raja). `initial: { opacity: 0, y: 14 }` → `animate: { opacity: 1, y: 0 }`.

### Poistoarvosteluvaade — TODO-07

- **D-08:** Kun käyttäjä poistaa paikan, kortin tilalle tulee **inline-komponentti** saman tilan sisällä: "Kävikö paikassa? [Kyllä] [Ei]". Ei erillistä modalia, ei navigaatiota.
- **D-09:** "Kyllä" → **ReviewForm laajenee samaan inline-tilaan** overlaysin sisällä. Käyttäjä voi jättää arvostelun poistumatta overlaystä.
- **D-10:** Arvosteluvaade näytetään **vain kirjautuneille** (`supabaseUser !== null`). Kirjautumattomalle poisto tapahtuu normaalisti ilman prompta (TO DO ei vaadi kirjautumista localStatessa — tarkista flow).

### Claude's Discretion

- Overlaysin tarkka leveys (esim. `calc(100vw - 60px)` tai `80vw`)
- Overlaysin `border-radius` vasen puoli (esim. `rounded-l-2xl`)
- Inline "Kävikö"-komponentin tarkka tyyli (glass-kortti vai yksinkertainen rivi)
- Jos TO DO -lista on tyhjä: tyhjätila-viesti overlayssa ("Lista on tyhjä — lisää paikkoja kirjanmerkkipainikkeella")
- ReviewForm-integraation tarkkuus (voidaan käyttää olemassa olevaa tai luoda yksinkertaisempi inline-versio)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system & animaatiot
- `CLAUDE.md` — glassmorphism utilities, Emil Kowalski -animaatioperiatteet, typography (2 weights only), Tailwind v3

### Requirements
- `.planning/REQUIREMENTS.md` §TODO-03–TODO-07 — vaatimusten tarkka teksti
- `.planning/ROADMAP.md` §Phase 25 — success criteria (5 must be TRUE)

### Muutettavat tiedostot
- `app/components/Etusivu.tsx` — blast-radius-tiedosto; uusi nappi + overlay toteutetaan tänne
- `app/suosikit/SuosikitClient.tsx` — referenssi miten TO DO -paikat ladataan (älä muuta)
- `app/suosikit/page.tsx` — `/suosikit`-reitti säilyy koskemattomana

### Reusable-komponentit (lue ennen toteutusta)
- `app/components/DiagonaalKortti.tsx` — käytetään overlayssa sellaisenaan
- `app/components/ReviewForm.tsx` (tai vastaava) — inline-arvostelulomake D-09:ssä
- `app/components/AuthModal.tsx` — ei käytetä D-10:n mukaan (vain kirjautuneet näkevät promptin)

### State joka on jo Etusivu.tsx:ssä
- `todoIds: Set<number>` — TO DO -paikkojen ID:t, ladataan Supabasesta kirjautumisen yhteydessä
- `paikat: Liikuntapaikka[]` — kaikki paikat; todo-paikat = `paikat.filter(p => todoIds.has(p.id))`
- `toggleTodo(id)` — olemassa oleva funktio poistoon/lisäykseen
- `supabaseUser` — kirjautumistieto D-10:tä varten

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DiagonaalKortti` (`app/components/DiagonaalKortti.tsx`): valmis korttimalli — käytetään overlayssa sellaisenaan
- `todoIds` + `toggleTodo` (`Etusivu.tsx`): todo-state ja poistologiikka jo olemassa
- `paikat` prop (`Etusivu.tsx`): kaikki paikat saatavilla — ei tarvita erillistä Supabase-hakua overlayssa
- `diagonaalKorttiVariants` (`DiagonaalKortti.tsx`): valmiit Framer Motion -variantit staggeria varten

### Established Patterns
- Kiinteä toolbar-nappi: katso oikean nav-pillin rakenne `Etusivu.tsx` rivi ~880 — sama `fixed`, `zIndex: 64`, `glass rounded-full` tyyli
- `AnimatePresence` + `motion.div` exit/enter: sama pattern kuin callout-kortti, overlay-paneeli, PaikkaSheet
- Framer Motion scale-efekti: `initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}` + `transformOrigin`

### Integration Points
- Uusi TO DO -nappi: `fixed`, `right: 16`, `top: max(60px, ...)` (nav-pillin alapuolelle — tarkka Y-koordinaatti riippuu nav-pillin korkeudesta ~40px + gap)
- `href="/suosikit"` nav-pillissä (rivi ~912): **muutetaan** `onClick` joka avaa overlaysin navigaation sijaan
- `/suosikit`-reitti (`app/suosikit/page.tsx`): **ei muuteta** — säilyy auth-paluuta varten
- Overlay `zIndex`: tulee olla kartan (50) ja toolbarin (64) välissä tai yli — ehdotus: `zIndex: 62`

</code_context>

<specifics>
## Specific Ideas

- TO DO -nappi sijaitsee `top: max(60px, env(safe-area-inset-top) + 48px)` — nav-pillin (40px korkea, 12px top) alapuolella pienellä gapilla
- Overlay `transform-origin: top right` — scale-efekti lähtee oikeasta yläkulmasta kohti nappia
- DiagonaalKortti overlayssa: mahdollisesti tarvitsee leveysrajoitteen (`max-w` overlaysin sisällä) koska overlay on kapea
- "Kävikö?"-inline: yksinkertainen `glass rounded-xl p-3` div, sama korkeus kuin DiagonaalKortti, fade-in animaatiolla

</specifics>

<deferred>
## Deferred Ideas

- **Badge TO DO -napissa** (kohdemäärä) — käyttäjä hylkäsi, voidaan harkita v1.6:ssa
- **AuthModal avautuu kirjautumattomalle "Kyllä"-vastauksesta** — hylätty tässä vaiheessa (D-10)
- **Backdrop/blur kartan päälle** — hylätty, mahdollinen visuaalinen parannus myöhemmin

</deferred>

---

*Phase: 25-todo-overlay*
*Context gathered: 2026-06-02*
