# Requirements — Liikuntahakemisto v1.1

**Milestone:** v1.1 Käyttäjät, Kartta & Laatu
**Status:** Active
**Total:** 19 requirements

---

## LEGAL — Tietosuoja

- [ ] **LEGAL-01**: Käyttäjä voi lukea GDPR-tietosuojasivun `/tietosuoja`-osoitteesta ennen kirjautumista

## AUTH — Käyttäjätilit

- [ ] **AUTH-01**: Käyttäjä voi kirjautua sisään sähköpostilla/salasanalla tai Google-tilillä
- [ ] **AUTH-02**: Kirjautunut käyttäjä voi tallentaa ja poistaa suosikkipaikkoja, jotka pysyvät laitteiden välillä
- [ ] **AUTH-03**: AI-sääsuositus ottaa kirjautuneen käyttäjän suosikit huomioon personoidussa suosituksessa

## MAP — Kartta

- [ ] **MAP-04**: Käyttäjä voi palata karttanäkymässä napilla takaisin omaan sijaintiinsa
- [ ] **MAP-05**: Käyttäjän sijaintimerkissä näkyy GPS-tarkkuusrengas
- [ ] **MAP-06**: Kartta näyttää pin-ikonit normaalisti; kun zoomataan riittävän lähelle, jokainen pin muuttuu pieneksi info-kortiksi jossa näkyy kohteen nimi, laji ja hinta — zoom-taso valitaan niin että kortit mahtuvat kuvaan ilman päällekkäisyyttä
- [ ] **MAP-07**: "Näytä kartalla" -painike avaa sovelluksen oman karttanäkymän zoomattuna kyseisen kohteen kohdalle

## UI — Listakorttien käyttöliittymä

- [ ] **UI-05**: Listakortissa näytetään kertakäyntihinta jos saatavilla; muuten teksti "vain jäsenyys"
- [ ] **UI-06**: Hintatiedot näytetään kortin yläosassa; useampi hinta omilla riveillään
- [ ] **UI-07**: "Varaa aika" -painike poistetaan listakortista; profiilisivulla varauslinkin osoite näytetään tekstinä
- [ ] **UI-08**: Lajisuodatin on pudotusvalikko (yksivalinta) pillien sijaan

## AI — Widget

- [ ] **AI-04**: AI-widgetissä näkyy paikkakunnan nimi lämpötilan vieressä

## DATA — Kaupunkilaajennus

- [ ] **DATA-05**: Helsinki-alueen liikuntapaikat ovat tietokannassa (Google Places sync)
- [ ] **DATA-06**: Turku-alueen liikuntapaikat ovat tietokannassa (Google Places sync)
- [ ] **DATA-07**: Käyttäjä voi suodattaa liikuntapaikkoja kaupungin mukaan

## ADS — Mainonta

- [ ] **ADS-02**: Featured-merkityt paikat näyttävät "Sponsoroitu"-badgen listassa ja kartalla

## PWA

- [ ] **PWA-01**: Sovellus toimii perustasolla offline-tilassa (palvelun tiedot näkyvät ilman nettiä)
- [ ] **PWA-02**: Käyttäjä voi lisätä sovelluksen kotinäyttöön (Web App Manifest + install prompt)

---

## Future Requirements

- Suosikkipaikat-sivu kirjautuneelle käyttäjälle (v1.2)
- Kartta: etäisyyspohjainen suodatus (v1.2)
- Käyttäjäprofiili ja asetukset (v1.2)

## Out of Scope (v1.1)

- Klusterointi (cluster markers) — korvattu zoom-perusteisella pin→kortti-muutoksella
- Monivalinta-lajifiltteri — yksivalinta riittää
- Anonyymi Supabase-tili — suosikit vaativat oikean kirjautumisen
- Push-ilmoitukset — ei tarvetta v1.1:ssä
- Varausjärjestelmä — linkitetään palveluntarjoajan omaan sivuun
- Arvostelut ja käyttäjäkommentit — v2+
- Mobiiliappi (iOS/Android) — web-first ensin

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| LEGAL-01 | Phase 6 | Pending |
| ADS-02 | Phase 6 | Pending |
| AI-04 | Phase 6 | Pending |
| UI-05 | Phase 6 | Pending |
| UI-06 | Phase 6 | Pending |
| UI-07 | Phase 6 | Pending |
| UI-08 | Phase 6 | Pending |
| DATA-07 | Phase 6 | Pending |
| MAP-04 | Phase 7 | Pending |
| MAP-05 | Phase 8 | Pending |
| MAP-06 | Phase 8 | Pending |
| MAP-07 | Phase 8 | Pending |
| AUTH-01 | Phase 9 | Pending |
| AUTH-02 | Phase 9 | Pending |
| AUTH-03 | Phase 9 | Pending |
| DATA-05 | Phase 10 | Pending |
| DATA-06 | Phase 10 | Pending |
| PWA-01 | Phase 11 | Pending |
| PWA-02 | Phase 11 | Pending |

---

*Last updated: 2026-05-21 — v1.1 roadmap created (phases 6–11)*
