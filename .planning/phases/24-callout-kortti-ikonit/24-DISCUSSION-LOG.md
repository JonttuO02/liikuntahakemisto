# Phase 24: Callout-kortti & ikonit - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-01
**Phase:** 24-callout-kortti-ikonit
**Areas discussed:** Callout-animaatio, Callout-kortin ikoni, Pin-ikonin väritys, Listakortit

---

## Callout-animaatio

| Option | Description | Selected |
|--------|-------------|----------|
| Opacity fade | AnimatePresence + opacity 0→1, 0.2s | ✓ |
| Slide up/down | Liukuu ulos/sisään | |
| Claude päättää | — | |

**User's choice:** Opacity fade

| Option | Description | Selected |
|--------|-------------|----------|
| 2 sekuntia | Ripeä tahti | ✓ |
| 3 sekuntia | Rauhallinen | |
| 4 sekuntia | Hidas | |

**User's choice:** 2 sekuntia

| Option | Description | Selected |
|--------|-------------|----------|
| Badge vaihdetaan | Lajibadge ↔ nimipilli, nimi-rivi pysyy | |
| Koko sisältö vaihdetaan | Koko kortin tietosisältö vaihtuu | |
| Muu (freeform) | — | ✓ |

**User's choice (freeform):** "Vasemmalle paikka logolle, joka pysyy kokoajan paikallaan. Muu sisältö vaihtuu kokonaan paikan nimi ja laji(ikoni+teksti)"

**Tarkennus:** Vasemmalla pyöreä avatar (paikan 1. kirjain, lajin väri bg) — logopaikkamerkki tuleville yrityslogoille. Fallback: paikan nimen ensimmäinen kirjain. Oikealla teksti animoituu: paikan nimi ↔ laji-ikoni + lajin nimi.

| Option | Description | Selected |
|--------|-------------|----------|
| Sportti-ikoni vasemmalla | Lajin SVG-ikoni, kiinteä | |
| Paikan nimen ensimmäinen kirjain | Avatar-tyylinen fallback | ✓ |

**Notes:** Käyttäjä selvensi "paikka logo" = oikean yrityksen logon paikkamerkki. Nyt fallback 1. kirjain. Integraatio image_url-kenttään tai website_domain-kenttään jätetään tulevaan patchiin (Future Requirements §Logo-API).

---

## Callout-kortin ikoni

| Option | Description | Selected |
|--------|-------------|----------|
| Lucide-react | Sama sarja kuin PaikkaKortti (Zap, Dumbbell...) | ✓ |
| SportPin.tsx SVG-ikonit | Sama sarja kuin karttapinnit | |

**User's choice:** Lucide-react

| Option | Description | Selected |
|--------|-------------|----------|
| Sama puheenkallon clipPath | Vain leveys kasvaa | ✓ |
| Yksinkertaistetaan muoto | Rounded rect + nuoli-SVG | |

**User's choice:** Sama puheenkallon clipPath, vain leveys kasvaa (130 → 160px)

---

## Pin-ikonin väritys

| Option | Description | Selected |
|--------|-------------|----------|
| lajiKonfig[laji].color suoraan | currentColor jo valmiina | |
| Sama tumma väri kaikille | Ei per-sport värejä | |
| Ohitetaan toistaiseksi (freeform) | — | ✓ |

**User's choice (freeform):** "Ohitetaan ikonien uudistus toistaiseksi. Vaihdetaan ne myöhemmin kun minulla on käyttöön tulevat svg-ikonit valmiina"

**Notes:** MAP-15 täytetään callout-kortin ikonilla tässä vaiheessa. Pin-ikonien vaihto odottaa oikeita SVG-ikoneita — deferred.

---

## Listakortit (PaikkaKortti, DiagonaalKortti)

| Option | Description | Selected |
|--------|-------------|----------|
| Ei muutoksia — jo riittävän värikkäitä | Molemmat käyttävät laji.color badgella | ✓ |
| Päivitetään jotain | Freeform muutos | |

**User's choice:** Ei muutoksia

**Notes:** MAP-15:n "yhtenäinen harmaasävy" viittaa pin-ikoneihin, ei listakortiston badgeihin. PaikkaKortti ja DiagonaalKortti ovat jo riittävän värikkäitä.

---

## Claude's Discretion

- Avatar-elementin tarkka koko (32×32 tai 28×28)
- Kirjaimen fonttikoko avatarissa
- AnimatePresence `mode` prop valinta
- Tarvitseeko hinta-rivi säilyä uudessa layoutissa

## Deferred Ideas

- Pin-ikonien per-laji väritys — odottaa oikeita SVG-ikoneita (SportPin.tsx currentColor valmis)
- Yrityslogo callout-kortissa — logopaikkamerkki luodaan, mutta integraatio odottaa datan saatavuutta
