# Requirements: Liikuntahakemisto v3.1

**Defined:** 2026-06-24
**Core Value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.

## v1 Requirements

Requirements for milestone v3.1 (UX/UI-korjaukset & business-parannukset). Each maps to roadmap phases.

### Admin & QA

- [ ] **ADMIN-06**: Juurisyy sille, miksi operaattori ei pääse `/admin`-sivulle, selvitetään ja korjataan
- [ ] **QA-01**: Admin-hyväksytyn paikan sijainti tallentuu oikein ja paikka näkyy kartalla oikeassa kohdassa käyttäjille (regressiotestattu)

### Hallintaoikeuspyynnöt (multi-user yritystilit)

- [ ] **ACCESS-01**: `companies`-taulu + `business_accounts.company_id`/`role` (owner/member); olemassaolevat tilit migratoidaan päähallitsijoiksi yhtenä transaktiona, varmuuskopio otettu ennen ajoa
- [ ] **ACCESS-02**: `business_paikka_links.UNIQUE(paikka_id)` löysennetty `UNIQUE(business_account_id, paikka_id)`:ksi; RLS-politiikat päivitetty `current_company_id()`-helpperifunktiolla
- [ ] **ACCESS-03**: Saman yrityksen työntekijä voi hakea hallintaoikeutta paikkaan, jota toinen yrityksen henkilö jo hallinnoi (hakee paikan nimellä/osoitteella)
- [ ] **ACCESS-04**: Paikan päähallitsija näkee odottavat hallintaoikeuspyynnöt `/business`-dashboardissa ja voi hyväksyä/hylätä; sub-managerit eivät voi hyväksyä toisten pyyntöjä
- [ ] **ACCESS-05**: Resend-sähköposti-ilmoitus päähallitsijalle pyynnön saapuessa, ja pyytäjälle päätöksestä (hylkäyssyy valinnainen)
- [ ] **ACCESS-06**: Pyytäjä näkee selkeän "odottaa hyväksyntää" -tilan; ei pääsyä paikan hallintaan ennen hyväksyntää (RLS-tasolla estetty)
- [ ] **ACCESS-07**: Päähallitsija voi poistaa sub-managerin hallintaoikeuden paikasta; päähallitsijaa itseään ei voi poistaa tämän virran kautta

### Business-dashboard visuaalinen uudistus

- [ ] **BIZPANEL-06**: `/business`-dashboardin paikkalista korvataan DiagonaalKortti-korteilla; status-pillit sijoitetaan kortin kuvan alakulmaan
- [ ] **BIZPANEL-07**: Hover (desktop) / tap (mobiili) paljastaa kortin oikealta piilotetun lisäosan pyöreillä ikonipainikkeilla (preview/edit/jatka) — ei tekstipainikkeita

### Preview & live-preview

- [ ] **PREV-04**: Business-paikkalistan preview-modaalin vanhentunut PaikkaKortti-näkymä poistetaan, korvataan CalloutCardilla
- [ ] **LIVEPREV-05**: Edit- ja onboarding-vaiheiden live-preview laajennetaan sisältämään venuepage (PaikkaSheet) CalloutCardin ja DiagonaalKortin lisäksi
- [ ] **PREV-05**: Kaikki preview-näkymät (business-dashboardin preview-modaali, edit/onboarding-livepreview) ovat puhtaasti visuaalisia — klikkaus ei laukaise navigointia tai toimintoja

### Venuepage-konsolidaatio

- [ ] **VENUEPAGE-01**: Erillinen paikkasivu (`app/paikat/[id]`) poistetaan kokonaan sovelluksesta
- [ ] **VENUEPAGE-02**: Poistettavan sivun ainutlaatuinen sisältö (jota ei vielä ole venuepagella) siirretään venuepagelle (PaikkaSheet) ennen poistoa
- [ ] **VENUEPAGE-03**: Kaikki sovelluksen sisäiset polut, jotka aiemmin avasivat erillisen paikkasivun, avaavat sen tilalla venuepagen (bottom sheet) samalla tavalla kuin CalloutCardin klikkaus
- [ ] **VENUEPAGE-04**: Suora osoite poistettuun reittiin palauttaa 404 (ei redirectiä)

### Onboarding-vaiheiden uudelleenjärjestys

