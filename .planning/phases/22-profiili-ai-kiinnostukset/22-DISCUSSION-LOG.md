# Phase 22: Profiili & AI-kiinnostukset - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-31
**Phase:** 22-profiili-ai-kiinnostukset
**Areas discussed:** Kiinnostus-UI, Tallenna-nappi, AI-konteksti

---

## Kiinnostus-UI

### Pillien tyyli

| Option | Description | Selected |
|--------|-------------|----------|
| Sport-väriset pillit | Lajit.ts-värejä — sama visuaalinen kieli kuin lajibadgessa kortissa | |
| Neutraalit mustat pillit | Kaikki pillit black/white, glassmorphism-design systeemi, ei lajivärejä profiilisivulla | ✓ |
| Claude päättää tyylin | Kumpi sopii paremmin profiilisivun .glass-korttilaatikon sisään | |

**User's choice:** Neutraalit mustat pillit
**Notes:** Käyttäjä valitsi yhteneväisen design systeemin — ei lajivärejä profiilisivulla.

### Pillien sijainti

| Option | Description | Selected |
|--------|-------------|----------|
| Oma .glass-kortti alla | Erillinen .glass rounded-2xl -lohko kotikaupunki-kortin alapuolella, oma otsikko | ✓ |
| Saman kortin sisään | Pillit lisätään olemassa olevan kotikaupunki-kortin alle | |

**User's choice:** Oma .glass-kortti alla
**Notes:** Erillinen kortti pitää kotikaupunki- ja kiinnostus-osiot selkeinä.

---

## Tallenna-nappi

### Tallennustapa

| Option | Description | Selected |
|--------|-------------|----------|
| Yhteinen Tallenna-nappi | Kiinnostukset-kortin oma Tallenna, inline-palaute kuten kotikaupungilla | ✓ |
| Automaattinen tallennus | Pilli-klikkaus tallentaa välittömästi, ei nappia (optimistinen) | |

**User's choice:** Yhteinen Tallenna-nappi
**Notes:** Eksplisiittinen tallennus parempi profiilidatalle kuin automaattinen.

### Upsert-rakenne

| Option | Description | Selected |
|--------|-------------|----------|
| Erikseen, kumpikin kortti tallentaa omansa | handleSaveKotikaupunki + handleSaveKiinnostukset, eri profiles-upsertit | ✓ |
| Yksi yhteinen Tallenna | Yksi nappi tallentaa sekä kotikaupungin että kiinnostukset | |

**User's choice:** Erikseen
**Notes:** Selkeämpi jako — käyttäjä voi tallentaa kummankin erikseen ilman toisen ylikirjoittamista.

---

## AI-konteksti

### Promptin rakenne

| Option | Description | Selected |
|--------|-------------|----------|
| buildKiinnostuksetKonteksti-funktio | Sama pattern kuin buildReissuKonteksti — erillinen lib/-funktio | ✓ |
| Yhdistettynä suosikit-listaan | Kiinnostukset lisätään suosikit-tekstin jatkoksi | |

**User's choice:** buildKiinnostuksetKonteksti-funktio
**Notes:** Erillinen funktio on testattava ja johdonmukainen buildReissuKonteksti-pattern kanssa.

### Cache-avain

| Option | Description | Selected |
|--------|-------------|----------|
| Ei — sama päiväkohtainen cache | Muutos näkyy seuraavana päivänä, sama kuin kotikaupunki | ✓ |
| Kyllä — kiinnostusten määrä cache-avaimeen | Välitön AI-päivitys kiinnostuksia muuttaessa | |

**User's choice:** Ei — päiväkohtainen cache pysyy
**Notes:** Kiinnostukset ovat stabiilit valinnat joita ei muuteta päivittäin — päivävaihdos riittää.

---

## Claude's Discretion

- Pillien valittu/valitsematon tila (esim. `bg-[#111111] text-white` vs. `border` reunustettu)
- Pillien tarkka koko ja padding (noudata CLAUDE.md 4-size/2-weight-sääntöä)
- buildKiinnostuksetKonteksti-funktion tarkka suomenkielinen muotoilu

## Deferred Ideas

- Kiinnostuskohteiden push-notifikaatiot — ei ilmoitusjärjestelmää
- Kiinnostusten vahvempi ohjaus (suodattaa paikat kiinnostuksen mukaan) — eri phase
- Sport-väriset pillit profiilisivulla — käyttäjä valitsi neutraalin tyylin
