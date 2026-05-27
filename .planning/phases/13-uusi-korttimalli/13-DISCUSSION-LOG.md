# Phase 13: Uusi korttimalli - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 13-uusi-korttimalli
**Areas discussed:** Diagonaali visuaalisesti, Uusi komponentti vs. variantti, Koordinaattipuuttuvuus, Kortin vuorovaikutus

---

## Diagonaali visuaalisesti

| Option | Description | Selected |
|--------|-------------|----------|
| Pystysuora jako, vino leikkaus | CSS clip-path -leikkaus | ✓ |
| Suora pystyviiva, rinnakkain | flex row ilman viistoa | |

**User's choice:** Pystysuora jako, vino leikkaus

---

| Option | Description | Selected |
|--------|-------------|----------|
| Tiedot-puoli suorakaide, kartta viistolla reunalla | Vain oikea puoli leikataan | |
| Molemmat viistoja, kohtaavat keskellä | Klassinen diagonal split card | ✓ |

**User's choice:** Molemmat viistoja, kohtaavat keskellä (klassinen diagonal split card -pattern)

---

| Option | Description | Selected |
|--------|-------------|----------|
| 60/40 — tiedot hallitsevat | Tiedot n. 60%, kartta 40% | ✓ |
| 50/50 — tasan | Tasan puoliksi | |

**User's choice:** 60/40 — tiedot hallitsevat

---

| Option | Description | Selected |
|--------|-------------|----------|
| Kiinteä korkeus (h-32 / 128px) | Kaikki kortit saman korkuisia | ✓ |
| Joustava, seuraa sisältöä | Kortti kasvaa tarpeen mukaan | |

**User's choice:** Kiinteä korkeus h-32 (128px)

---

## Uusi komponentti vs. variantti

| Option | Description | Selected |
|--------|-------------|----------|
| Uusi komponentti DiagonaalKortti.tsx | PaikkaKortti pysyy muuttumattomana | ✓ |
| PaikkaKortti variant-propilla | Yksi komponentti kahdelle layoutille | |

**User's choice:** Uusi komponentti DiagonaalKortti.tsx

---

| Option | Description | Selected |
|--------|-------------|----------|
| Duplikoidaan tarpeeksi, ei abstraktiota | Importataan suoraan samoista utilityista | ✓ |
| Jaettu hook usePaikkaData(paikka) | Yhteinen hook molemmille komponenteille | |

**User's choice:** Duplikoidaan tarpeeksi, ei abstraktiota

---

## Koordinaattipuuttuvuus

| Option | Description | Selected |
|--------|-------------|----------|
| Lajin värinen solid placeholder | lajiKonfig.color + laji-ikoni | ✓ |
| Harmaa placeholder | Neutraali harmainen alue | |
| Kortti ilman karttaosiota | Fallback PaikkaKortti-layoutiin | |

**User's choice:** Lajin värinen solid placeholder (lajiKonfig.color + laji-ikoni centered)

---

| Option | Description | Selected |
|--------|-------------|----------|
| 200x128, zoom 15 — lähikartta | Yksittäiset kadut selkeästi, scale=2 Retinalle | ✓ |
| 200x128, zoom 14 — kaupunginosa | Laajempi alue | |

**User's choice:** 200×128px, zoom 15, &scale=2

---

## Kortin vuorovaikutus

| Option | Description | Selected |
|--------|-------------|----------|
| Koko kortti on klikattava linkki | Koko pinta-ala Link-komponenttiin | ✓ |
| Erillinen 'Näytä tiedot' -nappi | Nykyinen PaikkaKortti-pattern | |

**User's choice:** Koko kortti klikattava Link

---

| Option | Description | Selected |
|--------|-------------|----------|
| Jätetään pois DiagonaalKortista | Suosikki pysyy vain PaikkaKortissa | ✓ |
| Lisätään myös DiagonaalKortille | HeartButton absolute-positioned | |

**User's choice:** HeartButton jätetään pois DiagonaalKortista

---

| Option | Description | Selected |
|--------|-------------|----------|
| scale(1.02) hover, scale(0.98) tap — CLAUDE.md-tyyli | whileHover scale + whileTap | ✓ |
| y-2 nosto hover — nykyinen PaikkaKortti-tyyli | whileHover y: -2 | |
| Claude päättää | Vapaa valinta CLAUDE.md:n mukaan | |

**User's choice:** scale(1.02) hover (duration 0.18 easeOut), scale(0.98) tap

---

## Claude's Discretion

- Static Maps URL:n tarkka muoto (marker color, marker size, map type)
- clip-path -arvojen tarkka geometria (polygon-koordinaatit viitolle)
- Vasemman puolen sisätäyte (p-3 vs p-4)
- Karttakuvan `alt`-teksti accessibility-mielessä

## Deferred Ideas

- Animoitu Static Maps -kuvan latautuminen (skeleton/blur-up) — v1.3
- DiagonaalKortti hakupaneelissa — Phase 12 käyttää PaikkaKorttia
- Suosikki-toiminto DiagonaalKortissa — ei Phase 13:n scope
