# Phase 32: Yritysrekisteröinti & auth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-05
**Phase:** 32-yritysrekisterointi-auth
**Areas discussed:** Rekisteröintilomake, Kirjautumispolku, Redirect-logiikka, business_accounts-rivin luonti

---

## Rekisteröintilomake

### Sijainti

| Option | Description | Selected |
|--------|-------------|----------|
| /business/rekisteroidy (erillinen sivu) | Selkeä URL, helppo linkittää, ei modal-rajoituksia. Sopii kun lomakkeessa on useampi kenttä. | ✓ |
| Modal etusivulla tai NavBarissa | Sama modal-pohjainen UX kuin AuthModal — käyttäjä ei navigoi pois etusivulta. | |

**User's choice:** /business/rekisteroidy erillinen sivu
**Notes:** Yritysrekisteröinti vaatii yritysnimi-kentän joka tekee modalista hankalaa.

### Löydettävyys

| Option | Description | Selected |
|--------|-------------|----------|
| NavBar-linkki "Rekisteröi yrityksesi" | NavBariin lisätään linkki — näkyy kaikille tai vain kirjautumattomille. | |
| Vain suora URL, ei navigaatiossa | Sivu on olemassa mutta ei näy NavBarissa v1.7:ssä — linkitetään myöhemmin markkinointisivuun. | ✓ |

**User's choice:** Vain suora URL
**Notes:** NavBar-linkki lisätään kun markkinointisivu valmis.

### Google OAuth yrityksille

| Option | Description | Selected |
|--------|-------------|----------|
| Ei — vain sähköposti + salasana | Yritysrekisteröinti vaatii yritysnimi-kentän joka ei sovi Google OAuth -virtaan. | ✓ |
| Kyllä — Google OAuth myös yrityksille | Sama kuin AuthModal nyt. Vaatii post-OAuth-lisävaiheen yritysnimiä varten. | |

**User's choice:** Ei Google OAuth
**Notes:** Yksinkertaisempi toteutus, vähemmän reunatapauksia.

---

## Kirjautumispolku

### Kirjautumiskomponentti

| Option | Description | Selected |
|--------|-------------|----------|
| Sama AuthModal kuin tavalliset käyttäjät | Post-login logiikka tarkistaa onko käyttäjä yritys ja ohjaa /business-sivulle. | ✓ |
| Erillinen /business/kirjaudu-sivu | Yrityksille oma kirjautumissivu. Selkeämpi yritysbrändäys, mutta duplikaattikoodi. | |

**User's choice:** Sama AuthModal
**Notes:** Ei duplikaattikoodia — business-logiikka lisätään onSuccess-callbackiin.

### Ohjaus kirjautumisen jälkeen

| Option | Description | Selected |
|--------|-------------|----------|
| Ohjataan /business aina | router.push('/business') aina kun business-käyttäjä kirjautuu, riippumatta mistä AuthModal on auki. | ✓ |
| Ohjataan /business vain /business-reiteiltä | Kontekstiriippuvainen logiikka — monimutkaisempi. | |

**User's choice:** Aina ohjataan /business
**Notes:** Yhdenmukaisempi käyttäjäkokemus, ei poikkeuksia.

---

## Redirect-logiikka

### Tarkistuksen sijainti

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side AuthModal-callback | SELECT 1 FROM business_accounts WHERE user_id = uid post-login. Yksinkertainen, ei DB-kyselyjä middlewaressa. | ✓ |
| Middleware server-side | Tarkistaa jokaisen /business-reitin. Tehokas suojaus mutta lisää DB-kyselyn jokaiseen sivulataukseen. | |
| /business layout.tsx server redirect | app/business/layout.tsx tekee tarkistuksen. Sopii Phase 36:een mutta stub-vaiheen ylimitoitus. | |

**User's choice:** Client-side AuthModal-callback
**Notes:** Middleware-suojaus lisätään Phase 36:ssa kun /business-sivulla on oikeaa sisältöä.

### /business-sivun sisältö Phase 32:ssa

| Option | Description | Selected |
|--------|-------------|----------|
| Yksinkertainen stub-sivu | "Tervetuloa hallintapaneeliin — tulossa pian". Phase 36 korvaa. | ✓ |
| Kirjautuminen vaaditaan (redirect /business/rekisteroidy) | Middleware/layout-tarkistus. | |

**User's choice:** Stub-sivu
**Notes:** Yksinkertaisin toteutus, Phase 36 lisää oikean sisällön ja suojauksen.

---

## business_accounts-rivin luonti

### Luontimekanismi

| Option | Description | Selected |
|--------|-------------|----------|
| Server Action / API route signUp:n jälkeen | POST /api/business/register, supabaseAdmin.from('business_accounts').insert(). Service role ohittaa RLS. | ✓ |
| Tietokanta-trigger (Postgres AFTER INSERT) | Trigger auth.users-taulussa. Mutta triggerillä ei ole pääsyä yritysnimi-kenttään. | |

**User's choice:** API route
**Notes:** Selkeä virheenkäsittely, pääsy yritysnimi-kenttään, service role key.

### Virheenkäsittely (INSERT epäonnistuu)

| Option | Description | Selected |
|--------|-------------|----------|
| Näytetään virhe + poistetaan Auth-tili | supabaseAdmin.auth.admin.deleteUser(uid). Auth-tili ei jää orvoksi. | ✓ |
| Merkintä virhelokiin, käyttäjä ohjataan yrittämään uudelleen | Auth-tili jää olemaan, business_accounts-rivi puuttuu. | |

**User's choice:** Poistetaan Auth-tili epäonnistuessa
**Notes:** Siistimpi atominen tulos — käyttäjä voi yrittää uudelleen puhtaalta pöydältä.

---

## Claude's Discretion

Ei alueita joissa käyttäjä siirsi päätöksenteon Claudelle — kaikki neljä aluetta käsiteltiin eksplisiittisillä valinnoilla.

## Deferred Ideas

- Google OAuth yrityksille — post-OAuth yritysnimi-kenttä; siirretty tulevaisuuteen
- `/business`-reitin middleware-suojaus — tehdään Phase 36:ssa
- NavBar-linkki "Rekisteröi yrityksesi" — lisätään markkinointisivun yhteydessä
