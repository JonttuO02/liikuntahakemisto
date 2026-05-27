# Phase 12: Haku & korttilistaus etusivulle - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 12-haku-korttilistaus
**Areas discussed:** Hakupaneelin layout, Tyhjä hakutila, Bottom sheet yhteistoiminta, Vanhan reitin käsittely

---

## Hakupaneelin layout

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom sheetin sisällä | Hakukentästä napaessa bottom sheet avautuu täyteen korkeuteen ja sisältö vaihtuu korttilistaan | |
| Sivupaneeli vasemmalta | Hakupaneeli liukuu sisään vasemmalta omana layer-paneelinaan | |
| Koko näytön overlay | Hakupaneeli avautuu koko näytölle glass-tyylillä | ✓ |

**User's choice:** Koko näytön glass overlay — hakukenttä keskellä ylhäällä, lista sen alapuolella. Bottom sheet ja hakupaneeli eivät voi olla samaan aikaan auki; jos bottom sheet on auki se vetäytyy alas ensin.

**Notes:** Käyttäjä tarkensi: kortit ovat erillisiä PaikkaKortti-widgettejä scrollattavassa listassa, ei yksi iso widget.

| Option | Description | Selected |
|--------|-------------|----------|
| Haku-ikoni toggle (avaa/sulkee) | Sama ikoni toimii toggle-nappina | |
| Haku-ikoni avaa, X-nappi sulkee | Erillinen X-nappi paneelin sisällä | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Vasemman toolbarin sisällä | Search-ikoni lisätään nykyiseen glass-pilleriin SlidersHorizontal rinnalle | ✓ |
| Oma erillinen glass-nappi | Erillinen glass-btn irrallaan filter-pilleristä | |

| Option | Description | Selected |
|--------|-------------|----------|
| Filtterit näkyvät hakupaneelissa | Kaupunki + lajifiltterit hakukentän alla | ✓ |
| Pelkkä tekstihaku | Ei filttereitä paneelissa | |

---

## Tyhjä hakutila

| Option | Description | Selected |
|--------|-------------|----------|
| Kaikki paikat heti | Paneeli avautuu täydellä korttilistalla | ✓ |
| Placeholder kunnes kirjoittaa | Tyhjän kentän aikainen placeholder-tila | |

| Option | Description | Selected |
|--------|-------------|----------|
| Etäisyys näkyy jos GPS saatavilla | Sama logiikka kuin kartassa | ✓ |
| Ei etäisyyttä korttilistassa | Etäisyys vain kartassa | |

---

## Bottom sheet yhteistoiminta

| Option | Description | Selected |
|--------|-------------|----------|
| Slide up (from bottom) | Paneeli saapuu alhaalta ylös — sama kuin bottom sheet | |
| Fade in (opacity) | Paneeli ilmestyy opacity 0→1 ilman liikettä | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom sheet palaa auki sulkiessa | Hakupaneeli sulkeutuu → bottom sheet avautuu automaattisesti | |
| Pelkkä kartta sulkiessa | Hakupaneeli sulkeutuu → näkyy pelkkä kartta | ✓ |

---

## Vanhan reitin käsittely

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect next.config.ts:ssä | 301 permanent redirect /?nakyma=lista → / | ✓ |
| Pehmeä app/page.tsx:ssä | Ignoroi parametri, ei HTTP-redirectiä | |

| Option | Description | Selected |
|--------|-------------|----------|
| Poistetaan kokonaan | LiikuntapaikatLista deletoidaan, logiikka siirretään | ✓ |
| Jätetään olemaan (ei renderoidä) | Kuten Kartta.tsx — tiedosto jää mutta ei käytössä | |

---

## Claude's Discretion

- State shape: `useState<boolean>` vs sheetPhase extension — Claude valitsee siistimmän tavan koordinoida bottom sheet + search panel
- Z-index layering hakuoverlayn kohdalla
- Scroll container toteutus (korkeuslaskenta, overflow-y)
- Fade-animaation kesto/ease (ohjenuorana CLAUDE.md: `duration: 0.2`, opacity only)

## Deferred Ideas

- Diagonaalinen korttimalli hakupaneelissa — Phase 13 scope
- Etäisyyspohjainen lajittelu — v1.3
- Hakutulosten lajittelu (hinta, aukiolo) — v1.3