- [ ] **ONBOARD-18**: PaikkaStep (vain nimi + siirry-painike) poistetaan kokonaan onboarding-virrasta
- [ ] **ONBOARD-19**: Onboardingin uusi step 1 kerää paikan nimen ja verkko-osoitteen yhdessä; verkko-osoitteen syöttö käynnistää AI-sivuanalyysin taustalla heti
- [ ] **ONBOARD-20**: Sijainti-step (kartta + osoitehaku-autocomplete) siirretään step 2:ksi
- [ ] **ONBOARD-21**: Jos verkko-osoite annettiin step 1:ssä, AI-analyysin tulokset näytetään tarkasteltavaksi omana stepinä sijainti-stepin jälkeen
- [ ] **ONBOARD-22**: Lopullinen Preview-step poistetaan kokonaan virrasta (live-preview on aina näkyvissä muutenkin)
- [ ] **ONBOARD-23**: Yhteystiedot-stepistä poistetaan verkko-osoite-kenttä (kerätty jo step 1:ssä)
- [ ] **ONBOARD-24**: Onboardingin etenemispalkin poistettu "PREVIEW"-vaihe korvataan "SUBMIT"-vaiheella, joka saavutetaan onboardingin lähetyksen yhteydessä

## v2 Requirements

Deferred — not in v3.1 scope.

### Hallintaoikeudet (laajennukset)

- **ACCESS-08**: Roolitasojen laajennus (owner/member-jaon lisäksi hienojakoisemmat oikeudet)
- **ACCESS-09**: Audit-loki hallintaoikeuspyyntöjen ja -muutosten historiasta
- **ACCESS-10**: Pyyntöjen vanheneminen/muistutusviestit pitkään odottaneille pyynnöille

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cross-company hallintaoikeuspyynnöt (toisen yrityksen paikkaan) | Käyttäjä rajasi: vain saman yrityksen sisäinen pyyntö |
| Domain-perusteinen automaattihyväksyntä (esim. @yritys.fi) | Anti-feature: suomalaiset pienyritykset käyttävät yleisesti gmail/outlook-osoitteita, domain-tunnistus olisi epäluotettava ja turvallisuusriski |
| In-app-ilmoitusbadge hallintaoikeuspyynnöistä | Sähköposti riittää tämän kokoluokan sovellukselle; lisätään vain jos tarve osoittautuu |
| Ketjuadmin (yksi tili, useita toimipisteitä eri omistajilla) | Erillinen, jo aiemmin (v3.0) tietoisesti Future-listalle siirretty laajempi ominaisuus — ei sekoiteta tämän milestonen multi-user-malliin |
| Erillisen paikkasivun URL:n redirect-uudelleenohjaus | Käyttäjä valitsi 404:n yksinkertaisimpana ratkaisuna jaettujen linkkien sijaan |

## Traceability

Filled during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ADMIN-06 | TBD | Pending |
| QA-01 | TBD | Pending |
| ACCESS-01 | TBD | Pending |
| ACCESS-02 | TBD | Pending |
| ACCESS-03 | TBD | Pending |
| ACCESS-04 | TBD | Pending |
| ACCESS-05 | TBD | Pending |
| ACCESS-06 | TBD | Pending |
| ACCESS-07 | TBD | Pending |
| BIZPANEL-06 | TBD | Pending |
| BIZPANEL-07 | TBD | Pending |
| PREV-04 | TBD | Pending |
| LIVEPREV-05 | TBD | Pending |
| PREV-05 | TBD | Pending |
| VENUEPAGE-01 | TBD | Pending |
| VENUEPAGE-02 | TBD | Pending |
| VENUEPAGE-03 | TBD | Pending |
| VENUEPAGE-04 | TBD | Pending |
| ONBOARD-18 | TBD | Pending |
| ONBOARD-19 | TBD | Pending |
| ONBOARD-20 | TBD | Pending |
| ONBOARD-21 | TBD | Pending |
| ONBOARD-22 | TBD | Pending |
| ONBOARD-23 | TBD | Pending |
| ONBOARD-24 | TBD | Pending |

**Coverage:**
- v1 requirements: 25 total
- Mapped to phases: 0 (filled by roadmapper)
- Unmapped: 25 ⚠️ (expected before roadmap creation)

---
*Requirements defined: 2026-06-24*
*Last updated: 2026-06-24 after milestone v3.1 requirements definition*
