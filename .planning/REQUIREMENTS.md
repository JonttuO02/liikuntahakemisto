# Requirements — Liikuntahakemisto v1.2

**Milestone:** v1.2 UI-uudistus & Arvostelut
**Status:** Active
**Total:** 9 requirements

---

## UI — Etusivu & haku

- [ ] **UI-09**: Käyttäjä voi avata hakukentän etusivun vasemman yläkulman painikkeesta ja etsiä liikuntapaikkoja hakusanalla; hakutulokset päivittyvät reaaliaikaisesti kirjoittaessa
- [ ] **UI-10**: Hakutulokset ja kaikki (filtterin mukainen) paikat näkyvät etusivulla scrollattavana korttilistana hakukentän alla — erillinen listanäkymäsivu (`LiikuntapaikatLista`) ja `/`-reitti `?nakyma=lista` poistetaan kokonaan; osoite ohjataan etusivulle
- [ ] **UI-11**: Etusivun hakukorttilista käyttää uutta diagonaalista korttimallia: vasen puoli sisältää paikan tiedot (nimi, laji, hinta, aukiolo, etäisyys), oikea puoli näyttää Google Static Maps -snapshоtin paikan sijainnista pin-ikonin kanssa — kartan zoom-kortit (MAP-06) pysyvät ennallaan

## REVIEW — Arvostelut

- [ ] **REVIEW-01**: Kirjautunut käyttäjä voi jättää enintään yhden arvostelun per paikka, joka sisältää tähtiarvosanan (1–5) ja vapaamuotoisen tekstin
- [ ] **REVIEW-02**: Arvostelija valitsee per arvostelu näkyykö oma nimi vai jääkö arvostelu anonyymiksi
- [ ] **REVIEW-03**: Arvostelu sisältää käyntipäivämäärän (date picker) ja ruuhka-arvion (hiljaista / sopivasti / ruuhkaista)
- [ ] **REVIEW-04**: Paikan profiilisivu näyttää kaikki kyseisen paikan arvostelut sekä tähtiarvosanojen keskiarvon

## AI — Personointi

- [ ] **AI-05**: Kirjautunut käyttäjä voi asettaa kotipaikkakuntansa profiiliin (vapaa tekstikenttä); AI-sääsuositus käyttää tätä tietoa ja kertoo onko käyttäjä kotona vai reissussa — vaikuttaa suositeltavan palvelun tyypiin

## AUTH — Profiili

- [ ] **AUTH-04**: Kirjautuneella käyttäjällä on profiilisivu (`/profiili`) jossa näkyy sähköpostiosoite ja voi asettaa kotipaikkakuntansa (vapaa tekstikenttä) — muutos tallentuu Supabaseen

---

## Future Requirements

- Suosikkipaikat-sivu kirjautuneelle käyttäjälle (/suosikit) — v1.3
- Kartta: etäisyyspohjainen suodatus — v1.3
- Laaja käyttäjäprofiili (kuva, bio, julkinen profiili) — v2.0
- Sosiaalinen verkosto: kaverit, seuraus, tarinat, yksityisviestit — v2.0

## Out of Scope (v1.2)

- Varausjärjestelmä — linkitetään palveluntarjoajan omaan sivuun
- Arvostelu ilman kirjautumista — vaatii tilin, ehkäisee väärinkäyttöä
- Interaktiivinen minikartta kortissa — Static Maps snapshot riittää, kevyempi
- Ruuhkadata automaattisesti (Google Places Busy) — manuaalinen käyttäjäarvio riittää
- Arvostelu vain "verifioiduille" käynneille — ei teknistä ratkaisua käynnin todentamiseen

---

## Traceability

| REQ-ID    | Phase   | Status  |
|-----------|---------|---------|
| UI-09     | TBD     | Pending |
| UI-10     | TBD     | Pending |
| UI-11     | TBD     | Pending |
| REVIEW-01 | TBD     | Pending |
| REVIEW-02 | TBD     | Pending |
| REVIEW-03 | TBD     | Pending |
| REVIEW-04 | TBD     | Pending |
| AI-05     | TBD     | Pending |
| AUTH-04   | TBD     | Pending |

---

*Last updated: 2026-05-27 — v1.2 requirements defined*
