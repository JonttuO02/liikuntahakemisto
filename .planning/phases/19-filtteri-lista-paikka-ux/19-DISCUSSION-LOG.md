# Discussion Log — Phase 19: Filtteri, lista & paikka-UX

**Date:** 2026-05-30
**Duration:** ~1 session
**Areas discussed:** Kertakäynti-tunnistus, Pin-napin rakenne, AI-widget + Karuselli layout

---

## Area 1: Kertakäynti-filtteri

**Question:** Millä logiikalla paikka lasketaan "kertakäynti OK" -filtteriin?

| Option | Description |
|--------|-------------|
| `!isMembershipOnly(paikka)` ✓ | Olemassa oleva heuristiikka käänteisesti |
| `hinta_kuvaus includes 'kertakäynti'` | Eksplisiittinen tekstimatch |

**Selected:** `!isMembershipOnly(paikka)` — yksinkertaisin, käyttää olemassa olevaa logiikkaa

---

## Area 2: Pin-napin sijainti ja rakenne

**Question 1:** Missä pin-nappi sijaitsee DiagonaalKortissa?

**User answer (freeform):** "vasemmalle puolelle, alas"

**Question 2 (follow-up):** Onko nappi erillinen klikkialue?

**Selected:** Kyllä — oma `<button>` vasemman paneelin alaosassa, `stopPropagation`, muu vasen pinta pysyy `<Link>`-nä.

---

## Area 3: AI-widget + Karuselli layout

**Question:** Tarkoittaako "enemmän tilaa AI-widgetille" tekstin rivittymistä vai vain Karusellin pienentämistä?

| Option | Description |
|--------|-------------|
| AI-teksti kaksirivinen + Karuselli pienempi ✓ | Widget kasvaa, Karuselli kutistuu |
| Vain Karuselli pienempi | Yksinkertaisempi muutos |

**Selected:** AI-teksti kaksirivinen + Karuselli n. 30% lyhyemmiksi

---

## Claude's Discretion Items

- Karusellin tarkat pixel-arvot
- AI-widgetin flex-rakenne tarkemmin
- Pin-napin tarkka CSS-sijoitus

## Deferred Ideas

- Skeleton/blur-up kuvan latautumiselle
- Kuva-upload Supabase Storageen
