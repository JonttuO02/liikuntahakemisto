# Phase 13: Uusi korttimalli - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 13 korvaa etusivun hakukorttilistan kortit uudella `DiagonaalKortti`-komponentilla — klassinen diagonal split card jossa vasen puoli (60%) näyttää paikan tiedot ja oikea puoli (40%) näyttää Google Static Maps -kuvakaappauksen paikan sijainnista. Phase 12:n hakupaneelissa käytetty `PaikkaKortti` pysyy muuttumattomana. MAP-06-ominaisuuden zoom-kortit eivät muutu.

</domain>

<decisions>
## Implementation Decisions

### Diagonaalinen layout
- **D-01:** Diagonal split card toteutetaan **CSS clip-path -leikkauksella** — molemmat puolet viistoja, kohtaavat keskellä (klassinen diagonal split card -pattern). Vasen tiedot-osio saa viiston oikean reunan, oikea karttakuva-osio täyttää jäljelle jäävän tilan samalla clip-path-logiikalla.
- **D-02:** Jako **60/40** — tiedot-puoli n. 60% kortin leveydestä, karttakuva-puoli 40%.
- **D-03:** Kortin korkeus on **kiinteä h-32 (128px)**. Kaikki kortit saman korkuisia — tasainen lista-ilme. Pitkä sisältö (nimi) leikkaantuu ellipsisillä.

### Komponenttirakenne
- **D-04:** Luodaan **uusi komponentti `app/components/DiagonaalKortti.tsx`**. `PaikkaKortti.tsx` pysyy muuttumattomana ja sitä käytetään edelleen Phase 12:n hakupaneelissa.
- **D-05:** Yhteinen logiikka (lajiKonfig, hintateksti, getOpenStatus, isMembershipOnly) **importataan suoraan samoista utilityista** — ei jaettua hookia tai wrapperia. Kolme samanlaista riviä on parempi kuin ennenaikainen abstraktio.

### Koordinaattipuuttuvuus (fallback)
- **D-06:** Jos paikalla ei ole lat/lng-koordinaatteja, oikea puoli täytetään **lajin värillä (lajiKonfig.color)** solid-taustavärinä + laji-ikonilla (LucideIcon) keskitettynä. Ei broken image -tilaa.
- **D-07:** Static Maps -kuva: **200×128px, zoom 15**, `&scale=2` Retina-näytöille (actual request 400×256). Käytetään `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`:tä. Renderöidään client-puolella `<img>` -tagilla.

### Kortin vuorovaikutus
- **D-08:** **Koko kortti on klikattava `<Link href={/paikat/${paikka.id}}>`** — ei erillistä "Näytä tiedot" -nappia. Koko pinta-ala toimii navigointilinkkeinä.
- **D-09:** **HeartButton/suosikki-toiminto jätetään pois DiagonaalKortista.** Suosikki-toiminto pysyy vain PaikkaKortissa (Phase 12:n hakupaneeli).
- **D-10:** Animaatiot: **`whileHover={{ scale: 1.02, transition: { duration: 0.18, ease: 'easeOut' } }}`** ja **`whileTap={{ scale: 0.98 }}`**. CLAUDE.md-tyyli, ei y-liikettä.

### Claude's Discretion
- Static Maps URL:n tarkka muoto (marker color, marker size, map type — roadmap tai terrain)
- clip-path -arvojen tarkka geometria (esim. `polygon(0 0, 58% 0, 63% 100%, 0 100%)` vasemmalle)
- Vasemman puolen sisätäyte (p-3 vs p-4)
- Karttakuvan `alt`-teksti accessibility-mielessä

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system & constraints
- `CLAUDE.md` — glassmorphism utilities (`.glass`, `.glass-hover`), animation principles (Emil Kowalski style, scale not y-lift, duration 0.18), color system, Finnish UI vocabulary, Tailwind v3

