# REQUIREMENTS — Liikuntahakemisto v1.3

**Milestone:** v1.3 AKTIIVI — Redesign & Polish
**Status:** Active
**Last updated:** 2026-05-29

---

## Active Requirements

### Brändi

- [ ] **BRAND-01:** Sovelluksen brändinimi päivitetään AKTIIVIKSI — sivun otsikko (`<title>`), meta-tagit (`og:title`, `og:description`, `description`), `manifest.json` PWA-nimi ja lyhytnimi, sekä muut UI-pinnat joissa tuote mainitaan

### UI — Bottom Sheet Logo-uloke

- [ ] **UI-13:** Käyttäjä näkee pienen ulokkeen bottom sheetin yläreunassa kun sheet on kiinni; uloke on aina näkyvissä ja toimii avauspainikkeena
- [ ] **UI-14:** Ulokkeessa näkyy AKTIIVI-logo (SVG); kun bottom sheet on auki, logo näkyy sheetin yläreunassa osana headeria
- [ ] **UI-15:** Käyttäjä näkee logon tekstiosan vaihtuvan sporttiseen liukuvärianimaatioon joka kerta kun bottom sheet avataan (5 liukuväriä — esim. keltainen→punainen, sininen, pinkki, vihreä, violetti; kierrätys)
- [ ] **UI-16:** Kun bottom sheet suljetaan, logon väri pysyy viimeksi näytettynä — väri ei resetoidu sulkiessa

### UI — Toolbar & Haku

- [ ] **UI-17:** Käyttäjä löytää yhden napin, joka avaa sekä hakukentän että filtterit; haku- ja filtteritoiminto toimii sekä kartta- että listanäkymässä
- [ ] **UI-18:** Käyttäjä löytää erillisen napin lista-näkymän avaamiseen ja sulkemiseen — ei sama nappi kuin haku/filtteri

### Kartta — Pinnit

- [ ] **MAP-08:** Kartan kaikki pinnit käyttävät yhtenäistä väriä (ei lajikohtaista värikoodausta); laji erotetaan custom SVG -ikonilla pinnin sisällä
- [ ] **MAP-09:** Samassa osoitteessa olevat paikat näytetään klusterina kartalla; klusteria klikkaamalla käyttäjä näkee listan kaikista ko. osoitteen paikoista

### Kartta — Korttianimaatio

- [ ] **MAP-10:** Kun käyttäjä klikkaa pinniä tai pienkorttia, kortti laajenee animaatiolla in-place suuremmaksi kortiksi kartalla; kartta säilyttää paikan keskitettynä eikä erillistä korttia avata sivun alareunaan

---

## Future (deferred)

- Suosikkipaikat-sivu kirjautuneelle käyttäjälle (/suosikit) — deferred v1.1
- Kartta: etäisyyspohjainen suodatus — deferred v1.1
- Käyttäjäprofiili ja asetukset (laaja) — deferred v1.1

---

## Out of Scope

- Klusterointi koko kartalle (kaikille pinneille) — ratkaistaan vain sama-osoite-tapaus (MAP-09)
- Uudet kaupungit tai paikkakannat tässä milestonessa
- Varausjärjestelmä
- Push-ilmoitukset
- Mobiiliappi (iOS/Android)

---

## Traceability

| REQ-ID | Phase | Plan |
|--------|-------|------|
| BRAND-01 | Phase 16 | TBD |
| UI-13 | Phase 16 | TBD |
| UI-14 | Phase 16 | TBD |
| UI-15 | Phase 16 | TBD |
| UI-16 | Phase 16 | TBD |
| UI-17 | Phase 17 | TBD |
| UI-18 | Phase 17 | TBD |
| MAP-08 | Phase 18 | TBD |
| MAP-09 | Phase 18 | TBD |
| MAP-10 | Phase 18 | TBD |
