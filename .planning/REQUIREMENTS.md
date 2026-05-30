# Requirements — v1.4 UX-parannukset & Profiili

## Overview

**Milestone:** v1.4 UX-parannukset & Profiili
**Goal:** Korjataan navigaation käyttäytyminen ja visuaaliset epäjohdonmukaisuudet; uudistetaan suosikit TO DO -listaksi; lisätään kiinnostuksen kohteet profiiliin AI-personointia varten.
**Phase range:** 19–22

---

## Requirements

### Navigaatio-korjaukset

- [ ] **NAV-01**: Käyttäjä palaa paikan profiilisivulta listaan entiseen scroll-sijaintiin "Takaisin"-nappia painamalla (ei etusivulle)
- [ ] **NAV-02**: "Näytä kartalla" avaa kartan ja kohdistaa paikan koordinaatteihin; GPS-recenter ei aktivoidu; bottomsheet pysyy kiinni
- [ ] **NAV-03**: Etusivu latautuu bottomsheet kiinni, joka aukeaa automaattisesti animoituna välittömästi
- [ ] **NAV-04**: Suosikit- ja Profiili-sivujen toolbarista on poistettu haku-painike (toolbar vastaa etusivua)
- [ ] **NAV-05**: TO DO -sivun "Takaisin"-nappi vie oikeaan kohteeseen (ei poistettuun /?nakyma=lista -sivulle)

### Filtteri & lista-UX

- [ ] **FILTER-01**: Hintasuodattimet on poistettu; tilalla on "Kertakäynti OK" -filtteri joka näyttää vain paikkoja joissa kertakäynti on mahdollinen
- [ ] **UI-19**: Listakortin oikea puoli näyttää paikka kuvan (image_url Supabasesta); jos image_url on tyhjä, näytetään placeholder (lajin väri tai harmaa)
- [ ] **UI-20**: Bottom sheetin mainos-kortit ovat pienempiä; AI-widgetillä on enemmän tilaa yläosassa
- [ ] **UI-21**: Listakorttiin on lisätty pin-ikoni-nappi joka sulkee listan, kohdistaa kartan paikan koordinaatteihin ja avaa paikan callout-kortin

### TO DO -lista

- [ ] **TODO-01**: Suosikit on uudelleennimetty TO DO -listaksi kaikissa käyttöliittymissä; sydän-ikoni on vaihdettu kirjanmerkki-ikoniin (bookmark) HeartButton-komponentissa ja kaikissa sivuilla
- [ ] **TODO-02**: /suosikit-sivu (tai /todo) näyttää kirjautuneen käyttäjän TO DO -paikat listana ja toimii käyttäjälle "haluan käydä täällä" -listana

### Profiili & AI-personointi

- [ ] **PROFILE-01**: Kirjautunut käyttäjä voi lisätä profiiliin kiinnostuksen kohteet monivalintana (lajit lib/lajit.ts:stä); valinnat tallentuvat Supabaseen
- [ ] **PROFILE-02**: AI-suositus huomioi käyttäjän kiinnostuksen kohteet suosituksessa (lisätään promptiin jos saatavilla)

### Data

- [ ] **DATA-08**: image_url-kenttä on lisätty paikat-tauluun Supabasessa; admin voi syöttää kuvan URL:n manuaalisesti

---

## Future Requirements (deferred)

- Suosikkipaikat-sivu kirjautuneelle käyttäjälle — siirretty TODO-02:ksi
- Kartta: etäisyyspohjainen suodatus — deferred
- Käyttäjäprofiili ja asetukset (laaja) — deferred

---

## Out of Scope (v1.4)

- Kuva-upload suoraan Supabase Storageen — image_url on manuaalinen kenttä
- Automaattinen kuva Google Places API:sta — manuaalinen URL riittää
- TO DO -listan jakaminen muille — ei sosiaalisia ominaisuuksia
- Kiinnostuskohteiden push-notifikaatiot — ei ilmoitusjärjestelmää
- Varausjärjestelmä — linkitetään palveluntarjoajan sivulle
- Reaaliaikainen paikkatieto — vaatii venue-API per paikka

---

## Traceability

| REQ-ID | Phase | Plan |
|--------|-------|------|
| NAV-01 | 20 | TBD |
| NAV-02 | 20 | TBD |
| NAV-03 | 20 | TBD |
| NAV-04 | 20 | TBD |
| NAV-05 | 20 | TBD |
| FILTER-01 | 19 | TBD |
| UI-19 | 19 | TBD |
| UI-20 | 19 | TBD |
| UI-21 | 19 | TBD |
| TODO-01 | 21 | TBD |
| TODO-02 | 21 | TBD |
| PROFILE-01 | 22 | TBD |
| PROFILE-02 | 22 | TBD |
| DATA-08 | 19 | TBD |