### Requirements
- `.planning/REQUIREMENTS.md` §UI-11 — vaatimuksen tarkka teksti: diagonal split card, vasen=tiedot, oikea=Static Maps snapshot, MAP-06 pysyy ennallaan
- `.planning/ROADMAP.md` §Phase 13 — success criteria (3 mustaa kriteeriä)

### Key files (read before implementing)
- `app/components/PaikkaKortti.tsx` — referenssimalli: logi, importit (lajiKonfig, hintateksti, getOpenStatus, isMembershipOnly), korttiVariants, animaatiotyyli — kopioi rakenne, älä korvaa
- `lib/lajit.ts` — lajiKonfig.color käytetään sekä sport pill:ssä että koordinaattipuuttuvuus-placeholderissa (oikea puoli ilman lat/lng)
- `lib/aukiolo.ts` — getOpenStatus: single source of truth aukioloajalle
- `app/components/Etusivu.tsx` — integraatiopiste: korttilistaan vaihdetaan DiagonaalKortti

### External API
- Google Static Maps API — `https://maps.googleapis.com/maps/api/staticmap?center={lat},{lng}&zoom=15&size=200x128&scale=2&markers=color:red|{lat},{lng}&key=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}` — renderöidään `<img>` -tagilla, ei server-side proxya

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PaikkaKortti.tsx` exports `korttiVariants` (hidden/show stagger animation) — DiagonaalKortti voi exportata omat varianttinsa samalla rakenteella
- `lib/lajit.ts` `lajiKonfig[paikka.laji]` — palauttaa `{ label, color, badgeTw, accentBg }` — `.color` käytetään sport pill:ssä ja fallback-placeholderissa
- `lib/aukiolo.ts` `getOpenStatus(paikka.aukioloajat)` — palauttaa `{ status: 'open' | 'closed' | 'no-data', hours?: string }`
- `lib/priceUtils.ts` `isMembershipOnly(paikka)` — määrittää näytetäänkö "vain jäsenyys"
- `lib/utils.ts` `hintateksti(hinta_min, hinta_max)` — muodostaa hintatekstin, `cn(...)` — Tailwind class merge

### Established Patterns
- `motion.div` + `variants={korttiVariants}` stagger-animaatiolla — sama rakenne kuin PaikkaKortti
- `.glass .glass-hover rounded-2xl overflow-hidden` — glassmorphism pinta DiagonaalKortille
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — env var client-puolella, HTTP referrer restrictions OK `<img>` -tagissa

### Integration Points
- `app/components/Etusivu.tsx` hakukorttilista (Phase 12 toteutti) — tänne vaihdetaan `PaikkaKortti` → `DiagonaalKortti`; `paikat`-prop sama tyyppi `Liikuntapaikka[]`
- MAP-06 zoom-kortit: erillinen komponentti etusivulla — ei kosketa tässä vaiheessa

</code_context>

<specifics>
## Specific Ideas

- Diagonal split = CSS clip-path molemmilla puolilla: vasen tiedot-osio viisto oikealta, oikea karttakuva-osio täyttää jäljelle jäävän. Klassinen pattern (ei erikoinen, mutta siisti).
- Static Maps `&scale=2` Retina-näytöille — näkyy tarkempana mobiilissa
- Fallback (ei koordinaatteja): oikea puoli = `background-color: lajiKonfig.color`, laji-ikoni (`LucideIcon`) centered valkoisella värillä — sama ikoni kuin sport pill:ssä
- Korkeus h-32 = 128px. Vasemmalla p-3 sisätäyte. Nimi `line-clamp-1`, muut tiedot yhdellä rivillä

</specifics>

<deferred>
## Deferred Ideas

- Animoitu Static Maps -kuvan latautuminen (skeleton/blur-up) — mahdollinen v1.3-optimointi
- DiagonaalKortti hakupaneelissa (Phase 12:n overlay) — deferred; Phase 12 käyttää PaikkaKorttia
- Suosikki-toiminto DiagonaalKortissa — deferred; ei ole Phase 13:n scope

</deferred>

---

*Phase: 13-uusi-korttimalli*
*Context gathered: 2026-05-27*
