# Phase 46: Pre-vaihe UI & velhointegraatio - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-15
**Phase:** 46-Pre-vaihe UI & velhointegraatio
**Areas discussed:** Pre-vaihe sijoittuminen, Pollauksen UX, Esikatseluruutu sisältö, Step 6 brändirendering

---

## Pre-vaihe sijoittuminen

### Arkkitehtuurinen sijoittuminen

| Option | Description | Selected |
|--------|-------------|----------|
| Uusi komponentti onboarding/page.tsx:ssä (state: 'pre' \| 'wizard') | Siisti ero, ei uusia reittejä, WizardInner ei muutu | ✓ |
| Erillinen reitti /business/onboarding/analyse | Selkeä URL-ero, mutta lisää reittejä ja auth-guarding-tarvetta | |

**User's choice:** Uusi komponentti onboarding/page.tsx:ssä

---

### Brändidatan kuljetustapa

| Option | Description | Selected |
|--------|-------------|----------|
| React state ylhäältä alas | brandingData prop-drilling page.tsx → WizardInner → step-komponentit | ✓ |
| Luetaan suoraan Supabasesta kussakin stepissä | Ei prop drillingiä, mutta 4 erillistä DB-kyselykiertoa | |

**User's choice:** React state ylhäältä alas (Recommended)

---

### Olemassaolevan analyysin tarkistus

| Option | Description | Selected |
|--------|-------------|----------|
| Kyllä — ohita URL-syöttö, näytä suoraan esikatselu | Ehkäisee turhaa uudelleenanalysointia | ✓ |
| Ei — näytä aina URL-syöttönäkymä | Yksinkertaisempi, helpompi uudelleenanalyysi | |

**User's choice:** Kyllä — ohita URL-syöttönäkymä ja näytä suoraan esikatselu

---

### Ohita-toiminto

| Option | Description | Selected |
|--------|-------------|----------|
| Ohita-nappi siirtyy suoraan WizardInneriin step 1:een | brandingData = null, velhoaskelmat tyhjiä kuten ennenkin | ✓ |
| Ohita-nappi siirtyy velhoon step 3:een | Ohittaisi step 1 (StepPaikka, pakollinen) — ei järkevä | |

**User's choice:** Ohita-nappi siirtää step 1:een (Recommended)

---

## Pollauksen UX

### Latausnäkymä

| Option | Description | Selected |
|--------|-------------|----------|
| Yksinkertainen spinner + 'Analysoidaan sivustoasi...' | Nopea, riittävän informatiivinen | ✓ |
| Vaiheistettu edistymisteksti | Imartelevan näköinen, monimutkaisempi toteutus | |

**User's choice:** Yksinkertainen spinner (Recommended)

---

### Pollausväli

| Option | Description | Selected |
|--------|-------------|----------|
| 2 sekunnin välein, max 30 yritystä (60s timeout) | Sopiva tarkkuus, ei liiaksi kuormita | ✓ |
| 5 sekunnin välein | Vähemmän pyyntöjä, mutta pidempi odotusaika lyhyille analyyseille | |

**User's choice:** 2 sekunnin välein (Recommended)

---

### Virheenhoito (status = 'failed')

| Option | Description | Selected |
|--------|-------------|----------|
| Virheilmoitus + 'Yritä uudelleen' + 'Ohita' | Käyttäjä voi yrittää uudelleen tai ohittaa | ✓ |
| Virheilmoitus + vain 'Ohita' | Yksinkertaisempi, pakottaa manuaaliseen täyttöön | |

**User's choice:** Virheilmoitus + 'Yritä uudelleen' + 'Ohita' (Recommended)

---

### Timeout-käsittely (60s)

| Option | Description | Selected |
|--------|-------------|----------|
| Timeout-virhe + 'Yritä uudelleen' + 'Ohita' | Sama kuin 'failed' — yhtenäinen UX | ✓ |
| Jatka pollausta ilman aikarajaa | Käyttäjä voi jäädä jumiin | |

**User's choice:** Timeout-virhe (Recommended)

---

## Esikatseluruutu sisältö

### Näytettävä sisältö

