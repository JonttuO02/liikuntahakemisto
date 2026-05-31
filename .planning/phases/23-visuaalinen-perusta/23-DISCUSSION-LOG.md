# Phase 23: Visuaalinen perusta - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-01
**Phase:** 23-visuaalinen-perusta
**Areas discussed:** Sininen liukuväri, Kiilto-animaation tyyli, Pin-renderöinti-arkkitehtuuri, Bottom sheet -logo uudistus

---

## Sininen liukuväri

| Option | Description | Selected |
|--------|-------------|----------|
| Indigo-perhe | Indigo 600/800 — yhteensä NavBarin värien kanssa | |
| Sportti-sininen | Kirkas azure/sky (#0284c7 → #0ea5e9 tai #1e40af → #3b82f6) — energinen, erottuu kartalla | ✓ |
| Ocean (AktiiviLogo-match) | Sama kuin AktiiviLogon Ocean-gradientti (#0077B6 → #00B4D8) | |
| Claude valitsee | Anna Clauden valita sporttisimman näköinen sininen | |

**User's choice:** Sportti-sininen
**Notes:** Kirkas, kartalla erottuva. Yläosa kirkas (#38bdf8), kärki tumma (#0284c7) — top-to-bottom gradient.

---

## Kiilto-animaation tyyli

| Option | Description | Selected |
|--------|-------------|----------|
| Pulsoiva rengas pinnin ympäri | Erillinen div pinnin ympärillä: scale 1→1.6, opacity 1→0. Selkeä huomiopiste kartalla. | |
| Pelkästään valittu pinni animoituu | Animaatio näkyy vain kun pinni on valittuna. | |
| Kaikki pinnit animoituvat jatkuvasti | Jokainen pinni pulsoijaa koko ajan kartalla. | |

**User's choice:** Muutettu suunnitelmaa — pulssi-animaatio hylätty liian häiritseväksi. Tilalle **pyörivä animaatio pinnin sinisellä ulkokehällä**.
**Notes:** Tarkennuksissa: kiillotettu piste kiertelee (subtiiimpi, ei huomiohakuinen). Kaikissa pinneissä jatkuvasti.

---

## Pin-renderöinti-arkkitehtuuri

| Option | Description | Selected |
|--------|-------------|----------|
| Inline HTML -elementit | Pinni rakennetaan div/span-elementeistä ja inline SVG:stä suoraan AdvancedMarkerin sisällä. CSS animaatio suoraan elementeille. Valmistaa Phase 24:n ikonoväritystä (currentColor). | ✓ |
| Säilytetään <img> + wrapper div | Pinni pysyy <img>-tagina, wrapper-diviin lisätään animoitu rotate-elementti. Pienempi muutos, mutta Phase 24 tarvitsee toisen refaktoroinnin. | |

**User's choice:** Inline HTML -elementit
**Notes:** Uusi SportPin.tsx komponentti. Klusteripinnit myös inline HTML — sama sininen teema + animaatio.

---

## Bottom sheet -logo uudistus (UI-23)

**Tilanne korjattu:** Käyttäjä täsmensi että bottom sheetissä on iso watermark-tyylinen logo (ei sama kuin sheet-ulokkeessa oleva AktiiviLogo). Muutetaan haaleasta watermark-tyylistä täysin näkyväksi, pienemmäksi logoksi.

| Option | Description | Selected |
|--------|-------------|----------|
| Koristekaaret myös värillisiksi | Arc + wave saa myös gradienttivärin kirjainten kanssa | |
| Tekstiefekti: kirjaimet animoituvat yksitellen | Staggered letter reveal: jokainen kirjain ilmestyy peräkkäin | |
| Uudet värit (new gradient set) | 5 sävyperhe vaihtuu — sporttisemmat värit | |

**User's choice:** Kaikki vaihtoehdot hylätty — uusi suunnitelma:
- Koristekaaret näkyvät aina mustina
- Kirjainten teksti on piilotettu oletuksena
- 5 sekunnin sykli: heijastus pyyhkäisee vasemmalta oikealle (sportti-sininen)
- Teksti häipyy takaisin näkymättömäksi paljastuksen jälkeen
- Logo pienennetty ~32px

**Notes:** Heijastuksen väri = pinnien sporttinen sininen (#38bdf8/#0284c7). Teknisesti samankaltainen kuin nykyinen AktiiviLogo.tsx sweep-clip mutta yksinkertaisempi: ei gradienttisykliä, vain automaattinen looppi.

---

## Claude's Discretion

- Kiertelevän pisteen tarkka CSS-toteutus (arc, pseudo-element, vai erillinen div)
- Kierrosajan tarkka arvo (3–5s — Claude valitsee visuaalisesti sopivimman)
- Animaation `animation-delay` yksittäisten pinnien välillä (satunnainen offset)
- SportPin-komponentin tarkka HTML-rakenne
- Logo-heijastuksen väri tarkalleen: kiinteä vai liukuväri

## Deferred Ideas

- Lajiikonien värillisyys (MAP-15) — Phase 24
- Callout-kortin suurentaminen (MAP-14) — Phase 24
- `@googlemaps/markerclusterer` aktivointi — Out of Scope koko v1.5:ssä