| Option | Description | Selected |
|--------|-------------|----------|
| Logo + väripillerit + taulukko (hinnat + ajat) | Kompakti yhteenveto, ei toista step 6:ta | |
| Mini-korttipreview (CalloutCard-näköinen) | Visuaalisempi, toistaa step 6:n | |
| Täydet kortit: CalloutCard + DiagonaalKortti + venue-sivu (kuten step 6) | Sama taso kuin manuaalisesti tehtyjen komponenttien preview | ✓ |

**User's choice:** "Esikatselussa tulisi nähdä saadun datan pohjalta tehdyt valmiit calloutcard, diagonaalkortti ja venuen sivu. Kuten manuaalisesti tehtyjen komponenttien previewkin."

---

### Paikkainfo saatavuus

| Option | Description | Selected |
|--------|-------------|----------|
| Kyllä — paikka on jo linkitetty (business_paikka_links olemassa) | Mahdollistaa täyden korttipreviewin | ✓ |
| Ei välttämättä — pre-vaihe on ennen step 1:tä | Tarvitsisi placeholder-tekstiä paikalle | |

**User's choice:** Kyllä — paikka on jo linkitetty

---

### Preview-objektin rakentaminen

| Option | Description | Selected |
|--------|-------------|----------|
| Erillinen buildBrandingPreview(paikkaInfo, brandingData) | Ei sekoita olemassa olevaa buildDraftAsPaikka:a | ✓ |
| buildDraftAsPaikka + brändintiedot injektoituna | Yksi funktio, mutta lisää kompleksisuutta | |

**User's choice:** Erillinen buildBrandingPreview (Recommended)

---

### Eteneminen esikatselusta velhoon

| Option | Description | Selected |
|--------|-------------|----------|
| 'Jatka velhoon →' -nappi + 'Analysoi uudelleen' -linkki | Yksinkertainen, selkeä | ✓ |
| Kaksi nappia: 'Hyväksy ja jatka' + 'Muokkaa' | Monimutkaisempi flow | |

**User's choice:** 'Jatka velhoon' -nappi (Recommended)

---

## Step 6 brändirendering

### Brändivärin käyttö DiagonaalKortissa

| Option | Description | Selected |
|--------|-------------|----------|
| colors[0] aksenttina — DiagonaalKortin diagonal-split | Hienovarainen väriaksentti | |
| colors[0] koko vasemman osan taustaväriksi | Vahvempi brändinäkyvyys | ✓ |
| CSS custom properties (-\-brand-primary jne.) | Siisti arkkitehtuuri, laajempi refaktorointi | |

**User's choice:** "Väri tulee koko vasemman osan taustaväriksi"
**Notes:** colors[0] asetetaan vasemman panel-divin `backgroundColor`:ksi.

---

### Logon sijoittuminen

| Option | Description | Selected |
|--------|-------------|----------|
| Logo DiagonaalKortin olemassa olevaan logo-slottiin | Sama paikka kuin tälläkin hetkellä | ✓ |
| Logo image_url-kenttänä (korvaa paikkavalokuvan) | Yksinkertaisempi, mutta logo täyttäisi koko kuva-alueen | |

**User's choice:** "Logon paikka korteissa tulisi olla sama kuin tälläkin hetkellä"
**Notes:** DiagonaalKortti käyttää jo paikka.logo_url — brändidatan logo_url menee suoraan tähän kenttään preview-objektissa.

---

### Tekstikontrasti

| Option | Description | Selected |
|--------|-------------|----------|
| Forced white text kun brändiväri käytössä | Yksinkertainen, ei laskentaa | |
| Laskennallinen kontrasti (getContrastColor / YIQ) | Parempi saavutettavuus | ✓ |

**User's choice:** Laskennallinen kontrasti (getContrastColor)

---

## Claude's Discretion

- Animaatiot pre-vaiheen siirtymissä (pre → wizard): käytetään olemassa olevaa AnimatePresence-mallia.
- CalloutCard brändivärituki: matala prioriteetti — jos toteutus on triviaali, voidaan lisätä, muuten jätetään fallbackiin.
- Polling cleanup (`clearInterval`) toteutus: standardimuoto React useEffect cleanup.

## Deferred Ideas

- Analyysin uudelleenajo onboarding-jälkeen (edit-flow) — post-v2.1.
- Tulosten manuaalinen muokkaus esikatselussa (värien/logon korjaus) — käyttäjä muokkaa step 3–5:ssä.
